export type RandomSource = {
  next(): number;
};

export function createSeededRng(seed: number): RandomSource {
  let state = seed >>> 0;

  return {
    next(): number {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function nextStandardNormal(rng: RandomSource): number {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) {
    u1 = rng.next();
  }
  while (u2 === 0) {
    u2 = rng.next();
  }
  const mag = Math.sqrt(-2.0 * Math.log(u1));
  return mag * Math.cos(2.0 * Math.PI * u2);
}
