/** Mic-driven audio analysis for the venue visualizer. Browser-only (Web Audio API). */

import type { AudioLevels } from "@/app/visuals/scenes";
import {
  AdaptiveNormalizer,
  AUDIO_REACTIVE,
  EnvelopeFollower,
  OnsetDetector,
  bandAverages,
  computeBands,
  spectralCentroid,
} from "@/domain/audio-reactive";

/** A stalled tab can hand us a huge gap; cap dt so the envelopes glide, never lurch. */
const MAX_DT_SECONDS = 0.1;
const DEFAULT_DT_SECONDS = 1 / 60;

/**
 * Wraps the mic -> AnalyserNode graph and turns each frame into smoothed
 * {@link AudioLevels}. All the smoothing and beat detection lives in the pure,
 * frame-rate-independent DSP in `@/domain/audio-reactive`; this class only owns
 * the live Web Audio plumbing and the per-frame `dt`. It is the single source of
 * the levels the scenes read, so the stage no longer smooths anything itself.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private freq = new Uint8Array(0);
  private lastMs = 0;

  // One asymmetric smoother per band: a fast attack snaps to a hit (responsive)
  // and a slow release eases back down, so the bands never jitter (no sporadic look).
  private readonly level = new EnvelopeFollower(AUDIO_REACTIVE.smoothing.level);
  private readonly bass = new EnvelopeFollower(AUDIO_REACTIVE.smoothing.bass);
  private readonly mid = new EnvelopeFollower(AUDIO_REACTIVE.smoothing.mid);
  private readonly treble = new EnvelopeFollower(AUDIO_REACTIVE.smoothing.treble);
  // Software AGC ahead of the smoothing: one normalizer per band rescales the raw level
  // into its own recent dynamics, so the bands swing their full range at any room volume.
  private readonly normLevel = new AdaptiveNormalizer();
  private readonly normBass = new AdaptiveNormalizer();
  private readonly normMid = new AdaptiveNormalizer();
  private readonly normTreble = new AdaptiveNormalizer();
  // Brightness (spectral centroid): the FREQUENCY signal the scenes map to color. A
  // symmetric short half-life keeps the palette tracking the music without hue jitter.
  private readonly centroid = new EnvelopeFollower({
    attack: AUDIO_REACTIVE.centroid.smoothHalfLife,
    release: AUDIO_REACTIVE.centroid.smoothHalfLife,
  });
  // The kick pulse: instant attack to the kick strength on each onset (a hard kick
  // punches past 1), then a smooth ease-out.
  private readonly beat = new EnvelopeFollower({ attack: 0, release: AUDIO_REACTIVE.beatRelease });
  private readonly onset = new OnsetDetector();
  // The hi-hat / snare sparkle: a second instant-attack pulse on the TOP of the spectrum,
  // so the highs drive their own visual components independently of the kick.
  private readonly sparkle = new EnvelopeFollower({ attack: 0, release: AUDIO_REACTIVE.sparkleRelease });
  private readonly hatOnset = new OnsetDetector(AUDIO_REACTIVE.onsetHat);

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048; // good music resolution without lag
    // Light analyser smoothing only. We do the visual smoothing ourselves with the
    // envelope followers, so we keep the raw transients sharp here for a punchy
    // attack and a clean kick onset (the old 0.82 blurred every hit into a smear).
    this.analyser.smoothingTimeConstant = 0.6;
    source.connect(this.analyser);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
  }

  /** Read the live mic and return the smoothed, frame-rate-independent band levels. */
  read(nowMs: number): AudioLevels | null {
    if (!this.analyser) return null;
    this.analyser.getByteFrequencyData(this.freq);
    const dt = this.lastMs
      ? Math.min((nowMs - this.lastMs) / 1000, MAX_DT_SECONDS)
      : DEFAULT_DT_SECONDS;
    this.lastMs = nowMs;
    // Two reads of the same frame: the lifted/capped bands feed the onset detectors
    // (whose floor + margin are tuned in those units); the raw means feed the AGC, which
    // does its own scaling and so must see the true, un-clipped dynamics.
    const lifted = computeBands(this.freq);
    const raw = bandAverages(this.freq);
    const kick = this.onset.push(lifted.bass, nowMs, dt);
    const hat = this.hatOnset.push(lifted.treble, nowMs, dt);
    return {
      level: this.level.push(this.normLevel.push(raw.energy, dt), dt),
      bass: this.bass.push(this.normBass.push(raw.bass, dt), dt),
      mid: this.mid.push(this.normMid.push(raw.mid, dt), dt),
      treble: this.treble.push(this.normTreble.push(raw.treble, dt), dt),
      beat: this.beat.push(kick, dt),
      sparkle: this.sparkle.push(hat, dt),
      centroid: this.centroid.push(spectralCentroid(this.freq), dt),
    };
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
  }
}
