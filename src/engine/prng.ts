/**
 * Deterministic PRNG utilities for 100% reproducible Canvas/WebGL preview & export.
 * Never uses Date.now() or Math.random().
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic smooth value noise in [-1, 1] for jitter/flicker curves.
 */
export function seededWaveNoise(seed: number, phase: number): number {
  const s1 = Math.sin(phase * 1.0 + seed * 1.73);
  const s2 = Math.sin(phase * 2.13 + seed * 3.17) * 0.55;
  const s3 = Math.cos(phase * 3.47 - seed * 0.91) * 0.25;
  return (s1 + s2 + s3) / 1.8;
}
