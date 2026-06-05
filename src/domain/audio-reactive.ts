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

/** Software-AGC tuning for one band (see {@link AdaptiveNormalizer}). */
export interface NormalizeConfig {
  attackHalfLife: number;
  peakHalfLife: number;
  floor: number;
  minSpan: number;
  ceil: number;
}

/** Onset detector tuning. The same shape powers the kick (bass) and the hi-hat (treble). */
export interface OnsetConfig {
  floor: number;
  margin: number;
  referenceHalfLife: number;
  refractoryMs: number;
  strengthBase: number;
  strengthGain: number;
  maxStrength: number;
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
  /**
   * Hi-hat / snare onset on the TREBLE band, run through the same OnsetDetector as the
   * kick. Highs are fast and frequent, so this fires on a smaller margin, recovers
   * quicker (short reference + refractory), and pops a touch softer than the kick. It
   * gives the scenes a second, independent trigger for the top of the spectrum (sparkle,
   * grain, dot density) so the highs drive their own visual components, not just the kick.
   */
  onsetHat: {
    floor: 0.16,
    margin: 0.07,
    referenceHalfLife: 0.045,
    refractoryMs: 70,
    strengthBase: 0.7,
    strengthGain: 1.6,
    maxStrength: 1.8,
  },
  /** The hi-hat sparkle pulse eases out faster than the kick (highs are quick, airy). */
  sparkleRelease: 0.1,
  /**
   * Software AGC. A room mic hears each song at a different absolute volume, so a fixed
   * gain leaves the bands barely swinging at one level and pegged at another. The
   * normalizer tracks a slowly decaying per-band PEAK and rescales the live value into
   * [0..ceil], so amplitude tracks the music's own recent dynamics (a drop slams, a
   * breakdown calms) regardless of how loud the PA is set. This is the single biggest
   * "responsiveness" win: every band now uses its full visual range every song.
   */
  normalize: {
    /** Half-life of the peak's RISE. Short, but not instant: a sudden accent jumps over
     *  the still-catching-up peak and so reads past 1 for a frame or two (the punch the
     *  scenes lean into), then settles to ~1 as the peak catches the new loud level. */
    attackHalfLife: 0.05,
    /** Half-life of the peak's DECAY. Long enough to hold a song's loud level, short
     *  enough that a quiet section relaxes the gain back up within a few bars. */
    peakHalfLife: 9,
    /** Energy below this (raw 0..1 band mean) is treated as the noise floor -> maps to 0. */
    floor: 0.03,
    /** Never divide by a span tighter than this, so near-silence cannot amplify hiss. */
    minSpan: 0.06,
    /** Let a transient punch past 1 (scenes lean into peaks) but not run away. */
    ceil: 1.35,
  },
  /** Spectral centroid (brightness / where the energy sits): drives color in the scenes. */
  centroid: {
    /** Ignore bins under this byte magnitude so room hiss does not drag the centroid up. */
    binFloor: 8,
    /** Smoothing half-life of the centroid: quick enough to track a riser, calm enough
     *  that the palette glides instead of flickering hue frame to frame. */
    smoothHalfLife: 0.09,
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

/**
 * Raw (un-gained, un-capped) 0..1 band means straight off the spectrum. This is the
 * input the {@link AdaptiveNormalizer} wants: it does its own scaling, so it must see the
 * true dynamics, not a value already lifted by a fixed gain and clipped at the cap.
 */
export function bandAverages(freq: Uint8Array): RawBands {
  const edges = AUDIO_REACTIVE.bands;
  return {
    energy: bandAverage(freq, 0, edges.trebleTo),
    bass: bandAverage(freq, 0, edges.bassTo),
    mid: bandAverage(freq, edges.bassTo, edges.midTo),
    treble: bandAverage(freq, edges.midTo, edges.trebleTo),
  };
}

/**
 * Slice a frequency-magnitude frame into lifted, capped energy/bass/mid/treble bands.
 * This is the absolute-scaled feed used by the kick/hat onset detectors (whose floor and
 * margin are tuned in these units); the continuous band levels the scenes read are the
 * adaptively normalized {@link bandAverages} instead.
 */
export function computeBands(freq: Uint8Array): RawBands {
  const raw = bandAverages(freq);
  return {
    energy: liftBand(raw.energy, 1),
    bass: liftBand(raw.bass, 1),
    mid: liftBand(raw.mid, 1),
    treble: liftBand(raw.treble, AUDIO_REACTIVE.trebleGain),
  };
}

/**
 * Spectral centroid: the magnitude-weighted "center of mass" of the spectrum across the
 * musical range, normalized to 0..1 (0 = energy sits at the lowest bins / a dark, bassy
 * sound; 1 = energy sits at the top / a bright, airy sound). This is the cleanest single
 * scalar for the FREQUENCY content of the music, so the scenes map it to color: the
 * palette warms and brightens as the track does, and cools as it gets bassy. A per-bin
 * floor keeps room hiss from dragging it upward, and silence returns 0.
 */
export function spectralCentroid(freq: Uint8Array): number {
  const to = Math.min(freq.length, Math.floor(freq.length * AUDIO_REACTIVE.bands.trebleTo));
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < to; i += 1) {
    const mag = freq[i] - AUDIO_REACTIVE.centroid.binFloor;
    if (mag <= 0) continue;
    weighted += i * mag;
    total += mag;
  }
  if (total <= 0) return 0;
  return weighted / total / Math.max(1, to - 1);
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

  constructor(private readonly cfg: OnsetConfig = AUDIO_REACTIVE.onset) {
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

/**
 * Per-band software AGC (automatic gain control). It tracks a running PEAK that snaps up
 * to any new high and then decays slowly back toward the noise floor, and maps the live
 * value into [0..ceil] across `peak - floor`. So whatever the absolute room volume, the
 * loudest recent moment in a band reads near 1 and a quiet moment reads near 0 — the
 * visuals follow the music's own dynamics instead of the PA's volume knob.
 *
 * Why this matters for the visuals: with a fixed gain, a band at a given level barely
 * swings (small visible delta); normalized, the same band sweeps its full range every
 * song, so the correlation between loudness and the on-screen response is tight and
 * legible. The peak decay is a half-life against real `dt`, so it is frame-rate
 * independent like everything else here, and a `minSpan` floor stops near-silence from
 * amplifying hiss into a full-scale strobe.
 */
export class AdaptiveNormalizer {
  // The peak is itself an asymmetric follower: it RISES fast toward a louder level and
  // FALLS slowly back toward the floor, which is exactly the AGC behavior we want.
  private readonly peak: EnvelopeFollower;

  constructor(private readonly cfg: NormalizeConfig = AUDIO_REACTIVE.normalize) {
    this.peak = new EnvelopeFollower(
      { attack: cfg.attackHalfLife, release: cfg.peakHalfLife },
      cfg.floor,
    );
  }

  /** Push a raw 0..1 band value over `dt`; return it rescaled to its recent dynamics. */
  push(value: number, dt: number): number {
    const peak = this.peak.push(value, dt);
    const span = Math.max(this.cfg.minSpan, peak - this.cfg.floor);
    const out = (value - this.cfg.floor) / span;
    return out < 0 ? 0 : out > this.cfg.ceil ? this.cfg.ceil : out;
  }

  get current(): number {
    return this.peak.current;
  }
}
