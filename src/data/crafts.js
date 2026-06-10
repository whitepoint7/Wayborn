export const CRAFTS = [
  {
    name: "Uretim Kiti",
    hint: "1 dal + 1 yaprak + 1 plastik, uretim ve tamir yapmayi acar",
    cost: { branch: 1, leaf: 1, plastic: 1 },
    requires: (scene) => !scene.hasCraftingKit,
    requiresText: "Uretim kiti zaten hazir",
    apply: (scene) => scene.unlockCraftingKit()
  },
  {
    name: "Basit Mesale",
    hint: "1 dal + 2 yaprak, gece gorusunu artirir",
    cost: { branch: 1, leaf: 2 },
    requires: (scene) => !scene.hasTorch,
    requiresText: "Mesale zaten hazir",
    basic: true,
    apply: (scene) => scene.unlockTorch()
  },
  {
    name: "Basit Balta",
    hint: "2 dal + 1 tas + 1 ip, adalardaki agaclari keser",
    cost: { branch: 2, stone: 1, rope: 1 },
    requires: (scene) => scene.hasCraftingKit && !scene.hasAxe,
    requiresText: "Uretim Kiti gerekli veya balta zaten hazir",
    apply: (scene) => scene.unlockAxe()
  },
  {
    name: "Basit Kazma",
    hint: "2 dal + 2 tas + 1 ip, adalardaki maden damarlarini kazar",
    cost: { branch: 2, stone: 2, rope: 1 },
    requires: (scene) => scene.hasCraftingKit && !scene.hasPickaxe,
    requiresText: "Uretim Kiti gerekli veya kazma zaten hazir",
    apply: (scene) => scene.unlockPickaxe()
  },
  {
    name: "Sal Parcasi",
    hint: "3 dal + 2 yaprak",
    cost: { branch: 3, leaf: 2 },
    apply: (scene) => scene.addRaftPiece()
  },
  {
    name: "Ip Yap",
    hint: "3 yaprak -> 2 ip",
    cost: { leaf: 3 },
    basic: true,
    apply: (scene) => {
      scene.inventory.rope = (scene.inventory.rope ?? 0) + 2;
      return true;
    }
  },
  {
    name: "Kumas Dokuma",
    hint: "4 yaprak -> 1 kumas",
    cost: { leaf: 4 },
    basic: true,
    apply: (scene) => {
      scene.inventory.cloth = (scene.inventory.cloth ?? 0) + 1;
      return true;
    }
  },
  {
    name: "Baglanti Kirisi",
    hint: "4 dal + 2 ip, etrafinda genisleme alani acar",
    cost: { branch: 4, rope: 2 },
    apply: (scene) => scene.addBeam()
  },
  {
    name: "Toplama Agi",
    hint: "2 dal + 2 ip + 1 plastik",
    cost: { branch: 2, rope: 2, plastic: 1 },
    apply: (scene) => scene.addNet()
  },
  {
    name: "Basit Olta",
    hint: "1 dal + 1 ip",
    cost: { branch: 1, rope: 1 },
    requires: (scene) => !scene.hasFishingRod,
    requiresText: "Olta zaten hazir",
    apply: (scene) => scene.unlockFishing()
  },
  {
    name: "Basit Matara",
    hint: "2 plastik + 1 yaprak, limandan veya su toplayicidan su tasir",
    cost: { plastic: 2, leaf: 1 },
    requires: (scene) => !scene.hasFlask,
    requiresText: "Matara zaten hazir",
    basic: true,
    apply: (scene) => scene.unlockFlask()
  },
  {
    name: "Saglam Misina",
    hint: "2 ip + 2 plastik, olta gerekir",
    cost: { rope: 2, plastic: 2 },
    requires: (scene) => scene.hasFishingRod && scene.fishingLineLevel < 1,
    requiresText: "Basit olta gerekli veya misina zaten gelistirildi",
    apply: (scene) => scene.upgradeFishingLine(1)
  },
  {
    name: "Guclu Olta",
    hint: "2 dal + 1 ip + 2 hurda, saglam misina gerekir",
    cost: { branch: 2, rope: 1, scrap: 2 },
    requires: (scene) => scene.hasFishingRod && scene.fishingLineLevel >= 1 && scene.fishingRodLevel < 1,
    requiresText: "Saglam misina gerekli veya olta zaten gelistirildi",
    apply: (scene) => scene.upgradeFishingRod(1)
  },
  {
    name: "Balik Yemi",
    hint: "1 meyve -> 3 yem",
    cost: { fruit: 1 },
    requires: (scene) => scene.hasFishingRod,
    requiresText: "Once Basit Olta yap",
    apply: (scene) => scene.addFishingBait(3)
  },
  {
    name: "Basit Zipkin",
    hint: "2 dal + 1 ip + 1 hurda",
    cost: { branch: 2, rope: 1, scrap: 1 },
    requires: (scene) => !scene.hasHarpoon,
    requiresText: "Zipkin zaten hazir",
    apply: (scene) => scene.unlockHarpoon()
  },
  {
    name: "Pusula",
    hint: "1 cam + 1 hurda, forge ile cam gerekir",
    cost: { glass: 1, scrap: 1 },
    requires: (scene) => scene.hasForge && !scene.hasCompass,
    requiresText: "Basit Forge gerekli veya pusula zaten hazir",
    apply: (scene) => scene.unlockCompass()
  },
  {
    name: "Dalis Maskesi",
    hint: "1 cam + 2 plastik + 1 kumas, forge ile cam gerekir",
    cost: { glass: 1, plastic: 2, cloth: 1 },
    requires: (scene) => scene.hasForge && !scene.hasDiveMask,
    requiresText: "Basit Forge gerekli veya dalis maskesi zaten hazir",
    apply: (scene) => scene.unlockDiveMask()
  },
  {
    name: "Basit Dalis Tupu",
    hint: "4 hurda + 2 plastik + 2 kumas, maske gerekir",
    cost: { scrap: 4, plastic: 2, cloth: 2 },
    requires: (scene) => scene.hasDiveMask && !scene.hasDiveTank,
    requiresText: "Dalis Maskesi gerekli veya dalis tupu zaten hazir",
    apply: (scene) => scene.unlockDiveTank()
  },
  {
    name: "Su Toplayici",
    hint: "3 dal + 1 ip + 2 plastik",
    cost: { branch: 3, rope: 1, plastic: 2 },
    apply: (scene) => scene.buildWaterCollector()
  },
  {
    name: "Basit Ocak",
    hint: "2 tas + 2 dal",
    cost: { stone: 2, branch: 2 },
    apply: (scene) => scene.buildGrill()
  },
  {
    name: "Yengec Kafesi",
    hint: "2 dal + 2 ip + 1 plastik, capa atiliyken pasif av yapar",
    cost: { branch: 2, rope: 2, plastic: 1 },
    apply: (scene) => scene.buildCrabTrap()
  },
  {
    name: "Kucuk Sandik",
    hint: "3 dal + 1 plastik",
    cost: { branch: 3, plastic: 1 },
    apply: (scene) => scene.addChest()
  },
  {
    name: "Basit Yatak",
    hint: "3 dal + 2 ip + 1 kumas, 1 tayfa kapasitesi",
    cost: { branch: 3, rope: 2, cloth: 1 },
    apply: (scene) => scene.buildBed()
  },
  {
    name: "Basit Direk",
    hint: "2 kutuk + 2 ip + 2 kumas",
    cost: { log: 2, rope: 2, cloth: 2 },
    apply: (scene) => scene.buildMast()
  },
  {
    name: "Basit Yelken",
    hint: "2 kumas + 2 ip + 1 dal, direk gerekir",
    cost: { cloth: 2, rope: 2, branch: 1 },
    requires: (scene) => scene.hasMast && !scene.hasSail,
    requiresText: "Basit Direk gerekli veya yelken zaten kurulu",
    apply: (scene) => scene.buildSail()
  },
  {
    name: "Basit Forge",
    hint: "20 tas + 10 maden + 8 hurda + 4 kutuk, salda cam ve metal islerini acar",
    cost: { stone: 20, ore: 10, scrap: 8, log: 4 },
    unlockWhen: (scene) => scene.getActiveQuest()?.id === "build-forge" || scene.hasForge,
    requires: (scene) => !scene.hasForge && !scene.pendingModules.includes("forge"),
    requiresText: "Forge zaten kurulu veya kuruluyor",
    apply: (scene) => scene.buildForge()
  },
  {
    name: "Su Damitici",
    hint: "2 cam + 3 hurda + 2 plastik, forge gerekir",
    cost: { glass: 2, scrap: 3, plastic: 2 },
    requires: (scene) => scene.hasForge && !scene.hasWaterDist && !scene.pendingModules.includes("waterDist"),
    requiresText: "Forge gerekli veya damıtıcı zaten kurulu",
    apply: (scene) => scene.buildWaterDist()
  },
  {
    name: "Cam Erit",
    hint: "2 kum + 1 kutuk -> 1 cam, forge gerekir",
    cost: { sand: 2, log: 1 },
    requires: (scene) => scene.hasForge,
    requiresText: "Once Basit Forge kur",
    apply: (scene) => {
      scene.inventory.glass = (scene.inventory.glass ?? 0) + 1;
      return true;
    }
  },
  {
    name: "Durbun",
    hint: "2 cam + 2 hurda + 1 kumas, pusula ve direk gerekir",
    cost: { glass: 2, scrap: 2, cloth: 1 },
    requires: (scene) => scene.hasCompass && scene.hasMast && !scene.hasSpyglass,
    requiresText: "Pusula ve Basit Direk gerekli veya durbun zaten hazir",
    apply: (scene) => scene.unlockSpyglass()
  },
  {
    name: "Sal Tamir",
    hint: "1 dal + 1 plastik, uretim kiti gerekir",
    cost: { branch: 1, plastic: 1 },
    requires: (scene) => scene.hasCraftingKit,
    hidden: true,
    apply: (scene) => scene.repairRaft()
  },
  {
    name: "Balik Pisir",
    hint: "1 balik, ocak gerekir",
    cost: { fish: 1 },
    requires: (scene) => scene.hasGrill,
    apply: (scene) => scene.cookFish()
  },
  {
    name: "Et Pisir",
    hint: "1 cig et, ocak gerekir",
    cost: { rawMeat: 1 },
    requires: (scene) => scene.hasGrill,
    requiresText: "Once Basit Ocak kur",
    apply: (scene) => {
      scene.inventory.cookedMeat = (scene.inventory.cookedMeat ?? 0) + 1;
      return true;
    }
  },
  {
    name: "Kopek Baligi Eti Pisir",
    hint: "1 kopek baligi eti, ocak gerekir",
    cost: { sharkMeat: 1 },
    requires: (scene) => scene.hasGrill,
    requiresText: "Once Basit Ocak kur",
    apply: (scene) => {
      scene.inventory.cookedSharkMeat = (scene.inventory.cookedSharkMeat ?? 0) + 1;
      scene.notify("Kopek baligi eti pisirildi.", scene.playerRoot.x, scene.playerRoot.y - 70, "#bff4c7", "good");
      return true;
    }
  },
  {
    name: "Kabuklu Pisir",
    hint: "1 yengec/karides/istakoz, ocak gerekir",
    cost: {},
    requires: (scene) => scene.hasGrill && ((scene.inventory.crab ?? 0) > 0 || (scene.inventory.shrimp ?? 0) > 0 || (scene.inventory.lobster ?? 0) > 0),
    requiresText: "Ocak ve kabuklu av gerekli",
    apply: (scene) => scene.cookShellfish()
  }
];
