/** Mic-driven audio analysis for the venue visualizer. Browser-only (Web Audio API). */

export interface Frame {
  freq: Uint8Array; // frequency magnitudes, 0..255 (getByteFrequencyData)
  wave: Uint8Array; // time-domain samples, 0..255 (getByteTimeDomainData)
  energy: number; // overall loudness, 0..1
  bass: number; // low-band energy, 0..1 (drives beats)
  treble: number; // high-band energy, 0..1
  beat: boolean; // a bass transient this frame
  level: number; // smoothed energy for meters
}

function average(data: Uint8Array, from = 0, to = data.length): number {
  let sum = 0;
  for (let i = from; i < to; i += 1) sum += data[i];
  return sum / Math.max(1, to - from);
}

/** Wraps the mic -> AnalyserNode graph and derives a per-frame {@link Frame}. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private freq = new Uint8Array(0);
  private wave = new Uint8Array(0);
  private avgBass = 0;
  private level = 0;
  private lastBeatMs = 0;

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
    this.analyser.smoothingTimeConstant = 0.82;
    source.connect(this.analyser);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.wave = new Uint8Array(this.analyser.fftSize);
  }

  read(nowMs: number): Frame | null {
    if (!this.analyser) return null;
    this.analyser.getByteFrequencyData(this.freq);
    this.analyser.getByteTimeDomainData(this.wave);
    const n = this.freq.length;
    const energy = average(this.freq) / 255;
    const bass = average(this.freq, 0, Math.floor(n * 0.08)) / 255;
    const treble = average(this.freq, Math.floor(n * 0.5), n) / 255;

    // Beat: a bass spike above a decaying baseline, with a refractory gap.
    this.avgBass = this.avgBass * 0.92 + bass * 0.08;
    let beat = false;
    if (bass > this.avgBass * 1.35 && bass > 0.18 && nowMs - this.lastBeatMs > 180) {
      beat = true;
      this.lastBeatMs = nowMs;
    }
    this.level = this.level * 0.85 + energy * 0.15;
    return { freq: this.freq, wave: this.wave, energy, bass, treble, beat, level: this.level };
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
  }
}

/** Fires once when the music drops near-silent then returns: a track change. */
export class TransitionDetector {
  private quietMs = 0;
  private lastFireMs = 0;

  update(energy: number, dtMs: number, nowMs: number): boolean {
    if (energy < 0.05) this.quietMs += dtMs;
    else this.quietMs = Math.max(0, this.quietMs - dtMs * 1.5);

    const cameBack = this.quietMs > 450 && energy > 0.14;
    if (cameBack && nowMs - this.lastFireMs > 7000) {
      this.lastFireMs = nowMs;
      this.quietMs = 0;
      return true;
    }
    return false;
  }
}
