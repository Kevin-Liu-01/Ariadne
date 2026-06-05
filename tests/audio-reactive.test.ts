import { describe, expect, it } from "vitest";
import {
  AUDIO_REACTIVE,
  EnvelopeFollower,
  OnsetDetector,
  computeBands,
  halfLifeFraction,
} from "@/domain/audio-reactive";

/** Build a 1024-bin frequency frame from a per-bin fill function (clamped to 0..255). */
function freqArray(fill: (i: number, n: number) => number, n = 1024): Uint8Array {
  const a = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) a[i] = Math.max(0, Math.min(255, Math.round(fill(i, n))));
  return a;
}

/** Warm an onset detector at the noise floor so its reference settles before a test. */
function warmAtFloor(d: OnsetDetector, startMs: number): number {
  let t = startMs;
  for (let i = 0; i < 30; i += 1) {
    d.push(0.05, t, 0.016);
    t += 16;
  }
  return t;
}

describe("halfLifeFraction", () => {
  it("halves the remaining gap over exactly one half-life", () => {
    expect(halfLifeFraction(0.1, 0.1)).toBeCloseTo(0.5, 6);
  });

  it("does not move when no time has passed", () => {
    expect(halfLifeFraction(0, 0.1)).toBe(0);
  });

  it("snaps fully when the half-life is zero (instant)", () => {
    expect(halfLifeFraction(0.016, 0)).toBe(1);
  });

  it("moves almost the whole way over many half-lives", () => {
    expect(halfLifeFraction(1, 0.1)).toBeGreaterThan(0.99);
  });
});

describe("EnvelopeFollower", () => {
  // The core "responsive but not sporadic" property: it shoots up to a hit but
  // crawls back down, so a transient reads instantly yet the decay never jitters.
  it("attacks fast and releases slow", () => {
    const f = new EnvelopeFollower({ attack: 0.05, release: 0.5 });
    const afterAttack = f.push(1, 0.05); // one attack half-life of rising
    expect(afterAttack).toBeCloseTo(0.5, 6);
    const afterRelease = f.push(0, 0.05); // same dt, now falling, but 10x slower
    expect(afterRelease).toBeGreaterThan(0.45);
    expect(afterRelease).toBeLessThan(0.5);
  });

  // The whole point of half-life smoothing: identical evolution at any frame rate.
  it("lands in the same place whether stepped once or in pieces", () => {
    const oneBigStep = new EnvelopeFollower({ attack: 0.1, release: 0.1 });
    const manySmallSteps = new EnvelopeFollower({ attack: 0.1, release: 0.1 });
    oneBigStep.push(1, 0.1);
    manySmallSteps.push(1, 0.05);
    manySmallSteps.push(1, 0.05);
    expect(manySmallSteps.current).toBeCloseTo(oneBigStep.current, 6);
  });

  it("snaps instantly to the kick then eases out (the beat pulse)", () => {
    const beat = new EnvelopeFollower({ attack: 0, release: AUDIO_REACTIVE.beatRelease });
    expect(beat.push(1, 0.016)).toBeCloseTo(1, 6);
    expect(beat.push(0, AUDIO_REACTIVE.beatRelease)).toBeCloseTo(0.5, 6);
  });
});

describe("computeBands", () => {
  it("is silent for a silent spectrum", () => {
    expect(computeBands(freqArray(() => 0))).toEqual({ energy: 0, bass: 0, mid: 0, treble: 0 });
  });

  it("lifts a quiet room signal above its raw level", () => {
    const raw = 30 / 255;
    expect(computeBands(freqArray(() => 30)).energy).toBeGreaterThan(raw);
  });

  it("caps a hot spectrum so a loud PA cannot peg a uniform", () => {
    const b = computeBands(freqArray(() => 255));
    // No band may run past the cap...
    expect(b.energy).toBeLessThanOrEqual(AUDIO_REACTIVE.bandCap);
    expect(b.bass).toBeLessThanOrEqual(AUDIO_REACTIVE.bandCap);
    expect(b.mid).toBeLessThanOrEqual(AUDIO_REACTIVE.bandCap);
    // ...and treble has the most gain, so a full spectrum clamps it exactly at the cap.
    expect(b.treble).toBeCloseTo(AUDIO_REACTIVE.bandCap, 6);
  });

  it("routes low energy to bass and high energy to treble", () => {
    const lowOnly = computeBands(freqArray((i, n) => (i < n * 0.04 ? 220 : 0)));
    expect(lowOnly.bass).toBeGreaterThan(0.5);
    expect(lowOnly.mid).toBe(0);
    expect(lowOnly.treble).toBe(0);

    const highOnly = computeBands(freqArray((i, n) => (i >= n * 0.25 && i < n * 0.5 ? 220 : 0)));
    expect(highOnly.treble).toBeGreaterThan(0.5);
    expect(highOnly.bass).toBe(0);
    expect(highOnly.mid).toBe(0);
  });
});

describe("OnsetDetector", () => {
  it("fires on a kick but stays quiet on the noise floor", () => {
    const d = new OnsetDetector();
    let t = 0;
    for (let i = 0; i < 30; i += 1) {
      expect(d.push(0.05, t, 0.016)).toBe(0); // below the absolute floor
      t += 16;
    }
    expect(d.push(0.6, t, 0.016)).toBeGreaterThan(0);
  });

  it("does not double-trigger inside the refractory window", () => {
    const d = new OnsetDetector();
    let t = warmAtFloor(d, 0);
    expect(d.push(0.6, t, 0.016)).toBeGreaterThan(0);
    t += 16;
    expect(d.push(0.6, t, 0.016)).toBe(0);
  });

  it("treats a sustained bass note as one onset, not a stream", () => {
    const d = new OnsetDetector();
    let t = warmAtFloor(d, 0);
    let fires = 0;
    for (let i = 0; i < 40; i += 1) {
      if (d.push(0.6, t, 0.016) > 0) fires += 1;
      t += 16;
    }
    expect(fires).toBe(1);
  });

  it("re-triggers on a fresh kick after the bass settles", () => {
    const d = new OnsetDetector();
    let t = warmAtFloor(d, 0);
    expect(d.push(0.6, t, 0.016)).toBeGreaterThan(0);
    t += 16;
    t = warmAtFloor(d, t); // let the reference fall back to the floor
    expect(d.push(0.6, t, 0.016)).toBeGreaterThan(0);
  });

  // "Better to actual music": the pulse height tracks how hard the kick hit, so a
  // soft kick gives a gentle bump and a hard one slams.
  it("returns a bigger pulse for a harder kick", () => {
    const soft = new OnsetDetector();
    const softStrength = soft.push(0.3, warmAtFloor(soft, 0), 0.016);
    const hard = new OnsetDetector();
    const hardStrength = hard.push(0.9, warmAtFloor(hard, 0), 0.016);
    expect(softStrength).toBeGreaterThan(0);
    expect(hardStrength).toBeGreaterThan(softStrength);
  });
});
