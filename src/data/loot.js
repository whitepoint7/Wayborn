export const DRIFT_LOOT_BY_BAND = {
  safe: [
    { key: "branch", weight: 46 },
    { key: "leaf", weight: 34 },
    { key: "plastic", weight: 20 }
  ],
  harsh: [
    { key: "branch", weight: 37 },
    { key: "leaf", weight: 27 },
    { key: "plastic", weight: 36 }
  ],
  danger: [
    { key: "branch", weight: 28 },
    { key: "leaf", weight: 20 },
    { key: "plastic", weight: 52 }
  ]
};

export const ISLAND_ARCHETYPES = {
  grove: {
    label: "Verimli Ada",
    loot: { log: [2, 5], fruit: [3, 6], stone: [0, 2], sand: [1, 3], scrap: [0, 0], ore: [0, 0] }
  },
  beach: {
    label: "Kumsal Ada",
    loot: { log: [1, 3], fruit: [1, 3], stone: [1, 3], sand: [3, 6], scrap: [0, 1], ore: [0, 0] }
  },
  wreck: {
    label: "Enkaz Adasi",
    loot: { log: [1, 3], fruit: [0, 2], stone: [1, 3], sand: [1, 3], scrap: [3, 6], ore: [0, 2] }
  },
  rocky: {
    label: "Kayalik Ada",
    loot: { log: [0, 2], fruit: [0, 2], stone: [4, 8], sand: [1, 3], scrap: [0, 1], ore: [2, 5] }
  },
  perilous: {
    label: "Tekinsiz Ada",
    loot: { log: [1, 3], fruit: [0, 2], stone: [4, 7], sand: [2, 4], scrap: [2, 5], ore: [4, 8] }
  }
};

export const ISLAND_ARCHETYPE_BY_ID = {
  "driftwood-cay": "wreck",
  greenwater: "grove",
  blackrock: "rocky",
  windbreak: "grove",
  longshore: "beach",
  farwatch: "rocky",
  saltpine: "grove",
  "redreef-cay": "beach",
  mistfall: "grove",
  ironshore: "rocky",
  deadwind: "perilous",
  godsend: "perilous"
};

export const DIVE_RESOURCE_WEIGHTS = {
  shallow: { stone: 46, scrap: 27, sand: 13, coral: 8, ore: 6 },
  reef: { coral: 44, stone: 24, scrap: 18, pearl: 9, ore: 5 },
  open: { scrap: 52, stone: 24, ore: 12, ancientRelic: 8, deepCrystal: 4 },
  deep: { ore: 32, scrap: 25, deepCrystal: 18, ancientRelic: 14, coral: 7, pearl: 4 }
};

export const DIVE_CHEST_LOOT = {
  shallow: [
    { key: "scrap", min: 1, max: 2, chance: 100 },
    { key: "plastic", min: 1, max: 2, chance: 65 }
  ],
  reef: [
    { key: "coral", min: 1, max: 2, chance: 80 },
    { key: "pearl", min: 1, max: 1, chance: 24 }
  ],
  open: [
    { key: "scrap", min: 2, max: 4, chance: 100 },
    { key: "ancientRelic", min: 1, max: 1, chance: 18 }
  ],
  deep: [
    { key: "ore", min: 2, max: 4, chance: 100 },
    { key: "deepCrystal", min: 1, max: 2, chance: 34 },
    { key: "ancientRelic", min: 1, max: 1, chance: 28 }
  ]
};

export function getIslandArchetype(id, riskBand = "safe") {
  if (riskBand === "danger" || riskBand === "edge") return "perilous";
  return ISLAND_ARCHETYPE_BY_ID[id] ?? (riskBand === "harsh" ? "rocky" : "beach");
}
