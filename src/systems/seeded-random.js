export function normalizeSeed(value) {
  const text = String(value ?? "").trim();
  if (!text) return Date.now() >>> 0;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function makeSeedCode(seed) {
  return `W-${(seed >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
}

export function hashSeed(...parts) {
  let hash = 2166136261;
  parts.join(":").split("").forEach((char) => {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return hash >>> 0;
}

export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return {
    float() {
      state = Math.imul(state + 0x6d2b79f5, 1);
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    between(min, max) {
      return Math.floor(this.float() * (max - min + 1)) + min;
    },
    floatBetween(min, max) {
      return min + this.float() * (max - min);
    },
    chance(percent) {
      return this.between(1, 100) <= percent;
    }
  };
}
