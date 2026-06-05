/** Mic-driven audio analysis for the venue visualizer. Browser-only (Web Audio API). */

import type { AudioLevels } from "@/app/visuals/scenes";
import {
  AUDIO_REACTIVE,
  EnvelopeFollower,
  OnsetDetector,
  computeBands,
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
  // The kick pulse: instant attack to the kick strength on each onset (a hard kick
  // punches past 1), then a smooth ease-out.
  private readonly beat = new EnvelopeFollower({ attack: 0, release: AUDIO_REACTIVE.beatRelease });
  private readonly onset = new OnsetDetector();

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
    const raw = computeBands(this.freq);
    const strength = this.onset.push(raw.bass, nowMs, dt);
    return {
      level: this.level.push(raw.energy, dt),
      bass: this.bass.push(raw.bass, dt),
      mid: this.mid.push(raw.mid, dt),
      treble: this.treble.push(raw.treble, dt),
      beat: this.beat.push(strength, dt),
    };
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
  }
}
