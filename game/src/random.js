// random.js — a tiny seeded RNG (mulberry32) so every run is deterministic.
// Game logic never calls Math.random; only this module hands out randomness,
// and it is always seeded from the level seed.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Integer in [min, max] from a seeded rng function.
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Pick one element of an array from a seeded rng function.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
