// Seeded random numbers (mulberry32) so the same seed always produces
// the same sequence — screenshot scenes stay reproducible.

// Build a generator from one numeric seed. Every call returns a float
// in [0, 1).
export function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Same generator under its algorithm name.
export const mulberry32 = createRng;

// Pick one element of a list at random using the given generator.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
