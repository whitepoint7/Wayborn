export const DIVE_SITES = {
  shallow: {
    label: "Sig Su",
    hint: "ada cevresinde kisa ve dikkatli arama",
    requirement: "Ada cevresi",
    minGear: "none",
    oxygen: 105,
    risk: 20,
    resources: {
      stone: { label: "Tas Topla", oxygen: 14, chance: 84 },
      sand: { label: "Dip Kumu", oxygen: 18, chance: 42 },
      coral: { label: "Kiyi Mercani", oxygen: 26, chance: 24 },
      ore: { label: "Kiyi Maden Kirintisi", oxygen: 30, chance: 8 }
    }
  },
  reef: {
    label: "Resif",
    hint: "mercan, akinti ve zehirli canlilar",
    requirement: "Dalis Maskesi",
    minGear: "mask",
    oxygen: 95,
    risk: 28,
    resources: {
      coral: { label: "Mercan Topla", oxygen: 36, chance: 42 },
      stone: { label: "Resif Tasi", oxygen: 18, chance: 62 },
      pearl: { label: "Inci Ara", oxygen: 38, chance: 12 },
      ore: { label: "Resif Maden Damari", oxygen: 34, chance: 8 }
    }
  },
  open: {
    label: "Acik Okyanus",
    hint: "az kaynak, daha fazla canli tehdidi",
    requirement: "Acik deniz",
    minGear: "none",
    oxygen: 85,
    risk: 34,
    resources: {
      stone: { label: "Dip Tasi", oxygen: 24, chance: 38 },
      ore: { label: "Dip Maden Kirintisi", oxygen: 36, chance: 12 },
      ancientRelic: { label: "Batmis Yadigar", oxygen: 42, chance: 6 },
      deepCrystal: { label: "Derin Kristal", oxygen: 46, chance: 3 }
    }
  },
  deep: {
    label: "Derin Su",
    hint: "tup ile enkaz ve derin maden",
    requirement: "Basit Dalis Tupu",
    minGear: "tank",
    oxygen: 155,
    risk: 38,
    resources: {
      coral: { label: "Nadir Mercan", oxygen: 42, chance: 34 },
      stone: { label: "Derin Tas", oxygen: 26, chance: 64 },
      ore: { label: "Derin Maden", oxygen: 40, chance: 34, bonusChance: 18 },
      pearl: { label: "Derin Inci", oxygen: 45, chance: 10 },
      ancientRelic: { label: "Batmis Yadigar", oxygen: 48, chance: 14 },
      deepCrystal: { label: "Derin Su Kristali", oxygen: 52, chance: 20 }
    }
  }
};
