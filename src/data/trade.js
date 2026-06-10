export const TRADE_GOODS = {
  sell: {
    fish: 8,
    crab: 7,
    shrimp: 9,
    lobster: 24,
    cookedFish: 14,
    cookedSharkMeat: 42,
    coral: 18,
    scrap: 5,
    stone: 2,
    fruit: 5,
    log: 7,
    sand: 2,
    ore: 16,
    glass: 22,
    cookedMeat: 15,
    snakeSkin: 24,
    venomGland: 34,
    thorn: 6,
    pearl: 38,
    ancientRelic: 64,
    deepCrystal: 82
  },
  buy: {
    fruit: 7,
    branch: 4,
    leaf: 4,
    plastic: 6,
    log: 10,
    sand: 4,
    ore: 18,
    glass: 30,
    rope: 6,
    cloth: 8,
    scrap: 9,
    stone: 5,
    seeds: 12,
    fishingParts: 18,
    harpoonParts: 24,
    diveParts: 32
  }
};

export const PORT_MARKETS = {
  safe: {
    label: "Guvenli Liman",
    buyKeys: ["fruit", "branch", "leaf", "plastic", "rope", "cloth", "stone"],
    buyMultiplier: 1,
    sellMultiplier: 0.9,
    rareSellMultiplier: 1
  },
  harsh: {
    label: "Sinir Pazari",
    buyKeys: ["fruit", "plastic", "log", "sand", "ore", "rope", "cloth", "scrap", "stone"],
    buyMultiplier: 1.12,
    sellMultiplier: 1.08,
    rareSellMultiplier: 1.25
  },
  danger: {
    label: "Tehlikeli Sular Karakolu",
    buyKeys: ["plastic", "log", "sand", "ore", "glass", "cloth", "scrap", "stone"],
    buyMultiplier: 1.28,
    sellMultiplier: 1.22,
    rareSellMultiplier: 1.65
  }
};

export const RARE_TRADE_KEYS = ["coral", "glass", "snakeSkin", "venomGland", "sharkBone", "pearl", "ancientRelic", "deepCrystal"];

export const MARKET_SPECIALTIES = {
  provisions: {
    label: "Erzak Limani",
    extraBuyKeys: ["fruit", "seeds", "cloth"],
    buyDiscountKeys: ["fruit", "seeds"]
  },
  fishing: {
    label: "Balikci Iskelesi",
    extraBuyKeys: ["fishingParts", "rope", "cloth"],
    buyDiscountKeys: ["fishingParts", "rope"]
  },
  salvage: {
    label: "Enkaz Pazari",
    extraBuyKeys: ["plastic", "scrap", "harpoonParts"],
    buyDiscountKeys: ["scrap", "harpoonParts"]
  },
  diving: {
    label: "Dalgic Pazari",
    extraBuyKeys: ["diveParts", "glass", "cloth"],
    buyDiscountKeys: ["diveParts", "glass"]
  },
  industry: {
    label: "Sanayi Limani",
    extraBuyKeys: ["ore", "glass", "scrap", "harpoonParts"],
    buyDiscountKeys: ["ore", "scrap"]
  },
  frontier: {
    label: "Sinir Karakolu",
    extraBuyKeys: ["harpoonParts", "diveParts", "glass"],
    buyDiscountKeys: []
  }
};

export const PORT_SERVICES = {
  heal: {
    name: "Tedavi",
    detail: "Can +35",
    price: 18
  },
  repair: {
    name: "Sal Tamiri",
    detail: "Govde ve hasarli parcalar",
    price: 24
  },
  supplies: {
    name: "Su / Erzak Ikmali",
    detail: "Su +25, aclik +18",
    price: 16
  },
  waterFill: {
    name: "Matara Doldur",
    detail: "Matarayi temiz suyla doldur",
    price: 4
  }
};

export const BAIT_PRICE = 5;
