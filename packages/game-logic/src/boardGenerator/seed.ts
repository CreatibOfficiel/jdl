function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class SeededRandom {
  private readonly nextFn: () => number;

  constructor(seed: string) {
    this.nextFn = mulberry32(hashSeed(seed));
  }

  nextFloat(): number {
    return this.nextFn();
  }

  nextInt(min: number, max: number): number {
    return min + Math.floor(this.nextFn() * (max - min + 1));
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return arr[this.nextInt(0, arr.length - 1)] as T;
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const ai = a[i] as T;
      const aj = a[j] as T;
      a[i] = aj;
      a[j] = ai;
    }
    return a;
  }
}
