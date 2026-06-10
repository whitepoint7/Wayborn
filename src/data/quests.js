const did = (system, action, amount = 1) => system.getActionCount(action) >= amount;
const item = (scene, key, label, required) => ({ label, current: scene.inventory[key] ?? 0, required });
const action = (system, key, label, required = 1) => ({ label, current: system.getActionCount(key), required });

export const QUESTS = [
  {
    id: "learn-inventory",
    title: "Enkazlari incele",
    detail: "Sudan bir malzeme topla ve envanterini ac",
    description: "Denizde suruklenen malzemeler hayatta kalmanin ilk adimidir. Bir kaynak topla ve nelerin sende oldugunu envanterden kontrol et.",
    requirements: (_scene, system) => [
      action(system, "materialCollected", "Sudan kaynak topla"),
      action(system, "inventoryOpened", "Envanteri ac")
    ],
    actions: ["materialCollected", "inventoryOpened"],
    isComplete: (_scene, system) => did(system, "materialCollected") && did(system, "inventoryOpened"),
    reward: { morale: 2 }
  },
  {
    id: "craft-flask",
    craftName: "Basit Matara",
    title: "Basit matara yap",
    detail: "Uretim ekranindan Basit Matara uret",
    description: "Su hayati onem tasir. Limandan veya saldaki su toplayicidan aldigin suyu tasiyabilmek icin bir mataraya ihtiyacin var.",
    requirements: (scene) => [
      item(scene, "plastic", "Plastik", 2),
      item(scene, "leaf", "Yaprak", 1)
    ],
    isComplete: (scene) => scene.hasFlask,
    reward: { leaf: 1 }
  },
  {
    id: "craft-kit",
    craftName: "Uretim Kiti",
    title: "Uretim kitini hazirla",
    detail: "Sal yapilari, ileri uretim ve tamir icin Uretim Kiti yap",
    description: "Uretim Kiti sal yapilarini, aletleri ve tamiri acan temel ekipmandir.",
    requirements: (scene) => [
      item(scene, "branch", "Dal", 1),
      item(scene, "leaf", "Yaprak", 1),
      item(scene, "plastic", "Plastik", 1)
    ],
    isComplete: (scene) => scene.hasCraftingKit,
    reward: { branch: 2, leaf: 1 }
  },
  {
    id: "craft-torch",
    craftName: "Basit Mesale",
    title: "Geceye hazirlan",
    detail: "Karanlikta yolunu bulmak icin Basit Mesale uret",
    description: "Geceleri gorus ciddi bicimde azalir. Basit bir mesale adalarda ve denizde yonunu bulmani kolaylastirir.",
    requirements: (scene) => [item(scene, "branch", "Dal", 1), item(scene, "leaf", "Yaprak", 2)],
    isComplete: (scene) => scene.hasTorch,
    reward: { morale: 2 }
  },
  {
    id: "explore-island",
    title: "Bir adayi kesfet",
    detail: "Karaya cik, kaynak topla ve bir dusmani yen",
    description: "Adalar yiyecek, tas ve diger kara kaynaklarini bulabilecegin yerlerdir. Ancak yilan ve akrep gibi tehditlere hazir ol.",
    actions: ["visitedIsland", "islandResourceCollected", "islandEnemyDefeated"],
    requirements: (_scene, system) => [
      action(system, "visitedIsland", "Adaya cik"),
      action(system, "islandResourceCollected", "Ada kaynagi topla", 3),
      action(system, "islandEnemyDefeated", "Dusman yen")
    ],
    isComplete: (_scene, system) => did(system, "visitedIsland") && did(system, "islandResourceCollected", 3) && did(system, "islandEnemyDefeated"),
    reward: { fruit: 1, gold: 5, morale: 3 }
  },
  {
    id: "shore-dive",
    title: "Sig suya dal",
    detail: "Ada yakininda capa at, sig suya dal ve bir kaynak topla",
    description: "Ada kiyilarindaki sig sular ilk dalislar icin uygundur. Capa atarak salin suruklenmesini engelle ve oksijenini dikkatle kullan.",
    actions: ["shoreDive", "shallowResourceCollected"],
    requirements: (_scene, system) => [
      action(system, "shoreDive", "Sig suya dal"),
      action(system, "shallowResourceCollected", "Su alti kaynagi topla")
    ],
    isComplete: (_scene, system) => did(system, "shoreDive") && did(system, "shallowResourceCollected"),
    reward: { morale: 2 }
  },
  {
    id: "craft-axe",
    craftName: "Basit Balta",
    title: "Basit balta yap",
    detail: "Adalardaki agaclari kesmek icin Basit Balta uret",
    description: "Kumsalda buldugun dallar yetmeyecek. Kutuk ve daha fazla yaprak elde etmek icin agac kesebilmelisin.",
    requirements: (scene) => [
      item(scene, "branch", "Dal", 2),
      item(scene, "stone", "Tas", 1),
      item(scene, "rope", "Ip", 1)
    ],
    isComplete: (scene) => scene.hasAxe,
    reward: { morale: 2 }
  },
  {
    id: "chop-tree",
    title: "Bir agac kes",
    detail: "Basit Balta ile adada bir agac kes",
    description: "Agaclar kutuk, dal ve yaprak verir. Yanina yaklasip saldiri dugmesini kullan.",
    actions: ["treeChopped"],
    requirements: (_scene, system) => [action(system, "treeChopped", "Agac kes")],
    isComplete: (_scene, system) => did(system, "treeChopped"),
    reward: { branch: 2, leaf: 2 }
  },
  {
    id: "craft-pickaxe",
    craftName: "Basit Kazma",
    title: "Basit kazma yap",
    detail: "Maden damarlarini kazmak icin Basit Kazma uret",
    description: "Maden ve tas, ileri uretimin temelidir. Damarlari kazabilmek icin once uygun bir alet hazirla.",
    requirements: (scene) => [
      item(scene, "branch", "Dal", 2),
      item(scene, "stone", "Tas", 2),
      item(scene, "rope", "Ip", 1)
    ],
    isComplete: (scene) => scene.hasPickaxe,
    reward: { morale: 2 }
  },
  {
    id: "mine-vein",
    title: "Bir maden damari kaz",
    detail: "Adada veya su altinda bir maden damarini kaz",
    description: "Maden damarlari gevsek kaynaklardan daha degerlidir. Kazmayla bir damari tamamen parcala.",
    actions: ["oreMined"],
    requirements: (_scene, system) => [action(system, "oreMined", "Maden damari kaz")],
    isComplete: (_scene, system) => did(system, "oreMined"),
    reward: { stone: 2, morale: 2 }
  },
  {
    id: "expand-raft",
    craftName: "Sal Parcasi",
    title: "Sali buyut",
    detail: "Bir Sal Parcasi uret ve sala yerlestir",
    actions: ["raftPiecePlaced"],
    isComplete: (_scene, system) => did(system, "raftPiecePlaced"),
    reward: { plastic: 1, morale: 2 }
  },
  {
    id: "learn-fishing",
    craftName: "Basit Olta",
    title: "Balikciligi ogren",
    detail: "Basit Olta uret ve balik tutma mini-game'inde bir sey yakala",
    actions: ["caughtFish"],
    isComplete: (scene, system) => scene.hasFishingRod && did(system, "caughtFish"),
    reward: { bait: 1 }
  },
  {
    id: "place-crab-trap",
    craftName: "Yengec Kafesi",
    title: "Yengec kafesi kur",
    detail: "Sala bir Yengec Kafesi yerlestir",
    description: "Capa atiliyken yengec kafesi zamanla yengec, karides veya istakoz yakalayabilir. Bu, aktif balikciliga alternatif bir erzak kaynagidir.",
    actions: ["crabTrapPlaced"],
    requirements: (scene, system) => [
      item(scene, "branch", "Dal", 2),
      item(scene, "rope", "Ip", 2),
      item(scene, "plastic", "Plastik", 1),
      { label: "Kafesi sala yerlestir", current: Math.max(scene.crabTrapCount ?? 0, system.getActionCount("crabTrapPlaced")), required: 1 }
    ],
    isComplete: (scene, system) => (scene.crabTrapCount ?? 0) > 0 || did(system, "crabTrapPlaced"),
    reward: { bait: 1, morale: 2 }
  },
  {
    id: "place-grill",
    craftName: "Basit Ocak",
    title: "Basit ocak kur",
    detail: "Sal duzenleme ekranindan Basit Ocak yerlestir",
    actions: ["grillPlaced"],
    isComplete: (_scene, system) => did(system, "grillPlaced"),
    reward: { morale: 2 }
  },
  {
    id: "cook-fish",
    title: "Balik pisir",
    detail: "Basit Ocak ile bir balik pisir",
    actions: ["fishCooked"],
    isComplete: (_scene, system) => did(system, "fishCooked"),
    reward: { gold: 4 }
  },
  {
    id: "fight-shark",
    craftName: "Basit Zipkin",
    title: "Kendini savun",
    detail: "Basit Zipkin uret ve bir kopek baligina saldir",
    actions: ["sharkAttacked"],
    onActivate: (scene) => scene.ensureTutorialShark(),
    isComplete: (scene, system) => scene.hasHarpoon && did(system, "sharkAttacked"),
    reward: { morale: 3 }
  },
  {
    id: "find-port-and-trade",
    title: "Bir liman bul ve ticaret yap",
    detail: "Bir limana gir, bir urun sat ve bir urun al",
    actions: ["visitedPort", "soldItem", "boughtItem"],
    isComplete: (_scene, system) => did(system, "visitedPort") && did(system, "soldItem") && did(system, "boughtItem"),
    reward: { gold: 14, morale: 2 }
  },
  {
    id: "learn-contracts",
    title: "Bir liman gorevi tamamla",
    detail: "Limandan bir kontrat al ve teslim et",
    actions: ["contractAccepted", "contractCompleted"],
    onActivate: (scene) => {
      if (!scene.currentPort) return;
      scene.ensurePortContracts(scene.currentPort);
      scene.renderTradeModal();
    },
    isComplete: (_scene, system) => did(system, "contractAccepted") && did(system, "contractCompleted"),
    reward: { gold: 12, morale: 2 }
  },
  {
    id: "place-net",
    craftName: "Toplama Agi",
    title: "Toplama agi kur",
    detail: "Sala bir Toplama Agi tak",
    actions: ["netPlaced"],
    isComplete: (_scene, system) => did(system, "netPlaced"),
    reward: { rope: 1 }
  },
  {
    id: "use-chest",
    craftName: "Kucuk Sandik",
    title: "Erzaklari depola",
    detail: "Bir Kucuk Sandik kur ve icine bir nesne koy",
    actions: ["chestPlaced", "itemStored"],
    isComplete: (_scene, system) => did(system, "chestPlaced") && did(system, "itemStored"),
    reward: { plastic: 1 }
  },
  {
    id: "place-beam",
    craftName: "Baglanti Kirisi",
    title: "Baglanti kirisi kur",
    detail: "Bir Baglanti Kirisi uret ve sala yerlestir",
    actions: ["beamPlaced"],
    isComplete: (_scene, system) => did(system, "beamPlaced"),
    reward: { branch: 2 }
  },
  {
    id: "place-water-collector",
    craftName: "Su Toplayici",
    title: "Yagmur suyunu topla",
    detail: "Bir Su Toplayici yap ve sala yerlestir",
    actions: ["waterCollectorPlaced"],
    isComplete: (_scene, system) => did(system, "waterCollectorPlaced"),
    reward: { morale: 2 }
  },
  {
    id: "place-bed",
    craftName: "Basit Yatak",
    title: "Tayfaya yer hazirla",
    detail: "Bir Basit Yatak yap ve sala yerlestir",
    actions: ["bedPlaced"],
    isComplete: (_scene, system) => did(system, "bedPlaced"),
    reward: { cloth: 1 }
  },
  {
    id: "find-sand",
    title: "Cam icin kum bul",
    detail: "Bir adada Kum bul ve topla",
    actions: ["sandFound"],
    isComplete: (_scene, system) => did(system, "sandFound"),
    reward: { sand: 1 }
  },
  {
    id: "find-ore",
    title: "Maden damari bul",
    detail: "Bir adada ham maden bul ve topla",
    actions: ["foundIslandOre"],
    isComplete: (_scene, system) => did(system, "foundIslandOre"),
    reward: { morale: 2 }
  },
  {
    id: "build-forge",
    craftName: "Basit Forge",
    title: "Basit forge kur",
    detail: "20 tas, 10 maden, 8 hurda ve 4 kutuk ile Basit Forge yap",
    isComplete: (scene) => scene.hasForge,
    reward: { morale: 4 }
  },
  {
    id: "make-glass",
    title: "Ilk cami erit",
    detail: "Forge ile bir Cam Erit",
    actions: ["glassCrafted"],
    isComplete: (_scene, system) => did(system, "glassCrafted"),
    reward: { gold: 6 }
  },
  {
    id: "make-compass",
    craftName: "Pusula",
    title: "Pusula yap",
    detail: "Haritada hedef takibi yapabilmek icin Pusula uret",
    isComplete: (scene) => scene.hasCompass,
    reward: { morale: 2 }
  },
  {
    id: "follow-port",
    title: "Bir limani takip et",
    detail: "Haritadan bir limani takibe al ve pusulayi izleyerek limana ulas",
    actions: ["portReachedWhileFollowing"],
    isComplete: (_scene, system) => did(system, "portReachedWhileFollowing"),
    reward: { gold: 8 }
  },
  {
    id: "place-mast",
    craftName: "Basit Direk",
    title: "Basit direk kur",
    detail: "Yelken ve durbun icin Basit Direk yap ve yerlestir",
    actions: ["mastPlaced"],
    isComplete: (_scene, system) => did(system, "mastPlaced"),
    reward: { rope: 1 }
  },
  {
    id: "make-spyglass",
    craftName: "Durbun",
    title: "Durbun yap",
    detail: "Hedeflerin mesafesini daha iyi okumak icin Durbun uret",
    isComplete: (scene) => scene.hasSpyglass,
    reward: { morale: 2 }
  },
  {
    id: "place-sail",
    craftName: "Basit Yelken",
    title: "Yelken ac",
    detail: "Basit Yelken yap ve direge yerlestir",
    isComplete: (scene) => scene.hasSail,
    reward: { morale: 3 }
  },
  {
    id: "recruit-survivor",
    title: "Bir kazazedeyi kurtar",
    detail: "Denizde bir kazazede bul ve bos yataga al",
    actions: ["survivorRecruited"],
    isComplete: (_scene, system) => did(system, "survivorRecruited"),
    reward: { gold: 10 }
  },
  {
    id: "make-dive-mask",
    craftName: "Dalis Maskesi",
    title: "Dalis maskesi yap",
    detail: "Resifleri daha guvenli kesfetmek icin Dalis Maskesi uret",
    isComplete: (scene) => scene.hasDiveMask,
    reward: { morale: 3 }
  },
  {
    id: "dive-reef",
    title: "Bir resifi kesfet",
    detail: "Dalis maskenle bir Resif bolgesinde dalis yap",
    actions: ["reefDived"],
    onActivate: (scene) => scene.ensureTutorialDiveZone("reef"),
    isComplete: (_scene, system) => did(system, "reefDived"),
    reward: { coral: 1, morale: 3 }
  },
  {
    id: "make-dive-tank",
    craftName: "Basit Dalis Tupu",
    title: "Dalis tupu yap",
    detail: "Derin sulari kesfetmek icin Basit Dalis Tupu uret",
    isComplete: (scene) => scene.hasDiveTank,
    reward: { gold: 12 }
  },
  {
    id: "dive-deep",
    title: "Derin sulara dal",
    detail: "Dalis tupunle bir Derin Su bolgesinde dalis yap",
    actions: ["deepDived"],
    onActivate: (scene) => scene.ensureTutorialDiveZone("deep"),
    isComplete: (_scene, system) => did(system, "deepDived"),
    reward: { ore: 2, gold: 12 }
  },
  {
    id: "reach-meridia",
    title: "Meridia'ya git",
    detail: "Haritada isaretlenen Meridia sehrine ulas",
    actions: ["visitedCity"],
    onActivate: (scene) => scene.revealMeridiaForQuest(),
    isComplete: (_scene, system) => did(system, "visitedCity"),
    reward: { gold: 20, morale: 5 }
  }
];
