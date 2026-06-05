/**
 * Pure, frame-rate-independent DSP for the venue audio visualizer.
 *
 * A room mic feeds noisy, bursty band levels. Pushing them straight at the
 * shaders looks "sporadic": they jump UP and back DOWN on every micro-dip and
 * bit of mic hiss. The fix is an asymmetric envelope follower: a fast ATTACK so
 * a hit snaps the level up (responsive, punchy) and a slow RELEASE so it eases
 * back down (smooth, never jittery).
 *
 * Every decay here is expressed as a half-life in SECONDS and applied against
 * the real elapsed `dt`, so the visuals evolve identically whether the projector
 * runs at 60fps or drops to 30. The old code decayed a fixed fraction per frame,
 * which silently sped up or slowed down with the frame rate, and that drift was
 * itself a source of the sporadic look.
 *
 * This module has no Web Audio or DOM dependency, so it is unit tested directly
 * (tests/audio-reactive.test.ts). audio.ts only wires the live mic to it.
 */

/** Asymmetric smoothing for one band: fast rise, slow fall (half-lives in seconds). */
export interface BandSmoothing {
  /** Half-life while the level is rising. Small = snappy attack. */
  attack: number;
  /** Half-life while the level is falling. Larger = smooth release. */
  release: number;
}

/** Raw per-band loudness, lifted and capped but not yet smoothed (each ~0..bandCap). */
export interface RawBands {
  energy: number;
  bass: number;
  mid: number;
  treble: number;
}

/** Tuning for the whole reactive pipeline, in one place so the feel is easy to dial. */
export const AUDIO_REACTIVE = {
  /** A room mic hears music quieter than a line feed, so lift each raw band. */
  micGain: 1.7,
  /**
   * Bands may pass 1 on peaks (scenes lean into that for punch); the cap lets loud
   * hits swing hard without a runaway PA pegging a uniform flat at its ceiling.
   */
  bandCap: 1.8,
  /** Highs are sparser than lows, so they get a touch more gain to stay visible. */
  trebleGain: 1.5,
  /**
   * Band edges as fractions of the spectrum. The bins span 0..~24kHz but musical
   * energy lives in the low ~60%; the bands hug it (lows = kick, mids = leads,
   * highs = shimmer) and the dead top 40% is ignored so it cannot drag a band down.
   */
  bands: { bassTo: 0.05, midTo: 0.22, trebleTo: 0.6 },
  /**
   * Per-band asymmetric smoothing. Attacks are near-instant so a hit lands the frame
   * it happens; releases are short enough to feel lively but long enough that the
   * decay glides instead of strobing. Bass is the punchiest, level the calmest.
   */
  smoothing: {
    level: { attack: 0.025, release: 0.26 },
    bass: { attack: 0.008, release: 0.12 },
    mid: { attack: 0.012, release: 0.14 },
    treble: { attack: 0.012, release: 0.14 },
  },
  /** The kick pulse eases out over this half-life (attack is instant, see audio.ts). Longer =
   *  each hit lingers and reads as a real punch instead of a blink; still clears before the
   *  next kick at club tempos (~0.14s decays well under a 120-160 BPM beat interval). */
  beatRelease: 0.14,
  /** Kick onset detector (see OnsetDetector). */
  onset: {
    /** Bass must clear this absolute level to count as a kick at all. */
    floor: 0.1,
    /** ...and exceed its own recent reference by this much (rejects a steady bassline). */
    margin: 0.06,
    /** Half-life of the reference the kick is measured against. Short = only fast attacks fire. */
    referenceHalfLife: 0.035,
    /** Ignore re-triggers inside this window so one hit cannot double-fire. */
    refractoryMs: 120,
    /**
     * Kick strength = base + excess over the reference * gain, capped. A soft kick
     * still gives a solid pop; a hard one punches past 1 so the pulse tracks how hard
     * the music actually hit instead of flattening every kick to the same height. Tuned
     * generous: every `a.beat` term in the scenes rides this, so a bigger base/cap makes
     * the whole room punch harder on the kick without re-touching each scene.
     */
    strengthBase: 0.9,
    strengthGain: 2.2,
    maxStrength: 2.1,
  },
} as const;

/**
 * Fraction to move toward a target this step so the remaining gap halves every
 * `halfLifeSeconds`. Frame-rate independent: stepping `dt` once equals stepping
 * it in any number of smaller pieces (the one-pole solution is multiplicative).
 */
export function halfLifeFraction(dt: number, halfLifeSeconds: number): number {
  if (halfLifeSeconds <= 0) return 1; // instant
  if (dt <= 0) return 0; // no time passed, no move
  return 1 - 2 ** (-dt / halfLifeSeconds);
}

/** Mean of a fractional bin range, normalized to 0..1 (255 is full scale). */
function bandAverage(freq: Uint8Array, fromFraction: number, toFraction: number): number {
  const n = freq.length;
  const from = Math.max(0, Math.floor(n * fromFraction));
  const to = Math.min(n, Math.floor(n * toFraction));
  let sum = 0;
  for (let i = from; i < to; i += 1) sum += freq[i];
  return sum / Math.max(1, to - from) / 255;
}

/** Lift a raw 0..1 band by the mic gain (and any per-band gain), capped at bandCap. */
function liftBand(raw: number, gain: number): number {
  return Math.min(AUDIO_REACTIVE.bandCap, raw * AUDIO_REACTIVE.micGain * gain);
}

/** Slice a frequency-magnitude frame into lifted, capped energy/bass/mid/treble bands. */
export function computeBands(freq: Uint8Array): RawBands {
  const edges = AUDIO_REACTIVE.bands;
  return {
    energy: liftBand(bandAverage(freq, 0, edges.trebleTo), 1),
    bass: liftBand(bandAverage(freq, 0, edges.bassTo), 1),
    mid: liftBand(bandAverage(freq, edges.bassTo, edges.midTo), 1),
    treble: liftBand(bandAverage(freq, edges.midTo, edges.trebleTo), AUDIO_REACTIVE.trebleGain),
  };
}

/**
 * Asymmetric one-pole smoother. Rises toward a target with the (fast) attack
 * half-life and falls with the (slow) release half-life, so transients punch
 * through while the decay stays smooth. The same class powers the band levels,
 * the kick pulse (attack 0 = instant), and the onset detector's reference.
 */
export class EnvelopeFollower {
  private value: number;

  constructor(
    private readonly smoothing: BandSmoothing,
    initial = 0,
  ) {
    this.value = initial;
  }

  /** Step toward `target` over `dt` seconds and return the new value. */
  push(target: number, dt: number): number {
    const halfLife = target > this.value ? this.smoothing.attack : this.smoothing.release;
    this.value += (target - this.value) * halfLifeFraction(dt, halfLife);
    return this.value;
  }

  get current(): number {
    return this.value;
  }
}

/**
 * Kick detector on the bass band. Fires when bass jumps above its own recent
 * reference by a margin, so a fast attack (a kick) triggers but a sustained
 * bassline does not: the reference is a short half-life follower that catches up
 * to a held note within the refractory window, starving any re-trigger. An
 * absolute floor ignores the noise floor, and the refractory gap stops one hit
 * from double-firing. Because the reference is a half-life follower, detection
 * is the same at any frame rate.
 *
 * The return is a STRENGTH, not a flag: a harder kick (a bigger jump over the
 * reference) returns a bigger number, so the pulse tracks the music's dynamics
 * instead of flattening every hit to the same height.
 */
export class OnsetDetector {
  private readonly reference: EnvelopeFollower;
  private lastBeatMs = Number.NEGATIVE_INFINITY;

  constructor(private readonly cfg = AUDIO_REACTIVE.onset) {
    const halfLife = cfg.referenceHalfLife;
    this.reference = new EnvelopeFollower({ attack: halfLife, release: halfLife });
  }

  /** Push this frame's bass; return the kick strength (0 = no onset, harder = bigger). */
  push(bass: number, nowMs: number, dt: number): number {
    const excess = bass - this.reference.current;
    this.reference.push(bass, dt);
    const fired =
      excess > this.cfg.margin &&
      bass > this.cfg.floor &&
      nowMs - this.lastBeatMs > this.cfg.refractoryMs;
    if (!fired) return 0;
    this.lastBeatMs = nowMs;
    return Math.min(this.cfg.maxStrength, this.cfg.strengthBase + excess * this.cfg.strengthGain);
  }
}
