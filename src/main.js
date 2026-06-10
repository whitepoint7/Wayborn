import Phaser from "phaser";
import "./styles.css";
import {
  MAX_RAFT_COLUMNS,
  MAX_RAFT_ROWS,
  MAX_CHUNK_DISTANCE,
  RAFT_MAX_X,
  RAFT_MAX_Y,
  RAFT_MIN_X,
  RAFT_MIN_Y,
  RENDER_RESOLUTION,
  WORLD_SIZE
} from "./data/config.js";
import { SAIL_TYPES, SEA_STATES, WEATHER_STATES } from "./data/environment.js";
import { DRIFT_TYPES, INVENTORY_KEYS, ITEM_LABELS } from "./data/items.js";
import { DRIFT_LOOT_BY_BAND, getIslandArchetype, ISLAND_ARCHETYPES } from "./data/loot.js";
import { MODULE_TYPES } from "./data/raft-modules.js";
import { STATIC_CITIES } from "./data/world.js";
import { ContractSystem } from "./systems/contract-system.js";
import { CrewSystem } from "./systems/crew-system.js";
import { CraftSystem } from "./systems/craft-system.js";
import { DIVE_SITES, DivingSystem } from "./systems/diving-system.js";
import { DiscoverySystem } from "./systems/discovery-system.js";
import { FISHING_GEAR, FishingSystem } from "./systems/fishing-system.js";
import { InventorySystem } from "./systems/inventory-system.js";
import { IslandSystem } from "./systems/island-system.js";
import { QUESTS, QuestSystem } from "./systems/quest-system.js";
import { RaftSystem } from "./systems/raft-system.js";
import { SaveSystem } from "./systems/save-system.js";
import { ThreatSystem } from "./systems/threat-system.js";
import { BAIT_PRICE, TRADE_GOODS, TradeSystem } from "./systems/trade-system.js";
import { WeatherSystem } from "./systems/weather-system.js";
import { WorldSystem } from "./systems/world-system.js";
import { TimeSystem } from "./systems/time-system.js";
import { registerGeneratedTextures } from "./systems/generated-texture-system.js";
import { createSeededRandom, hashSeed, makeSeedCode, normalizeSeed } from "./systems/seeded-random.js";
import { IslandScene } from "./scenes/island-scene.js";
import { CityScene } from "./scenes/city-scene.js";
import { UnderwaterScene } from "./scenes/underwater-scene.js";
import { ActionMenuUI, createDomButton } from "./ui/action-menu-ui.js";
import { DiscoveryUI } from "./ui/discovery-ui.js";
import { CraftUI } from "./ui/craft-ui.js";
import { CityUI } from "./ui/city-ui.js";
import { CrewUI } from "./ui/crew-ui.js";
import { GameplayModalsUI } from "./ui/gameplay-modals-ui.js";
import { HudUI } from "./ui/hud-ui.js";
import { InventoryUI } from "./ui/inventory-ui.js";
import { RaftEditorUI } from "./ui/raft-editor-ui.js";
import { TradeUI } from "./ui/trade-ui.js";

const CRAB_TRAP_LOOT = [
  { key: "crab", label: "Yengec", weight: 44 },
  { key: "shrimp", label: "Karides", weight: 28 },
  { key: "lobster", label: "Istakoz", weight: 8 },
  { key: "plastic", label: "Plastik", weight: 10 },
  { key: null, label: "", weight: 10 }
];

class WaybornScene extends Phaser.Scene {
  constructor() {
    super("wayborn");
    this.inventory = Object.fromEntries(INVENTORY_KEYS.map((key) => [key, 0]));
    this.storage = Object.fromEntries(INVENTORY_KEYS.map((key) => [key, 0]));
    this.fishingSystem = new FishingSystem(this);
    this.divingSystem = new DivingSystem(this);
    this.discoverySystem = new DiscoverySystem(this, { worldSize: WORLD_SIZE });
    this.contractSystem = new ContractSystem(this, { worldSize: WORLD_SIZE });
    this.craftSystem = new CraftSystem(this);
    this.crewSystem = new CrewSystem(this, { worldSize: WORLD_SIZE });
    this.tradeSystem = new TradeSystem(this, { itemLabels: ITEM_LABELS, inventoryKeys: INVENTORY_KEYS });
    this.islandSystem = new IslandSystem(this, { itemLabels: ITEM_LABELS });
    this.threatSystem = new ThreatSystem(this, { worldSize: WORLD_SIZE });
    this.worldSystem = new WorldSystem(this, { worldSize: WORLD_SIZE });
    this.inventorySystem = new InventorySystem(this, { itemLabels: ITEM_LABELS, inventoryKeys: INVENTORY_KEYS });
    this.questSystem = new QuestSystem(this);
    this.weatherSystem = new WeatherSystem(this);
    this.timeSystem = new TimeSystem(this);
    this.saveSystem = new SaveSystem(this);
    this.discoveryUI = new DiscoveryUI(this);
    this.actionMenuUI = new ActionMenuUI(this);
    this.craftUI = new CraftUI(this);
    this.cityUI = new CityUI(this);
    this.crewUI = new CrewUI(this);
    this.gameplayModalsUI = new GameplayModalsUI(this);
    this.hudUI = new HudUI(this);
    this.inventoryUI = new InventoryUI(this, { inventoryKeys: INVENTORY_KEYS, itemLabels: ITEM_LABELS });
    this.raftEditorUI = new RaftEditorUI(this, { itemLabels: ITEM_LABELS, moduleTypes: MODULE_TYPES });
    this.tradeUI = new TradeUI(this, { baitPrice: BAIT_PRICE, tradeGoods: TRADE_GOODS, itemLabels: ITEM_LABELS });
    this.stats = { hp: 100, thirst: 100, hunger: 100, morale: 55 };
    this.gold = 0;
    this.raftIntegrity = 100;
    this.isGameOver = false;
    this.isAnchored = false;
    this.isOnIsland = false;
    this.nearIsland = null;
    this.nearPort = null;
    this.nearCity = null;
    this.nearSurvivor = null;
    this.currentIsland = null;
    this.currentPort = null;
    this.currentCity = null;
    this.portContracts = [];
    this.discoveries = [];
    this.followedDiscoveryId = null;
    this.debugFollowWithoutCompass = false;
    this.islandRestCount = 0;
    this.eventEntries = [];
    this.hasSeenIntroLog = false;
    this.worldSeed = normalizeSeed(`${Date.now()}-${Math.random()}`);
    this.worldSeedCode = makeSeedCode(this.worldSeed);
    this.questIndex = 0;
    this.questProgress = {};
    this.questFlags = {
      caughtFish: false,
      visitedIsland: false,
      foundIslandScrap: false,
      foundIslandOre: false,
      forgeRecipeUnlocked: false,
      shoreDive: false,
      visitedPort: false,
      visitedCity: false,
      soldFish: false
    };
    this.needWarnings = { hunger: false, thirst: false };
    this.lastInventoryFullToast = 0;
    this.hudClickBlockedUntil = 0;
    this.fullscreenResizeTimer = null;
    this.fullscreenListenerAttached = false;
    this.raftLevel = 1;
    this.raftLimitLevel = 0;
    this.pendingRaftPieces = 0;
    this.pendingNets = 0;
    this.pendingBeams = 0;
    this.pendingModules = [];
    this.pendingBuildRefunds = [];
    this.placingRaft = false;
    this.placingNet = false;
    this.placingBeam = false;
    this.placingModule = false;
    this.movingModuleFrom = null;
    this.movingNetFrom = null;
    this.raftEditMode = "build";
    this.raftEditLayer = "module";
    this.raftEditSelection = null;
    this.selectedRaftBuildCraft = null;
    this.raftTileSize = 32;
    this.raftComposite = null;
    this.raftTiles = [
      { x: -1, y: 0, hp: 2 },
      { x: 0, y: 0, hp: 3, beamHp: 3 },
      { x: 1, y: 0, hp: 2 }
    ];
    this.raftSystem = new RaftSystem(this, {
      moduleTypes: MODULE_TYPES,
      maxColumns: MAX_RAFT_COLUMNS,
      maxRows: MAX_RAFT_ROWS
    });
    this.placementMarkerNodes = [];
    this.netVisuals = [];
    this.chests = 0;
    this.beds = 0;
    this.crew = [];
    this.storagePerChest = 24;
    this.moduleCount = 0;
    this.baseCarryCapacity = 34;
    this.hasCompass = false;
    this.hasMast = false;
    this.hasSail = false;
    this.sailHp = 0;
    this.hasSpyglass = false;
    this.hasWaterCollector = false;
    this.hasWaterDist = false;
    this.waterDistTimer = 0;
    this.waterReserve = 0;
    this.maxWaterReserve = 5;
    this.crabTrapCount = 0;
    this.crabTrapTimer = 0;
    this.lastCrabTrapPauseLog = 0;
    this.hasFlask = false;
    this.flaskWater = 0;
    this.maxFlaskWater = 2;
    this.hasGrill = false;
    this.hasForge = false;
    this.forgeLegacyUnlocked = false;
    this.hasCraftingKit = false;
    this.hasTorch = false;
    this.hasAxe = false;
    this.hasPickaxe = false;
    this.hasFishingRod = false;
    this.fishingLineLevel = 0;
    this.fishingRodLevel = 0;
    this.fishingBait = 0;
    this.hasHarpoon = false;
    this.hasDiveMask = false;
    this.hasDiveTank = false;
    this.torchGlow = null;
    this.torchFlame = null;
    this.fishingState = null;
    this.diveState = null;
    this.diveCooldownUntil = 0;
    this.diveFatigue = 0;
    this.lastDiveAreaKey = "";
    this.diveAreaPressure = {};
    this.windEnabled = true;
    this.wind = new Phaser.Math.Vector2(0.45, -0.2);
    this.windPower = 0.24;
    this.lastWindLogPower = this.windPower;
    this.weatherState = "sunny";
    this.seaState = "calm";
    this.worldDay = 1;
    this.dayProgress = 0.34;
    this.lastDayProgress = this.dayProgress;
    this.isNight = false;
    this.weatherPlan = null;
    this.lastWeatherLog = "";
    this.sailingAlignment = 0;
    this.velocity = new Phaser.Math.Vector2();
    this.joystick = { active: false, base: null, knob: null, vector: new Phaser.Math.Vector2() };
  }

  preload() {
    const raftAssets = {
      "raft-plank": "/assets/ui/raft/plank.png",
      "raft-net": "/assets/ui/raft/net.png",
      "raft-beam": "/assets/ui/raft/beam.png",
      "module-waterCollector": "/assets/ui/raft/water-collector.png",
      "module-crabTrap": "/assets/ui/raft/net.png",
      "module-grill": "/assets/ui/raft/grill.png",
      "module-forge": "/assets/ui/raft/forge.png",
      "module-waterDist": "/assets/ui/raft/water-dist.png",
      "module-chest": "/assets/ui/raft/chest.png",
      "module-bed": "/assets/ui/raft/bed.png",
      "module-mast": "/assets/ui/raft/mast.png",
      "module-sail": "/assets/ui/raft/sail.png"
    };
    Object.entries(raftAssets).forEach(([key, path]) => this.load.image(key, path));

    const itemAssets = {
      "item-branch": "/assets/items/branch.png",
      "item-leaf": "/assets/items/leaf.png?v=2",
      "item-plastic": "/assets/items/plastic.png?v=2",
      "item-log": "/assets/items/log.png",
      "item-ore": "/assets/items/ore.png",
      "item-sand": "/assets/items/sand.png",
      "item-stone": "/assets/items/stone.png",
      "item-scrap": "/assets/items/scrap.png?v=1",
      "item-rope": "/assets/items/string.png",
      "item-cloth": "/assets/items/cloth.png",
      "item-coral": "/assets/items/coral.png",
      "island-log": "/assets/items/log.png",
      "island-ore": "/assets/items/ore.png",
      "island-sand": "/assets/items/sand.png",
      "island-stone": "/assets/items/stone.png",
      "island-scrap": "/assets/items/scrap.png?v=1",
      "island-coral": "/assets/items/coral.png",
      "hazard-thorn": "/assets/items/torn.png",
      "island-palm-left": "/assets/items/palm-left.png",
      "island-palm-right": "/assets/items/palm-right.png",
      "island-banana-tree": "/assets/items/banana-tree.png",
      "hazard-snake-left": "/assets/enemy/snake-left.png",
      "hazard-snake-right": "/assets/enemy/snake-right.png",
      "hazard-scorpion-left": "/assets/enemy/scorpion-left.png",
      "hazard-scorpion-right": "/assets/enemy/scorpion-right.png",
      "world-island": "/assets/ui/statics/island.png",
      "world-port": "/assets/ui/statics/lighthouse.png",
      "world-city": "/assets/ui/statics/city.png",
      "island-mine": "/assets/environment/nodes/mine.png",
      "underwater-seaweed-short": "/assets/environment/underwater/short-seaweed.png",
      "underwater-seaweed-long": "/assets/environment/underwater/long-seaweed.png"
    };
    Object.entries(itemAssets).forEach(([key, path]) => this.load.image(key, path));
  }

  create() {
    registerGeneratedTextures(this);
    this.createOcean();
    this.createPlayer();
    this.createCollections();
    this.createHud();
    this.createTouchControls();
    this.createKeyboardControls();
    this.createWorldObjects();
    this.createFullscreenResizeHandler();

    this.cameras.main.startFollow(this.playerRoot, true, 0.12, 0.12);
    this.cameras.main.setBounds(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);
    this.time.addEvent({ delay: 6000, loop: true, callback: () => this.spawnDriftItem() });
    this.time.addEvent({ delay: 6500, loop: true, callback: () => this.changeWeatherBeat() });
    this.time.addEvent({ delay: 4000, loop: true, callback: () => this.passiveSurvivalTick() });
    this.time.addEvent({
      delay: 90000,
      loop: true,
      callback: () => {
        if (this.survivors.getLength() < 2 && Phaser.Math.Between(1, 100) <= 18) this.crewSystem.spawnSurvivor();
      }
    });
  }

  createOcean() {
    this.add.rectangle(0, 0, WORLD_SIZE, WORLD_SIZE, 0x0b5c78).setDepth(-20);
    this.waveLayer = this.add.group();

    for (let i = 0; i < 220; i += 1) {
      const x = Phaser.Math.Between(-WORLD_SIZE / 2, WORLD_SIZE / 2);
      const y = Phaser.Math.Between(-WORLD_SIZE / 2, WORLD_SIZE / 2);
      const wave = this.add.ellipse(x, y, Phaser.Math.Between(28, 82), 7, 0x9fdddf, 0.18);
      wave.setRotation(Phaser.Math.FloatBetween(-0.2, 0.2));
      this.waveLayer.add(wave);
    }
    this.nightOverlay = this.add.rectangle(0, 0, 4, 4, 0x03101c, 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(40)
      .setAlpha(0);
    this.scale.on("resize", (size) => this.nightOverlay?.setSize(size.width, size.height));
    this.nightOverlay.setSize(this.scale.width, this.scale.height);
  }

  createPlayer() {
    this.playerRoot = this.add.container(0, 0).setDepth(10);
    this.raftBody = this.add.group();
    this.placeMarkers = this.add.group();
    this.drawRaft();

    this.sail = null;
    this.drawSail();

    this.hero = this.add.image(2, 2, "hero");
    this.hero.setDisplaySize(24, 24);
    this.playerRoot.add(this.hero);
    this.createTorchVisuals();
  }

  createTorchVisuals() {
    if (!this.playerRoot || this.torchGlow) return;
    this.torchGlow = this.add.circle(0, 0, 96, 0xffb45f, 0.14);
    this.torchGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.torchGlow.setVisible(false);
    this.torchFlame = this.add.circle(13, -7, 4, 0xffb45f, 0.95);
    this.torchFlame.setStrokeStyle(1, 0xfff0aa, 0.82);
    this.torchFlame.setVisible(false);
    this.playerRoot.addAt(this.torchGlow, 0);
    this.playerRoot.add(this.torchFlame);
  }

  updateTorchVisual(nightAlpha = 0) {
    this.createTorchVisuals();
    const visible = Boolean(this.hasTorch && this.isNight && nightAlpha > 0.18);
    this.torchGlow?.setVisible(visible);
    this.torchFlame?.setVisible(Boolean(this.hasTorch));
    if (!visible || !this.torchGlow) return;
    const pulse = 0.11 + Math.sin(this.time.now * 0.008) * 0.025;
    this.torchGlow.setAlpha(Phaser.Math.Clamp(pulse + nightAlpha * 0.06, 0.1, 0.22));
    this.torchGlow.setScale(1 + Math.sin(this.time.now * 0.006) * 0.04);
  }

  drawRaft() {
    [...this.raftBody.getChildren()].forEach((child) => child.destroy());
    this.raftBody.clear();
    this.raftComposite = null;
    const tileSize = this.raftTileSize;
    const bounds = this.getRaftCompositeBounds();
    const raftTexture = this.add.renderTexture(
      bounds.minX + bounds.width / 2,
      bounds.minY + bounds.height / 2,
      bounds.width,
      bounds.height
    );
    raftTexture.setOrigin(0.5);
    this.raftComposite = raftTexture;
    this.raftBody.add(raftTexture);
    this.playerRoot.add(raftTexture);

    this.raftTiles.forEach((tile) => {
      const x = tile.x * tileSize + bounds.offsetX;
      const y = tile.y * tileSize + bounds.offsetY;
      if (tile.netHp > 0) {
        this.drawRaftAssetToTexture(raftTexture, "raft-net", x, y, tileSize, tile.netHp > 1 ? 0.88 : 0.62);
      }
      const plankKey = (tile.hp ?? this.getMaxTileHp(tile)) <= 1 ? "raft-plank-damaged" : "raft-plank";
      this.drawRaftAssetToTexture(raftTexture, plankKey, x, y, tileSize);
      if (tile.beamHp > 0) {
        if (this.textures.exists("raft-beam")) {
          this.drawRaftAssetToTexture(raftTexture, "raft-beam", x, y, tileSize, tile.beamHp > 1 ? 0.95 : 0.62);
        } else {
          this.drawRaftAssetToTexture(raftTexture, "raft-beam-h", x, y, tileSize, tile.beamHp > 1 ? 0.95 : 0.62);
          this.drawRaftAssetToTexture(raftTexture, "raft-beam-v", x, y, tileSize, tile.beamHp > 1 ? 0.95 : 0.62);
        }
      }
      if (tile.module) {
        this.drawModuleToRaftTexture(raftTexture, tile, bounds.offsetX, bounds.offsetY);
      }
    });

    this.refreshPlacementMarkers();
    this.bringPlayerPartsToFront();
  }

  getRaftCompositeBounds() {
    const tileSize = this.raftTileSize;
    const padding = tileSize;
    const xs = this.raftTiles.map((tile) => tile.x * tileSize);
    const ys = this.raftTiles.map((tile) => tile.y * tileSize);
    const minX = Math.min(...xs) - padding;
    const maxX = Math.max(...xs) + padding;
    const minY = Math.min(...ys) - padding;
    const maxY = Math.max(...ys) + padding;
    const width = Phaser.Math.Clamp(Math.ceil(maxX - minX + tileSize), tileSize * 3, tileSize * (MAX_RAFT_COLUMNS + 2));
    const height = Phaser.Math.Clamp(Math.ceil(maxY - minY + tileSize), tileSize * 3, tileSize * (MAX_RAFT_ROWS + 2));
    return { minX, minY, width, height, offsetX: -minX, offsetY: -minY };
  }

  drawRaftAssetToTexture(renderTexture, key, x, y, size = this.raftTileSize, alpha = 1) {
    if (!this.textures.exists(key)) return;
    const image = this.make.image({ key, add: false });
    image.setOrigin(0.5);
    image.setDisplaySize(size, size);
    image.setAlpha(alpha);
    renderTexture.draw(image, x, y);
    image.destroy();
  }

  drawModuleToRaftTexture(renderTexture, tile, offsetX, offsetY) {
    const tileSize = this.raftTileSize;
    const x = tile.x * tileSize + offsetX;
    const y = tile.y * tileSize + offsetY;
    const assetKey = `module-${tile.module}`;
    if (this.textures.exists(assetKey)) {
      this.drawRaftAssetToTexture(renderTexture, assetKey, x, y, tileSize, (tile.moduleHp ?? 2) > 1 ? 0.98 : 0.62);
    }
  }

  drawSail() {
    if (!this.playerRoot) return;
    if (this.sail) {
      this.playerRoot.remove(this.sail);
      this.sail.destroy();
      this.sail = null;
    }
    if (!this.hasSail || this.sailHp <= 0) return;
    if (this.textures.exists("module-sail")) {
      this.sail = this.add.image(0, -46, "module-sail");
      this.sail.setDisplaySize(56, 56);
      this.sail.setAlpha(this.sailHp <= 1 ? 0.68 : 0.95);
    } else {
      const sailColor = this.sailHp <= 1 ? 0xd7c5aa : 0xf7f0d8;
      this.sail = this.add.triangle(0, -34, 0, 20, 0, -44, 38, 16, sailColor, 0.95);
      this.sail.setStrokeStyle(2, this.sailHp <= 1 ? 0x8b4a3a : 0x47392f, 0.9);
    }
    this.playerRoot.add(this.sail);
  }

  drawModuleOnTile(tile) {
    const tileSize = this.raftTileSize;
    const x = tile.x * tileSize;
    const y = tile.y * tileSize;
    const module = MODULE_TYPES[tile.module];
    const assetKey = `module-${tile.module}`;
    if (this.textures.exists(assetKey)) {
      const image = this.add.image(x, y, assetKey);
      image.setDisplaySize(tileSize, tileSize);
      image.setAlpha((tile.moduleHp ?? 2) > 1 ? 0.98 : 0.62);
      this.raftBody.add(image);
      this.playerRoot.add(image);
      return;
    }
    const base = this.add.rectangle(x, y - 1, 16, 14, module?.color ?? 0xd9edf0, 0.96);
    base.setStrokeStyle(2, module?.stroke ?? 0xffffff, 0.95);
    this.raftBody.add(base);
    this.playerRoot.add(base);

    if (tile.module === "waterCollector") {
      const drop = this.add.circle(x + 4, y - 4, 3, 0xd9fbff, 0.95);
      this.raftBody.add(drop);
      this.playerRoot.add(drop);
    } else if (tile.module === "crabTrap") {
      const lineA = this.add.rectangle(x, y, 15, 2, 0xffe0a3, 0.95);
      const lineB = this.add.rectangle(x, y, 2, 12, 0xffe0a3, 0.95);
      const bait = this.add.circle(x + 4, y + 2, 3, 0xff8f5a, 0.92);
      this.raftBody.add(lineA);
      this.raftBody.add(lineB);
      this.raftBody.add(bait);
      this.playerRoot.add(lineA);
      this.playerRoot.add(lineB);
      this.playerRoot.add(bait);
    } else if (tile.module === "grill") {
      const flame = this.add.circle(x, y - 4, 4, 0xff9b4a, 0.92);
      this.raftBody.add(flame);
      this.playerRoot.add(flame);
    } else if (tile.module === "chest") {
      const band = this.add.rectangle(x, y - 1, 16, 3, 0x5b3418, 0.82);
      this.raftBody.add(band);
      this.playerRoot.add(band);
    } else if (tile.module === "mast") {
      const pole = this.add.rectangle(x, y - 8, 4, 24, 0xf0d0a0, 0.96);
      const flag = this.add.triangle(x + 7, y - 16, 0, -7, 0, 7, 13, 0, 0xfff0aa, 0.92);
      flag.setStrokeStyle(1, 0x5b3418, 0.72);
      this.raftBody.add(pole);
      this.raftBody.add(flag);
      this.playerRoot.add(pole);
      this.playerRoot.add(flag);
    } else if (tile.module === "bed") {
      const pillow = this.add.rectangle(x - 4, y - 5, 6, 5, 0xd8ecff, 0.96);
      const blanket = this.add.rectangle(x + 3, y + 3, 11, 7, 0x6b8ebd, 0.96);
      this.raftBody.add(pillow);
      this.raftBody.add(blanket);
      this.playerRoot.add(pillow);
      this.playerRoot.add(blanket);
    }
  }

  refreshPlacementMarkers() {
    if (!this.placeMarkers) return;
    this.placementMarkerNodes.forEach((child) => child.destroy());
    this.placementMarkerNodes = [];
    [...this.placeMarkers.getChildren()].forEach((child) => child.destroy());
    this.placeMarkers.clear();
    const movingModuleSource = this.movingModuleFrom ? this.getRaftTile(this.movingModuleFrom.x, this.movingModuleFrom.y) : null;
    if (movingModuleSource?.module) {
      this.getModuleMoveCandidates(movingModuleSource).forEach((spot) => {
        const marker = this.add.container(spot.x * this.raftTileSize, spot.y * this.raftTileSize);
        const base = this.add.rectangle(0, 0, 24, 24, 0x7dc7e8, 0.78);
        base.setStrokeStyle(3, 0xecfbff, 1);
        const plus = this.add.text(0, -1, "+", {
          fontSize: "22px",
          fontStyle: "700",
          color: "#ffffff",
          stroke: "#16566f",
          strokeThickness: 3
        }).setOrigin(0.5);
        marker.add([base, plus]);
        marker.meta = spot;
        marker.setInteractive(new Phaser.Geom.Rectangle(-18, -18, 36, 36), Phaser.Geom.Rectangle.Contains);
        marker.on("pointerdown", (pointer) => {
          pointer.event?.stopPropagation();
          this.moveModuleToTile(marker.meta);
        });
        this.placeMarkers.add(marker);
        this.placementMarkerNodes.push(marker);
        this.playerRoot.add(marker);
      });
      return;
    }
    const movingNetSource = this.movingNetFrom ? this.getRaftTile(this.movingNetFrom.x, this.movingNetFrom.y) : null;
    if (movingNetSource?.netHp > 0) {
      this.getNetMoveCandidates(movingNetSource).forEach((spot) => {
        const marker = this.add.container(spot.x * this.raftTileSize, spot.y * this.raftTileSize);
        const base = this.add.rectangle(0, 0, 24, 24, 0xd9b633, 0.8);
        base.setStrokeStyle(3, 0xfff2ad, 1);
        const plus = this.add.text(0, -1, "+", {
          fontSize: "22px",
          fontStyle: "700",
          color: "#fff8cf",
          stroke: "#6f5312",
          strokeThickness: 3
        }).setOrigin(0.5);
        marker.add([base, plus]);
        marker.meta = spot;
        marker.setInteractive(new Phaser.Geom.Rectangle(-18, -18, 36, 36), Phaser.Geom.Rectangle.Contains);
        marker.on("pointerdown", (pointer) => {
          pointer.event?.stopPropagation();
          this.moveNetToTile(marker.meta);
        });
        this.placeMarkers.add(marker);
        this.placementMarkerNodes.push(marker);
        this.playerRoot.add(marker);
      });
      return;
    }
    if (this.placingModule && this.pendingModules.length > 0) {
      this.getModuleCandidates().forEach((spot) => {
        const marker = this.add.container(spot.x * this.raftTileSize, spot.y * this.raftTileSize);
        const base = this.add.rectangle(0, 0, 24, 24, 0x7dc7e8, 0.78);
        base.setStrokeStyle(3, 0xecfbff, 1);
        const plus = this.add.text(0, -1, "+", {
          fontSize: "22px",
          fontStyle: "700",
          color: "#ffffff",
          stroke: "#16566f",
          strokeThickness: 3
        }).setOrigin(0.5);
        marker.add([base, plus]);
        marker.meta = spot;
        marker.setInteractive(new Phaser.Geom.Rectangle(-18, -18, 36, 36), Phaser.Geom.Rectangle.Contains);
        marker.on("pointerdown", (pointer) => {
          pointer.event?.stopPropagation();
          this.placeModuleOnTile(marker.meta);
        });
        this.placeMarkers.add(marker);
        this.placementMarkerNodes.push(marker);
        this.playerRoot.add(marker);
      });
      return;
    }
    if (this.placingNet && this.pendingNets > 0) {
      this.getNetCandidates().forEach((spot) => {
        const marker = this.add.container(spot.x * this.raftTileSize, spot.y * this.raftTileSize);
        const base = this.add.rectangle(0, 0, 24, 24, 0xd9b633, 0.8);
        base.setStrokeStyle(3, 0xfff2ad, 1);
        const plus = this.add.text(0, -1, "+", {
          fontSize: "22px",
          fontStyle: "700",
          color: "#fff8cf",
          stroke: "#6f5312",
          strokeThickness: 3
        }).setOrigin(0.5);
        marker.add([base, plus]);
        marker.meta = spot;
        marker.setInteractive(new Phaser.Geom.Rectangle(-18, -18, 36, 36), Phaser.Geom.Rectangle.Contains);
        marker.on("pointerdown", (pointer) => {
          pointer.event?.stopPropagation();
          this.placeNetOnTile(marker.meta);
        });
        this.placeMarkers.add(marker);
        this.placementMarkerNodes.push(marker);
        this.playerRoot.add(marker);
      });
      return;
    }
    if (this.placingBeam && this.pendingBeams > 0) {
      this.getBeamCandidates().forEach((spot) => {
        const marker = this.add.container(spot.x * this.raftTileSize, spot.y * this.raftTileSize);
        const base = this.add.rectangle(0, 0, 24, 24, 0xb98545, 0.82);
        base.setStrokeStyle(3, 0xffdf9d, 1);
        const plus = this.add.text(0, -1, "+", {
          fontSize: "22px",
          fontStyle: "700",
          color: "#fff3cf",
          stroke: "#6b431d",
          strokeThickness: 3
        }).setOrigin(0.5);
        marker.add([base, plus]);
        marker.meta = spot;
        marker.setInteractive(new Phaser.Geom.Rectangle(-18, -18, 36, 36), Phaser.Geom.Rectangle.Contains);
        marker.on("pointerdown", (pointer) => {
          pointer.event?.stopPropagation();
          this.placeBeamOnTile(marker.meta);
        });
        this.placeMarkers.add(marker);
        this.placementMarkerNodes.push(marker);
        this.playerRoot.add(marker);
      });
      return;
    }
    if (!this.placingRaft || this.pendingRaftPieces <= 0) return;

    this.getBuildCandidates().forEach((spot) => {
      const marker = this.add.container(spot.x * this.raftTileSize, spot.y * this.raftTileSize);
      const base = this.add.rectangle(0, 0, 24, 24, 0x39c878, 0.72);
      base.setStrokeStyle(3, 0xe6fff1, 1);
      const plus = this.add.text(0, -1, "+", {
        fontSize: "22px",
        fontStyle: "700",
        color: "#ffffff",
        stroke: "#0b4a37",
        strokeThickness: 3
      }).setOrigin(0.5);
      marker.add([base, plus]);
      marker.meta = spot;
      marker.setInteractive(new Phaser.Geom.Rectangle(-18, -18, 36, 36), Phaser.Geom.Rectangle.Contains);
      marker.on("pointerdown", (pointer) => {
        pointer.event?.stopPropagation();
        this.placeRaftTile(marker.meta);
      });
      this.placeMarkers.add(marker);
      this.placementMarkerNodes.push(marker);
      this.playerRoot.add(marker);
    });
  }

  bringPlayerPartsToFront() {
    if (!this.playerRoot || !this.hero) return;
    if (this.sail) {
      this.playerRoot.remove(this.sail);
      this.playerRoot.add(this.sail);
    }
    this.playerRoot.remove(this.hero);
    this.playerRoot.add(this.hero);
  }

  getBuildCandidates() {
    return this.raftSystem.getBuildCandidates();
  }

  getNetCandidates() {
    return this.raftSystem.getNetCandidates();
  }

  getModuleCandidates() {
    return this.raftSystem.getModuleCandidates();
  }

  getBeamTiles(tiles = this.raftTiles) {
    return this.raftSystem.getBeamTiles(tiles);
  }

  getBeamCandidates() {
    return this.raftSystem.getBeamCandidates();
  }

  getBeamMoveCandidates(source) {
    return this.raftSystem.getBeamMoveCandidates(source);
  }

  areRaftTilesSupported(tiles = this.raftTiles) {
    return this.raftSystem.areTilesSupported(tiles);
  }

  getModuleMoveCandidates(source) {
    return this.raftSystem.getModuleMoveCandidates(source);
  }

  getNetMoveCandidates(source) {
    return this.raftSystem.getNetMoveCandidates(source);
  }

  getRaftTile(x, y) {
    return this.raftTiles.find((tile) => tile.x === x && tile.y === y);
  }

  isWithinRaftBounds(x, y) {
    return this.raftSystem.isWithinBounds(x, y);
  }

  canRemoveRaftTile(tile) {
    if (!tile || this.isStartingRaftTile(tile) || tile.module || tile.netHp > 0 || tile.beamHp > 0) return false;
    const remaining = this.raftTiles.filter((candidate) => candidate !== tile);
    return this.isRaftConnected(remaining) && this.areRaftTilesSupported(remaining);
  }

  canMoveRaftTile(tile) {
    return Boolean(tile) && !this.isStartingRaftTile(tile) && !tile.module && !(tile.netHp > 0) && !(tile.beamHp > 0);
  }

  getRaftTileMoveCandidates(tile) {
    if (!this.canMoveRaftTile(tile)) return [];
    const remaining = this.raftTiles.filter((candidate) => candidate !== tile);
    if (!this.isRaftConnected(remaining)) return [];
    const occupied = new Set(remaining.map((candidate) => this.tileKey(candidate.x, candidate.y)));
    const candidates = new Map();
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    remaining.forEach((candidate) => {
      directions.forEach((dir) => {
        const x = candidate.x + dir.x;
        const y = candidate.y + dir.y;
        const key = this.tileKey(x, y);
        if (!occupied.has(key) && this.isWithinRaftBounds(x, y)) candidates.set(key, { x, y });
      });
    });
    return Array.from(candidates.values()).filter((candidate) => {
      const moved = remaining.concat([{ ...tile, x: candidate.x, y: candidate.y }]);
      return this.isRaftConnected(moved) && this.areRaftTilesSupported(moved);
    });
  }

  moveRaftTileTo(tile, target) {
    const source = this.getRaftTile(tile.x, tile.y);
    if (!source || !this.canRaftEditTarget(source, target)) return;
    source.x = target.x;
    source.y = target.y;
    this.drawRaft();
    this.notify("Sal parcasi tasindi.", this.playerRoot.x, this.playerRoot.y - 70, "#d9fbff", "good");
    this.updateHud();
  }

  isRaftConnected(tiles = this.raftTiles) {
    return this.raftSystem.isConnected(tiles);
  }

  tileKey(x, y) {
    return `${x},${y}`;
  }

  createCollections() {
    this.items = this.add.group();
    this.survivors = this.add.group();
    this.islands = this.add.group();
    this.ports = this.add.group();
    this.cities = this.add.group();
    this.diveZones = this.add.group();
    this.fishSchools = this.add.group();
    this.threats = this.add.group();
    this.floatingTexts = this.add.group();
  }

  createWorldObjects() {
    this.worldSystem.createObjects();
  }

  createHud() {
    this.ui = this.add.container(0, 0).setScrollFactor(0).setDepth(50);
    this.topPanel = this.add.rectangle(12, 12, 420, 86, 0x082634, 0.88).setOrigin(0, 0);
    this.ui.add(this.topPanel);

    this.titleText = this.add.text(24, 20, "WAYBORN", {
      fontSize: "18px",
      fontStyle: "700",
      color: "#f3f7e9"
    }).setOrigin(0, 0);
    this.ui.add(this.titleText);

    this.statText = this.add.text(24, 45, "", {
      fontSize: "13px",
      color: "#c7e7e5",
      lineSpacing: 4
    }).setOrigin(0, 0);
    this.ui.add(this.statText);

    this.invPanel = this.add.rectangle(12, 108, 390, 104, 0x082634, 0.82).setOrigin(0, 0);
    this.ui.add(this.invPanel);
    this.invText = this.add.text(24, 119, "", {
      fontSize: "12px",
      color: "#eef7f2",
      lineSpacing: 4
    }).setOrigin(0, 0);
    this.ui.add(this.invText);

    this.questPanel = this.add.rectangle(12, 218, 390, 46, 0x082634, 0.76).setOrigin(0, 0);
    this.ui.add(this.questPanel);
    this.questText = this.add.text(24, 228, "", {
      fontSize: "12px",
      color: "#fff0aa",
      lineSpacing: 3
    }).setOrigin(0, 0);
    this.ui.add(this.questText);

    this.windText = this.add.text(0, 0, "", {
      fontSize: "14px",
      color: "#d8f1ff"
    }).setScrollFactor(0).setDepth(51);

    this.compassBar = this.add.container(0, 0).setScrollFactor(0).setDepth(52).setVisible(false);
    this.compassBack = this.add.rectangle(0, 0, 380, 46, 0x07151f, 0.74).setStrokeStyle(1, 0x7fb7b8, 0.72);
    this.compassLine = this.add.rectangle(0, -8, 346, 2, 0xb8d6d4, 0.52);
    this.compassCenter = this.add.rectangle(0, -8, 2, 26, 0xf3fbf7, 0.82);
    this.compassTargetMarker = this.add.triangle(0, 0, 0, 11, -9, -8, 9, -8, 0xff5b5b, 0.96)
      .setStrokeStyle(2, 0x2b0909, 0.92)
      .setVisible(false);
    this.compassTargetText = this.add.text(0, 0, "", {
      fontSize: "12px",
      fontStyle: "700",
      color: "#ffd0d0"
    }).setOrigin(0.5, 0).setVisible(false);
    this.compassCardinals = [
      { label: "N", angle: -Math.PI / 2, text: this.add.text(0, 0, "N", { fontSize: "14px", fontStyle: "700", color: "#d8f1ff" }).setOrigin(0.5) },
      { label: "E", angle: 0, text: this.add.text(0, 0, "E", { fontSize: "12px", fontStyle: "700", color: "#9fbfc2" }).setOrigin(0.5) },
      { label: "S", angle: Math.PI / 2, text: this.add.text(0, 0, "S", { fontSize: "12px", fontStyle: "700", color: "#9fbfc2" }).setOrigin(0.5) },
      { label: "W", angle: Math.PI, text: this.add.text(0, 0, "W", { fontSize: "12px", fontStyle: "700", color: "#9fbfc2" }).setOrigin(0.5) }
    ];
    this.compassBar.add([
      this.compassBack,
      this.compassLine,
      ...this.compassCardinals.map((item) => item.text),
      this.compassCenter,
      this.compassTargetMarker,
      this.compassTargetText
    ]);
    [
      this.titleText,
      this.statText,
      this.invText,
      this.questText,
      this.windText,
      this.compassTargetText,
      ...this.compassCardinals.map((item) => item.text)
    ].forEach((text) => text.setResolution?.(RENDER_RESOLUTION));
    [
      this.topPanel,
      this.titleText,
      this.statText,
      this.invPanel,
      this.invText,
      this.questPanel,
      this.questText
    ].forEach((item) => item?.setVisible(false));

    this.createDomControls();
    this.updateHud();
  }

  createDomControls() {
    this.uiRoot = document.querySelector("#ui-root");
    this.uiRoot.innerHTML = "";
    this.createDomHud();

    this.actionMenuUI.create();

    this.craftModal = this.craftUI.create();

    this.inventoryModal = this.inventoryUI.create();
    this.crewModal = this.crewUI.create();

    this.discoveryModal = this.discoveryUI.create();

    this.raftEditModal = this.raftEditorUI.create();

    this.tradeModal = this.tradeUI.create();
    this.cityModal = this.cityUI.create();

    this.gameOverDom = this.gameplayModalsUI.createGameOver();
    this.alertModal = this.gameplayModalsUI.createAlertModal();
    this.islandModal = this.gameplayModalsUI.createIslandModal();
    this.fishingModal = this.gameplayModalsUI.createFishingModal();
    this.fishingResultModal = this.gameplayModalsUI.createFishingResultModal();
    this.diveModal = this.gameplayModalsUI.createDiveModal();
    this.diveResultModal = this.gameplayModalsUI.createDiveResultModal();

    this.uiRoot.append(this.hudBar, this.hudDetailBar, this.hudQuestPopover, this.eventLog, this.entryButton, this.contextButton, this.quickDiveButton, this.quickAttackButton, this.quickRepairButton, this.actionMenu, this.systemMenu, this.craftModal, this.inventoryModal, this.crewModal, this.discoveryModal, this.raftEditModal, this.tradeModal, this.cityModal, this.islandModal, this.fishingModal, this.fishingResultModal, this.diveModal, this.diveResultModal, this.alertModal, this.gameOverDom);
    this.renderCraftList();
    this.showIntroLog();
  }

  createDomHud() {
    this.hudUI.create();
  }

  showIntroLog() {
    if (this.hasSeenIntroLog) return;
    this.hasSeenIntroLog = true;
  }

  createDomButton(className, label, onClick) {
    return createDomButton(className, label, onClick);
  }

  createFullscreenResizeHandler() {
    if (this.fullscreenListenerAttached) return;
    this.fullscreenListenerAttached = true;
    document.addEventListener("fullscreenchange", () => this.scheduleRendererRefresh());
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.scheduleRendererRefresh();
    });
    window.addEventListener("orientationchange", () => this.scheduleRendererRefresh());
    window.addEventListener("pageshow", () => this.scheduleRendererRefresh());
    screen.orientation?.addEventListener?.("change", () => this.scheduleRendererRefresh());
    window.addEventListener("resize", () => this.scheduleRendererRefresh());
  }

  scheduleRendererRefresh() {
    clearTimeout(this.fullscreenResizeTimer);
    [40, 180, 420, 850].forEach((delay) => {
      this.fullscreenResizeTimer = setTimeout(() => this.refreshRendererSize(), delay);
    });
  }

  refreshRendererSize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    this.game.loop.wake();
    this.game.renderer.resize(width, height);
    this.scale.resize(width, height);
    this.scale.refresh();
    this.game.scene.getScenes(true).forEach((scene) => {
      scene.cameras?.cameras?.forEach((camera) => camera.setViewport(0, 0, width, height));
      scene.layoutUi?.();
    });
    this.cameras.main.setBounds(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);
    this.nightOverlay?.setSize(width, height);
    this.updateHud();
  }

  async toggleFullscreen() {
    const root = document.documentElement;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        this.scheduleRendererRefresh();
        this.toast("Tam ekran kapatildi", this.playerRoot.x, this.playerRoot.y - 70, "#d6f7ff");
        return;
      }
      if (!root.requestFullscreen) {
        this.toast("Bu tarayici tam ekran modunu desteklemiyor", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
        return;
      }
      await root.requestFullscreen({ navigationUI: "hide" });
      this.scheduleRendererRefresh();
      this.toast("Tam ekran acildi", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7");
    } catch (_error) {
      this.toast("Tam ekran icin tarayici izin vermedi", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
    }
  }

  openCraftModal(category = "all") {
    if (this.isGameOver) return;
    this.craftFilter = category;
    this.actionMenu.classList.remove("open", "craft-open");
    this.renderCraftList();
    this.craftModal.classList.add("open");
  }

  closeCraftModal() {
    this.blockHudClicks(350);
    this.craftModal.classList.remove("open");
    if (this.islandCraftScene) {
      this.uiRoot.style.display = "none";
      this.islandCraftScene.scene.resume();
      this.islandCraftScene = null;
    }
  }

  blockHudClicks(duration = 250) {
    this.hudClickBlockedUntil = Math.max(this.hudClickBlockedUntil, performance.now() + duration);
  }

  isHudClickBlocked() {
    return performance.now() < this.hudClickBlockedUntil;
  }

  openIslandCraft(islandScene) {
    if (!islandScene || this.isGameOver) return;
    this.islandCraftScene = islandScene;
    islandScene.scene.pause();
    this.uiRoot.style.display = "";
    this.openCraftModal(this.hasCraftingKit ? "gear" : "all");
  }

  showAlertModal(message) {
    if (!this.alertModal) return;
    this.alertModal.querySelector(".alert-message").textContent = message;
    this.alertModal.classList.add("open");
  }

  closeAlertModal() {
    this.alertModal?.classList.remove("open");
  }

  openInventoryModal() {
    if (this.isGameOver) return;
    this.actionMenu.classList.remove("open");
    this.renderInventoryModal();
    this.inventoryModal.classList.add("open");
    this.recordQuestAction("inventoryOpened");
  }

  closeInventoryModal() {
    this.inventoryModal?.classList.remove("open");
  }

  openCrewModal() {
    if (this.isGameOver) return;
    this.actionMenu.classList.remove("open");
    this.crewUI.render();
    this.crewModal.classList.add("open");
  }

  closeCrewModal() {
    this.crewModal?.classList.remove("open");
  }

  openDiscoveryModal() {
    if (this.isGameOver) return;
    this.actionMenu.classList.remove("open");
    this.renderDiscoveryModal();
    this.discoveryModal.classList.add("open");
  }

  closeDiscoveryModal() {
    this.discoveryModal?.classList.remove("open");
  }

  openRaftEditModal() {
    if (this.isGameOver) return;
    this.actionMenu.classList.remove("open");
    this.actionMenu.style.display = "none";
    this.contextButton.style.display = "none";
    this.entryButton.style.display = "none";
    this.cancelRaftEditPlacement(false);
    this.raftEditSelection = null;
    this.selectedRaftBuildCraft = null;
    this.raftEditMode = "build";
    this.renderRaftEditModal();
    this.raftEditModal.classList.add("open");
  }

  closeRaftEditModal() {
    if (this.pendingBuildRefunds.length > 0) this.cancelPendingBuilds(false);
    this.raftEditSelection = null;
    this.raftEditModal?.classList.remove("open");
    this.actionMenu.style.display = "";
    this.contextButton.style.display = "";
    this.entryButton.style.display = "";
  }

  renderRaftEditModal() {
    this.raftEditorUI.render();
  }

  selectRaftBuildCraft(craft) {
    if (this.raftEditMode === "move") {
      this.selectedRaftBuildCraft = craft;
      this.raftEditSelection = null;
      return;
    }
    this.raftEditMode = "build";
    const blockReason = this.getCraftBlockReason(craft);
    if (blockReason) {
      this.showAlertModal(blockReason);
      return;
    }
    if (craft.requires && !craft.requires(this)) {
      this.showAlertModal("Bu yapi icin on kosul eksik.");
      return;
    }
    const missingCost = this.getMissingCostText(craft.cost);
    if (missingCost.length > 0) {
      this.showAlertModal(`Malzeme eksik: ${missingCost}`);
      return;
    }
    const targets = this.getRaftBuildTargetsForCraft(craft);
    if (targets === "instant") {
      this.tryCraft(craft);
      this.selectedRaftBuildCraft = null;
      return;
    }
    if (!targets.length) {
      this.showAlertModal("Bu yapi icin uygun yer yok.");
      return;
    }
    this.selectedRaftBuildCraft = craft;
    this.raftEditSelection = null;
  }

  getRaftBuildTargetsForCraft(craft) {
    if (!craft) return [];
    if (craft.name === "Sal Parcasi") return this.getBuildCandidates();
    if (craft.name === "Baglanti Kirisi") return this.getBeamCandidates();
    if (craft.name === "Toplama Agi") return this.getNetCandidates();
    if (["Su Toplayici", "Basit Ocak", "Yengec Kafesi", "Kucuk Sandik", "Basit Yatak", "Basit Direk", "Basit Forge", "Su Damitici"].includes(craft.name)) return this.getModuleCandidates();
    if (craft.name === "Basit Yelken") return "instant";
    return [];
  }

  canBuildSelectedRaftCraftAt(x, y) {
    const targets = this.selectedRaftBuildCraft ? this.getRaftBuildTargetsForCraft(this.selectedRaftBuildCraft) : [];
    return Array.isArray(targets) && targets.some((target) => target.x === x && target.y === y);
  }

  applySelectedRaftBuildAt(x, y) {
    const craft = this.selectedRaftBuildCraft;
    if (!craft) return;
    if (!this.canBuildSelectedRaftCraftAt(x, y)) {
      this.showAlertModal("Bu noktaya yerlestirilemez.");
      return;
    }
    const applied = this.tryCraft(craft);
    if (applied === false) return;
    if (craft.name === "Sal Parcasi") this.placeRaftTile({ x, y });
    else if (craft.name === "Baglanti Kirisi") this.placeBeamOnTile({ x, y });
    else if (craft.name === "Toplama Agi") this.placeNetOnTile({ x, y });
    else if (["Su Toplayici", "Basit Ocak", "Yengec Kafesi", "Kucuk Sandik", "Basit Yatak", "Basit Direk", "Basit Forge", "Su Damitici"].includes(craft.name)) this.placeModuleOnTile({ x, y });
    this.selectedRaftBuildCraft = null;
    this.renderRaftEditModal();
  }

  startMoveModule(tile) {
    const source = this.getRaftTile(tile.x, tile.y);
    if (!source?.module) return;
    if (!this.getModuleMoveCandidates(source).length) {
      this.toast("Modul tasimak icin bos ust parca yok", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return;
    }
    this.movingModuleFrom = { x: source.x, y: source.y };
    this.movingNetFrom = null;
    this.placingRaft = false;
    this.placingNet = false;
    this.placingModule = false;
    this.closeRaftEditModal();
    this.refreshPlacementMarkers();
    this.toast("Modul icin mavi hedef parcayi sec", this.playerRoot.x, this.playerRoot.y - 70, "#d9fbff");
  }

  startMoveNet(tile) {
    const source = this.getRaftTile(tile.x, tile.y);
    if (!(source?.netHp > 0)) return;
    if (!this.getNetMoveCandidates(source).length) {
      this.toast("Ag tasimak icin uygun parca yok", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return;
    }
    this.movingNetFrom = { x: source.x, y: source.y };
    this.movingModuleFrom = null;
    this.placingRaft = false;
    this.placingNet = false;
    this.placingModule = false;
    this.closeRaftEditModal();
    this.refreshPlacementMarkers();
    this.toast("Ag icin sari hedef parcayi sec", this.playerRoot.x, this.playerRoot.y - 70, "#d9fbff");
  }

  cancelRaftEditPlacement(refresh = true) {
    this.movingModuleFrom = null;
    this.movingNetFrom = null;
    if (refresh) this.refreshPlacementMarkers();
  }

  cancelPendingBuilds(showNotice = true) {
    this.pendingBuildRefunds.forEach((entry) => {
      Object.entries(entry.cost).forEach(([key, amount]) => {
        this.inventory[key] = (this.inventory[key] ?? 0) + amount;
      });
    });
    const refunded = this.pendingBuildRefunds.length;
    this.pendingBuildRefunds = [];
    this.pendingRaftPieces = 0;
    this.pendingNets = 0;
    this.pendingBeams = 0;
    this.pendingModules = [];
    this.placingRaft = false;
    this.placingNet = false;
    this.placingBeam = false;
    this.placingModule = false;
    this.movingModuleFrom = null;
    this.movingNetFrom = null;
    this.raftEditSelection = null;
    this.refreshPlacementMarkers();
    this.renderRaftEditModal();
    this.updateHud();
    if (showNotice) {
      this.notify(refunded > 0 ? "Bekleyen sal islemleri iptal edildi, malzeme iade edildi." : "Bekleyen sal islemi yok.", this.playerRoot.x, this.playerRoot.y - 70, "#d6f7ff", "info");
    }
  }

  setRaftEditLayer(layer) {
    if (!["lower", "raft", "module"].includes(layer)) return;
    this.raftEditLayer = layer;
    this.raftEditSelection = null;
    this.selectedRaftBuildCraft = null;
    this.renderRaftEditModal();
  }

  setRaftEditMode(mode) {
    if (!["move", "delete"].includes(mode)) return;
    this.raftEditMode = this.raftEditMode === mode ? "build" : mode;
    this.raftEditSelection = null;
    this.selectedRaftBuildCraft = null;
    this.renderRaftEditModal();
  }

  getRaftEditLayerLabel() {
    return { lower: "Alt katman", raft: "Orta katman", module: "Ust katman" }[this.raftEditLayer] ?? "Katman";
  }

  getRaftEditCells(selected, extraTargets = []) {
    const cells = new Map();
    for (let y = RAFT_MIN_Y; y <= RAFT_MAX_Y; y += 1) {
      for (let x = RAFT_MIN_X; x <= RAFT_MAX_X; x += 1) cells.set(this.tileKey(x, y), { x, y });
    }
    extraTargets.filter((target) => this.isWithinRaftBounds(target.x, target.y)).forEach((target) => cells.set(this.tileKey(target.x, target.y), target));
    if (selected && this.raftEditMode === "move") {
      this.getRaftEditTargets(selected)
        .filter((target) => this.isWithinRaftBounds(target.x, target.y))
        .forEach((target) => cells.set(this.tileKey(target.x, target.y), target));
    }
    return Array.from(cells.values());
  }

  handleRaftEditCell(x, y) {
    if (this.selectedRaftBuildCraft && this.raftEditMode === "build") {
      if (this.canBuildSelectedRaftCraftAt(x, y)) {
        this.applySelectedRaftBuildAt(x, y);
      } else {
        this.showAlertModal("Bu noktaya yerlestirilemez.");
      }
      return;
    }
    const tile = this.getRaftTile(x, y);
    const selected = this.raftEditSelection ? this.getRaftTile(this.raftEditSelection.x, this.raftEditSelection.y) : null;

    if (selected && this.canRaftEditTarget(selected, { x, y })) {
      this.applyRaftEditMove(selected, { x, y });
      return;
    }

    if (!tile || !this.canSelectRaftEditSource(tile)) return;

    if (this.raftEditSelection?.x === x && this.raftEditSelection?.y === y && this.raftEditMode === "delete") {
      this.applyRaftEditDelete(tile);
      return;
    }

    this.raftEditSelection = { x, y };
    this.renderRaftEditModal();
  }

  canSelectRaftEditSource(tile) {
    if (!tile) return false;
    const selectedType = this.getSelectedRaftEditType();
    if (this.raftEditLayer === "module") return Boolean(tile.module) && (!selectedType || tile.module === selectedType);
    if (this.raftEditLayer === "lower") {
      if (selectedType === "net") return tile.netHp > 0;
      if (selectedType === "beam") return this.raftEditMode === "delete" ? this.canRemoveBeamFromTile(tile) : tile.beamHp > 0;
      if (this.raftEditMode === "delete") return tile.netHp > 0 || this.canRemoveBeamFromTile(tile);
      return tile.netHp > 0 || tile.beamHp > 0;
    }
    if (this.raftEditLayer === "raft") {
      if (selectedType && selectedType !== "raft") return false;
      if (this.raftEditMode === "delete") return this.canRemoveRaftTile(tile);
      return this.canMoveRaftTile(tile);
    }
    return false;
  }

  getRaftEditTargets(tile) {
    if (!tile || this.raftEditMode !== "move") return [];
    if (this.raftEditLayer === "module") return this.getModuleMoveCandidates(tile);
    if (this.raftEditLayer === "lower") {
      const selectedType = this.getSelectedRaftEditType();
      if (selectedType === "net") return this.getNetMoveCandidates(tile);
      if (selectedType === "beam") return this.getBeamMoveCandidates(tile);
      return tile.netHp > 0 ? this.getNetMoveCandidates(tile) : this.getBeamMoveCandidates(tile);
    }
    if (this.raftEditLayer === "raft") return this.getRaftTileMoveCandidates(tile);
    return [];
  }

  canRaftEditTarget(source, target) {
    return this.getRaftEditTargets(source).some((candidate) => candidate.x === target.x && candidate.y === target.y);
  }

  applyRaftEditMove(source, target) {
    if (this.raftEditLayer === "module") {
      this.movingModuleFrom = { x: source.x, y: source.y };
      this.moveModuleToTile(target);
    } else if (this.raftEditLayer === "lower" && this.getSelectedRaftEditType() === "net") {
      this.movingNetFrom = { x: source.x, y: source.y };
      this.moveNetToTile(target);
    } else if (this.raftEditLayer === "lower" && this.getSelectedRaftEditType() === "beam") {
      this.moveBeamToTile(source, target);
    } else if (this.raftEditLayer === "lower" && source.netHp > 0) {
      this.movingNetFrom = { x: source.x, y: source.y };
      this.moveNetToTile(target);
    } else if (this.raftEditLayer === "lower" && source.beamHp > 0) {
      this.moveBeamToTile(source, target);
    } else if (this.raftEditLayer === "raft") {
      this.moveRaftTileTo(source, target);
    }
    this.raftEditSelection = null;
    this.renderRaftEditModal();
  }

  applyRaftEditDelete(tile) {
    if (this.raftEditLayer === "module") {
      this.removeModuleFromTile(tile);
    } else if (this.raftEditLayer === "lower" && tile.netHp > 0) {
      this.removeNetFromTile(tile);
    } else if (this.raftEditLayer === "lower" && tile.beamHp > 0) {
      this.removeBeamFromTile(tile);
    } else if (this.raftEditLayer === "raft") {
      this.removeRaftTile(tile);
    }
    this.raftEditSelection = null;
    this.renderRaftEditModal();
  }

  getSelectedRaftEditType() {
    return this.selectedRaftBuildCraft ? this.craftSystem.getRaftBuildType(this.selectedRaftBuildCraft.name) : null;
  }

  renderDiscoveryModal() {
    this.discoveryUI.render();
  }

  followDiscovery(id) {
    if (!this.discoverySystem.follow(id)) return;
    this.recordQuestAction("discoveryFollowed");
    this.notify("Kesif hedefi pusulaya islendi.", this.playerRoot.x, this.playerRoot.y - 70, "#d6f7ff", "info");
    this.renderDiscoveryModal();
    this.updateHud();
  }

  clearDiscoveryFollow() {
    this.discoverySystem.clearFollow();
    this.notify("Kesif takibi birakildi.", this.playerRoot.x, this.playerRoot.y - 70, "#d6f7ff", "info");
    this.renderDiscoveryModal();
    this.updateHud();
  }

  openTradeModal() {
    if (this.isGameOver || !this.nearPort) return;
    this.tradeViewMode = "all";
    this.currentPort = this.nearPort;
    this.ensurePortContracts(this.currentPort);
    const followedPort = this.discoveries.find((entry) => entry.id === this.followedDiscoveryId && entry.type === "port");
    if (followedPort && Phaser.Math.Distance.Between(followedPort.x, followedPort.y, this.currentPort.x, this.currentPort.y) < 180) {
      this.recordQuestAction("portReachedWhileFollowing");
    }
    this.markQuestFlag("visitedPort");
    this.actionMenu.classList.remove("open");
    if (!this.isAnchored) {
      this.isAnchored = true;
      this.velocity.set(0, 0);
      this.notify("Limana yanasildi, capa atildi.", this.playerRoot.x, this.playerRoot.y - 70, "#d6f7ff", "good");
    }
    this.renderTradeModal();
    this.tradeModal.classList.add("open");
    this.updateActionLabels();
  }

  openCityModal() {
    if (this.isGameOver || !this.nearCity) return;
    this.currentCity = this.nearCity;
    this.currentPort = this.currentCity;
    this.questFlags.visitedCity = true;
    if (this.currentCity.meta?.id === "meridia") this.recordQuestAction("visitedCity");
    this.ensurePortContracts(this.currentCity);
    this.actionMenu.classList.remove("open");
    if (!this.isAnchored) {
      this.isAnchored = true;
      this.velocity.set(0, 0);
      this.notify("Sehir limanina yanasildi, capa atildi.", this.playerRoot.x, this.playerRoot.y - 70, "#ffd18c", "good");
    }
    this.updateActionLabels();
    this.startCityExplore();
  }

  closeCityModal({ depart = true } = {}) {
    this.blockHudClicks(350);
    this.cityModal?.classList.remove("open");
    this.cityModal?.classList.remove("services-only");
    if (this.cityExploreScene) {
      this.uiRoot.style.display = "none";
      this.cityExploreScene.scene.resume();
      return;
    }
    if (!depart) return;
    this.currentCity = null;
    this.currentPort = null;
    if (this.isAnchored) {
      this.isAnchored = false;
      this.nearCity = null;
      this.notify("Sehirden ayrildin ve capa alindi.", this.playerRoot.x, this.playerRoot.y - 70, "#d6f7ff", "info");
    }
    this.updateActionLabels();
  }

  openCityTrade() {
    if (!this.currentCity) return;
    this.returnToCityAfterTrade = true;
    this.cityModal.classList.remove("open");
    this.renderTradeModal();
    this.tradeModal.classList.add("open");
  }

  openCityTradeFromScene(cityScene, mode = "market") {
    if (!cityScene || !this.currentCity) return;
    this.cityExploreScene = cityScene;
    this.tradeViewMode = mode;
    cityScene.scene.pause();
    this.uiRoot.style.display = "";
    this.openCityTrade();
  }

  openCityServicesFromScene(cityScene) {
    if (!cityScene || !this.currentCity) return;
    this.cityExploreScene = cityScene;
    cityScene.scene.pause();
    this.uiRoot.style.display = "";
    this.cityModal.classList.add("services-only");
    this.cityUI.render();
    this.cityModal.classList.add("open");
  }

  startCityExplore() {
    if (!this.currentCity || this.isGameOver) return;
    this.closeCraftModal();
    this.closeInventoryModal();
    this.closeCrewModal();
    this.closeFishingModal(false);
    this.cityModal?.classList.remove("open");
    if (this.uiRoot) this.uiRoot.style.display = "none";
    this.scene.launch("city", {
      parentScene: this,
      city: this.currentCity
    });
    this.scene.pause();
  }

  finishCityExplore() {
    this.cityExploreScene = null;
    if (this.uiRoot) this.uiRoot.style.display = "";
    this.scene.resume();
    this.currentCity = null;
    this.currentPort = null;
    if (this.isAnchored) {
      this.isAnchored = false;
      this.nearCity = null;
      this.notify("Sehirden ayrildin ve capa alindi.", this.playerRoot.x, this.playerRoot.y - 70, "#d6f7ff", "info");
    }
    this.updateActionLabels();
    this.updateHud();
  }

  useCityShipyard() {
    if (!this.tradeSystem.buyRepair()) return;
    this.cityUI.render();
    this.updateHud();
  }

  recruitCityCandidate(candidateId) {
    const city = this.currentCity;
    const candidate = city?.meta?.tavernCandidates?.find((entry) => entry.id === candidateId);
    if (!candidate) return;
    if (this.getCrewCount() >= this.getCrewCapacity()) {
      this.showAlertModal("Bos yatak yok. Yeni tayfa icin once salda yatak kur.");
      return;
    }
    if (this.gold < candidate.price) return;
    this.gold -= candidate.price;
    this.crew.push({
      id: candidate.id,
      name: candidate.name,
      role: candidate.role,
      roleLabel: candidate.roleLabel,
      hunger: 0,
      thirst: 0
    });
    city.meta.tavernCandidates = city.meta.tavernCandidates.filter((entry) => entry.id !== candidateId);
    this.notify(`${candidate.name} tayfaya katildi.`, this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    this.cityUI.render();
    this.updateHud();
  }

  closeTradeModal(options = {}) {
    if (this.cityExploreScene && this.currentCity && !this.isGameOver) {
      this.returnToCityAfterTrade = false;
      this.tradeViewMode = null;
      this.tradeModal?.classList.remove("open");
      this.uiRoot.style.display = "none";
      this.cityExploreScene.scene.resume();
      return;
    }
    if (this.returnToCityAfterTrade && this.currentCity && !this.isGameOver) {
      this.returnToCityAfterTrade = false;
      this.tradeModal?.classList.remove("open");
      this.cityUI.render();
      this.cityModal.classList.add("open");
      return;
    }
    const shouldDepart = options.depart && this.currentPort && this.isAnchored && !this.isGameOver;
    this.tradeViewMode = null;
    this.tradeModal?.classList.remove("open");
    this.currentPort = null;
    if (shouldDepart) {
      this.isAnchored = false;
      this.nearPort = null;
      this.notify("Limandan ayrildin ve capa alindi.", this.playerRoot.x, this.playerRoot.y - 70, "#d6f7ff", "info");
      this.updateActionLabels();
    }
  }

  renderTradeModal() {
    this.tradeUI.render();
  }

  acceptContract(index) {
    const contract = this.portContracts[index];
    if (!contract || !this.currentPort) return;
    contract.accepted = true;
    contract.origin = this.getPortOrigin(this.currentPort);
    this.recordQuestAction("contractAccepted");
    this.notify(`Gorev alindi: ${contract.title}`, this.playerRoot.x, this.playerRoot.y - 70, "#fff0aa", "good");
    this.renderTradeModal();
    this.updateHud();
  }

  completeContract(index) {
    const contract = this.portContracts[index];
    if (!contract || !this.canCompleteContract(contract)) return;

    Object.entries(contract.need).forEach(([key, amount]) => {
      this.inventory[key] = Math.max(0, (this.inventory[key] ?? 0) - amount);
    });
    this.applyContractReward(contract.reward ?? {});
    this.recordQuestAction("contractCompleted");
    this.portContracts[index] = this.generateContract(this.portContracts.map((item, itemIndex) => itemIndex === index ? null : item?.id).filter(Boolean));
    this.notify(`Kontrat tamamlandi: ${contract.title}`, this.playerRoot.x, this.playerRoot.y - 70, "#fff0aa", "good");
    this.renderTradeModal();
    this.updateHud();
  }

  applyContractReward(reward) {
    this.tradeSystem.applyContractReward(reward);
  }

  ensurePortContracts(originPort = null) {
    this.portContracts = this.contractSystem.ensure(this.portContracts, originPort);
  }

  normalizePortContracts(contracts) {
    return this.contractSystem.normalize(contracts);
  }

  generateContract(excludedIds = []) {
    return this.contractSystem.generate(excludedIds);
  }

  cloneContract(contract, origin = null, accepted = false) {
    return this.contractSystem.clone(contract, origin, accepted);
  }

  getPortOrigin(port) {
    return this.contractSystem.getPortOrigin(port);
  }

  normalizeContractOrigin(origin) {
    return this.contractSystem.normalizeOrigin(origin);
  }

  canCompleteContract(contract) {
    return this.contractSystem.canComplete(contract);
  }

  isAtContractOrigin(contract) {
    return this.contractSystem.isAtOrigin(contract);
  }

  discoverLocation(type, x, y, label = null) {
    return this.discoverySystem.discover(type, x, y, label);
  }

  normalizeDiscoveries(discoveries) {
    return this.discoverySystem.normalize(discoveries);
  }

  getDiscoveryTypeLabel(type) {
    return this.discoverySystem.getTypeLabel(type);
  }

  getDiscoveryCounts() {
    return this.discoverySystem.getCounts();
  }

  getDistanceToPoint(point) {
    return this.discoverySystem.getDistanceTo(point);
  }

  getLookoutRange() {
    const base = this.hasMast && this.hasSpyglass ? 980 : this.hasMast ? 620 : 0;
    const visibility = this.isNight ? 0.42 : this.weatherState === "storm" ? 0.58 : this.weatherState === "rain" ? 0.78 : 1;
    return (base + this.crewSystem.getLookoutBonus()) * visibility;
  }

  getItemBundleText(bundle) {
    return Object.entries(bundle ?? {})
      .map(([key, amount]) => `${ITEM_LABELS[key] ?? key} ${amount}`)
      .join(", ");
  }

  getRewardText(reward) {
    const parts = [];
    if (reward.gold) parts.push(`Altin ${reward.gold}`);
    if (reward.morale) parts.push(`Moral ${reward.morale}`);
    if (reward.bait) parts.push(`Yem ${reward.bait}`);
    INVENTORY_KEYS.forEach((key) => {
      if (reward[key]) parts.push(`${ITEM_LABELS[key]} ${reward[key]}`);
    });
    return parts.join(", ");
  }

  sellTradeItem(key) {
    if (!this.tradeSystem.sellItem(key)) return;
    this.renderTradeModal();
    this.updateHud();
  }

  buyTradeItem(key) {
    if (!this.tradeSystem.buyItem(key)) return;
    this.renderTradeModal();
    this.updateHud();
  }

  buyBait() {
    if (!this.tradeSystem.buyBait()) return;
    this.renderTradeModal();
    this.updateHud();
  }

  buyPortHeal() {
    if (!this.tradeSystem.buyHeal()) return;
    this.renderTradeModal();
    this.updateHud();
  }

  buyPortRepair() {
    if (!this.tradeSystem.buyRepair()) return;
    this.renderTradeModal();
    this.updateHud();
    this.updateQuickRepairButton();
  }

  buyPortSupplies() {
    if (!this.tradeSystem.buySupplies()) return;
    this.renderTradeModal();
    this.updateHud();
  }

  buyPortWaterFill() {
    if (!this.tradeSystem.buyWaterFill()) return;
    this.renderTradeModal();
    this.updateHud();
  }

  hasDamagedRaft() {
    return this.tradeSystem.hasDamagedRaft();
  }

  renderInventoryModal() {
    this.inventoryUI.render();
  }

  saveGame() {
    if (this.isGameOver) return;
    this.actionMenu.classList.remove("open");

    try {
      this.saveSystem.save();
      this.notify("Oyun kaydedildi.", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    } catch {
      this.notify("Kayit basarisiz. Tarayici depolamasi dolu olabilir.", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93", "warn");
    }
  }

  loadGame() {
    this.actionMenu.classList.remove("open");
    let data;

    try {
      data = this.saveSystem.load();
      if (!data) {
        this.toast("Kayit yok", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
        return;
      }
    } catch {
      this.notify("Kayit okunamadi.", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93", "warn");
      return;
    }

    this.applySaveData(data);
    this.notify("Kayit yuklendi.", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
  }

  pickItemCounts(source) {
    return this.inventorySystem.pickItemCounts(source);
  }

  applyItemCounts(target, source) {
    this.inventorySystem.applyItemCounts(target, source);
    this.migrateLegacyResources(target);
  }

  migrateLegacyResources(target) {
    if ((target.wood ?? 0) > 0 && (target.branch ?? 0) <= 0) target.branch = target.wood;
    if ((target.rope ?? 0) > 0 && (target.leaf ?? 0) <= 0) target.leaf = target.rope;
    if ((target.food ?? 0) > 0 && (target.fruit ?? 0) <= 0) target.fruit = target.food;
  }

  applySaveData(data) {
    this.applyItemCounts(this.inventory, data.inventory);
    this.applyItemCounts(this.storage, data.storage);

    this.stats.hp = Phaser.Math.Clamp(Number(data.stats?.hp ?? this.stats.hp), 0, 100);
    this.stats.thirst = Phaser.Math.Clamp(Number(data.stats?.thirst ?? this.stats.thirst), 0, 100);
    this.stats.hunger = Phaser.Math.Clamp(Number(data.stats?.hunger ?? this.stats.hunger), 0, 100);
    this.stats.morale = Phaser.Math.Clamp(Number(data.stats?.morale ?? this.stats.morale), 0, 100);
    this.gold = Math.max(0, Math.floor(data.gold ?? 0));
    this.crew = Array.isArray(data.crew) ? data.crew.map((member, index) => ({
      id: String(member.id ?? `crew-${index}`),
      name: this.crewSystem.getSafeCrewName(member.name, index),
      role: String(member.role ?? "survivor").slice(0, 32),
      roleLabel: String(member.roleLabel ?? "Kazazede").slice(0, 32),
      hunger: Phaser.Math.Clamp(Number(member.hunger ?? 0), 0, 100),
      thirst: Phaser.Math.Clamp(Number(member.thirst ?? 0), 0, 100)
    })).slice(0, 24) : [];
    this.questIndex = this.questSystem.resolveSavedIndex(data.quests);
    this.questProgress = data.quests?.sequenceVersion >= 2 ? { ...(data.quests?.progress ?? {}) } : {};
    this.questFlags = {
      caughtFish: Boolean(data.quests?.flags?.caughtFish),
      visitedIsland: Boolean(data.quests?.flags?.visitedIsland),
      foundIslandScrap: Boolean(data.quests?.flags?.foundIslandScrap),
      foundIslandOre: Boolean(data.quests?.flags?.foundIslandOre),
      forgeRecipeUnlocked: Boolean(data.quests?.flags?.forgeRecipeUnlocked),
      shoreDive: Boolean(data.quests?.flags?.shoreDive),
      visitedPort: Boolean(data.quests?.flags?.visitedPort),
      visitedCity: Boolean(data.quests?.flags?.visitedCity),
      soldFish: Boolean(data.quests?.flags?.soldFish)
    };
    this.portContracts = this.normalizePortContracts(data.contracts);
    this.ensurePortContracts();
    this.worldSeed = Number.isFinite(data.worldSeed) ? (data.worldSeed >>> 0) : this.worldSeed;
    this.worldSeedCode = makeSeedCode(this.worldSeed);
    this.discoveries = this.normalizeDiscoveries(data.discoveries);
    this.followedDiscoveryId = this.hasCompass && this.discoveries.some((entry) => entry.id === data.followedDiscoveryId) ? data.followedDiscoveryId : null;
    this.questSystem.activateCurrentQuest();
    this.raftLimitLevel = Phaser.Math.Clamp(Math.floor(data.raftLimitLevel ?? 0), 0, 3);
    this.raftIntegrity = Phaser.Math.Clamp(Number(data.raftIntegrity ?? this.raftIntegrity), 0, 100);

    const savedTiles = Array.isArray(data.raftTiles) && data.raftTiles.length > 0 ? data.raftTiles : this.getDefaultRaftTiles();
    this.raftTiles = savedTiles
      .map((tile) => this.normalizeSavedTile(tile))
      .filter((tile, index, tiles) => tiles.findIndex((candidate) => candidate.x === tile.x && candidate.y === tile.y) === index);
    if (!this.raftTiles.some((tile) => this.isCenterTile(tile))) {
      this.raftTiles.push({ x: 0, y: 0, hp: 3, beamHp: 3 });
    }
    if (!this.raftTiles.some((tile) => tile.beamHp > 0)) {
      const centerTile = this.raftTiles.find((tile) => this.isCenterTile(tile));
      if (centerTile && !centerTile.netHp) centerTile.beamHp = 3;
    }
    this.raftLevel = this.raftTiles.length;

    const player = data.player ?? {};
    this.playerRoot.setPosition(this.numberOr(player.x, this.playerRoot.x), this.numberOr(player.y, this.playerRoot.y));
    this.playerRoot.rotation = this.numberOr(player.rotation, this.playerRoot.rotation);
    this.velocity.set(this.numberOr(data.velocity?.x, 0), this.numberOr(data.velocity?.y, 0));

    this.hasCompass = Boolean(data.unlocks?.hasCompass);
    this.hasFlask = Boolean(data.unlocks?.hasFlask);
    this.maxFlaskWater = Math.max(1, Math.floor(data.unlocks?.maxFlaskWater ?? this.maxFlaskWater));
    this.flaskWater = Phaser.Math.Clamp(Math.floor(data.unlocks?.flaskWater ?? this.flaskWater), 0, this.maxFlaskWater);
    this.hasSail = Boolean(data.unlocks?.hasSail);
    this.sailHp = Phaser.Math.Clamp(Math.floor(data.unlocks?.sailHp ?? (this.hasSail ? SAIL_TYPES[1].maxHp : 0)), 0, SAIL_TYPES[1].maxHp);
    if (this.sailHp <= 0) this.hasSail = false;
    this.hasSpyglass = Boolean(data.unlocks?.hasSpyglass);
    this.hasForge = Boolean(data.unlocks?.hasForge);
    this.forgeLegacyUnlocked = this.hasForge && !this.raftTiles.some((tile) => tile.module === "forge");
    this.hasCraftingKit = Boolean(data.unlocks?.hasCraftingKit ?? data.unlocks?.hasRepairHammer);
    this.hasTorch = Boolean(data.unlocks?.hasTorch);
    this.hasAxe = Boolean(data.unlocks?.hasAxe);
    this.hasPickaxe = Boolean(data.unlocks?.hasPickaxe);
    this.hasFishingRod = Boolean(data.unlocks?.hasFishingRod);
    this.fishingLineLevel = Phaser.Math.Clamp(Math.floor(data.unlocks?.fishingLineLevel ?? 0), 0, FISHING_GEAR.line.length - 1);
    this.fishingRodLevel = Phaser.Math.Clamp(Math.floor(data.unlocks?.fishingRodLevel ?? 0), 0, FISHING_GEAR.rod.length - 1);
    this.fishingBait = Math.max(0, Math.floor(data.unlocks?.fishingBait ?? 0));
    this.hasHarpoon = Boolean(data.unlocks?.hasHarpoon);
    this.hasDiveMask = Boolean(data.unlocks?.hasDiveMask);
    this.hasDiveTank = Boolean(data.unlocks?.hasDiveTank);
    if (this.hasDiveTank) this.hasDiveMask = true;
    this.maxWaterReserve = Math.max(1, Math.floor(data.maxWaterReserve ?? this.maxWaterReserve));
    this.waterReserve = Phaser.Math.Clamp(Math.floor(data.waterReserve ?? this.waterReserve), 0, this.maxWaterReserve);
    this.waterDistTimer = Phaser.Math.Clamp(Number(data.waterDistTimer ?? this.waterDistTimer), 0, 3);
    this.crabTrapTimer = Phaser.Math.Clamp(Number(data.crabTrap?.timer ?? this.crabTrapTimer), 0, 72);
    this.lastCrabTrapPauseLog = 0;

    if (Number.isFinite(data.wind?.x) && Number.isFinite(data.wind?.y)) {
      this.wind.set(data.wind.x, data.wind.y);
      if (this.wind.length() <= 0.01) this.wind.set(1, 0);
      this.wind.normalize();
    }
    this.windPower = Phaser.Math.Clamp(Number(data.wind?.power ?? this.windPower), 0.16, 0.46);
    this.lastWindLogPower = Phaser.Math.Clamp(Number(data.lastWindLogPower ?? this.windPower), 0.16, 0.46);
    this.weatherState = WEATHER_STATES[data.weather?.state] ? data.weather.state : "sunny";
    this.seaState = SEA_STATES[data.weather?.sea] ? data.weather.sea : "calm";
    this.weatherPlan = data.weather?.plan && typeof data.weather.plan === "object" ? { ...data.weather.plan } : null;
    this.worldDay = Math.max(1, Math.floor(data.worldTime?.day ?? this.worldDay));
    this.dayProgress = Phaser.Math.Clamp(Number(data.worldTime?.progress ?? this.dayProgress), 0, 0.9999);
    this.lastDayProgress = this.dayProgress;
    if (this.worldDay <= 3) this.weatherSystem.beginDay(this.worldDay, true);
    this.timeSystem.updateLighting();
    this.lastWeatherLog = "";
    this.diveCooldownUntil = this.time.now + Math.max(0, Number(data.diveMemory?.cooldownRemaining ?? 0));
    this.diveFatigue = Phaser.Math.Clamp(Number(data.diveMemory?.fatigue ?? 0), 0, 100);
    this.lastDiveAreaKey = String(data.diveMemory?.lastAreaKey ?? "");
    this.diveAreaPressure = typeof data.diveMemory?.areaPressure === "object" && data.diveMemory.areaPressure ? { ...data.diveMemory.areaPressure } : {};

    this.pendingRaftPieces = 0;
    this.pendingNets = 0;
    this.pendingBeams = 0;
    this.pendingModules = [];
    this.placingRaft = false;
    this.placingNet = false;
    this.placingBeam = false;
    this.placingModule = false;
    this.hasSeenIntroLog = Boolean(data.tutorial?.hasSeenIntroLog ?? true);
    this.eventEntries = [];
    this.renderEventLog();
    this.isAnchored = false;
    this.isOnIsland = false;
    this.nearIsland = null;
    this.nearPort = null;
    this.nearCity = null;
    this.nearSurvivor = null;
    this.crewSystem.nearSurvivor = null;
    this.currentIsland = null;
    this.currentPort = null;
    this.currentCity = null;
    this.islandRestCount = 0;
    this.fishingState = null;
    this.diveState = null;

    this.closeCraftModal();
    this.closeInventoryModal();
    this.closeCrewModal();
    this.closeDiscoveryModal();
    this.closeRaftEditModal();
    this.closeTradeModal();
    this.closeCityModal({ depart: false });
    this.closeFishingModal(false);
    this.closeDiveModal();
    this.islandModal?.classList.remove("open");
    this.gameOverDom?.classList.remove("open");
    this.isGameOver = false;

    this.resetProceduralWorld();
    this.recalculatePlacedModules();
    this.drawRaft();
    this.drawSail();
    this.refreshPlacementMarkers();
    this.updateHud();
    this.updateActionLabels();
    this.updateQuickRepairButton();
  }

  normalizeSavedTile(tile) {
    const normalized = {
      x: Math.trunc(this.numberOr(tile?.x, 0)),
      y: Math.trunc(this.numberOr(tile?.y, 0))
    };
    normalized.x = Phaser.Math.Clamp(normalized.x, -8, 8);
    normalized.y = Phaser.Math.Clamp(normalized.y, -8, 8);
    normalized.hp = Phaser.Math.Clamp(Math.floor(tile?.hp ?? this.getMaxTileHp(normalized)), 1, this.getMaxTileHp(normalized));
    if (tile?.netHp > 0 && !this.isCenterTile(normalized)) {
      normalized.netHp = Phaser.Math.Clamp(Math.floor(tile.netHp), 1, 2);
    }
    if (tile?.beamHp > 0 && !normalized.netHp) {
      normalized.beamHp = Phaser.Math.Clamp(Math.floor(tile.beamHp), 1, 3);
    }
    if (MODULE_TYPES[tile?.module] && !this.isStartingRaftTile(normalized)) {
      normalized.module = tile.module;
      normalized.moduleHp = Phaser.Math.Clamp(Math.floor(tile.moduleHp ?? 2), 1, 2);
    }
    return normalized;
  }

  getDefaultRaftTiles() {
    return [
      { x: -1, y: 0, hp: 2 },
      { x: 0, y: 0, hp: 3, beamHp: 3 },
      { x: 1, y: 0, hp: 2 }
    ];
  }

  numberOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  openFishingModal() {
    if (this.isGameOver) return;
    if (!this.hasFishingRod) {
      this.toast("Once olta craft et", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return;
    }
    this.fishingState = this.fishingSystem.createState();
    const target = this.fishingState.target;
    this.renderFishingModal(`${target.label} oltaya takildi.`);
    this.fishingModal.classList.add("open");
  }

  closeFishingModal(showMessage = true) {
    this.fishingModal?.classList.remove("open");
    this.fishingState = null;
    if (showMessage) this.toast("Olta toplandi", this.playerRoot.x, this.playerRoot.y - 70, "#c9d7df");
  }

  renderFishingModal(status) {
    if (!this.fishingState) return;
    const target = this.fishingState.target;
    const line = this.getFishingLine();
    const rod = this.getFishingRod();
    this.fishingModal.querySelector(".fishing-status").textContent = status;
    this.fishingModal.querySelector(".fishing-name").textContent = target.label;
    this.fishingModal.querySelector(".fishing-value").textContent = target.value > 0 ? `Tier ${target.tier} / Tahmini deger ${target.value}` : `Tier ${target.tier} / Ticari degeri yok`;
    this.fishingModal.querySelector(".fishing-gear").textContent = `${rod.label} + ${line.label}  Limit ${line.limit}  Yem ${this.fishingBait}`;
    const visual = this.fishingModal.querySelector(".fish-visual");
    visual.style.background = target.color;
    visual.style.color = target.color;
    visual.classList.toggle("is-large", target.pullMax >= 28);
    const progress = Phaser.Math.Clamp(Math.round(this.fishingState.progress), 0, 100);
    this.fishingModal.querySelector(".fishing-distance").textContent = `Yakınlık ${progress}/100`;
    this.fishingModal.querySelector(".fishing-marker").style.left = `${progress}%`;
    this.fishingModal.querySelector(".fishing-progress-fill").style.width = `${progress}%`;
    const tension = Phaser.Math.Clamp(this.fishingState.tension, 0, line.limit);
    const tensionFill = this.fishingModal.querySelector(".fishing-tension");
    tensionFill.style.width = `${(tension / line.limit) * 100}%`;
    tensionFill.classList.toggle("danger", tension > line.limit * 0.82);
  }

  fishingPull() {
    this.fishingSystem.pull();
  }

  fishingRelease() {
    this.fishingSystem.release();
  }

  resolveFishingStep(status = "Balik direniyor.") {
    if (!this.fishingState) return;
    const line = this.getFishingLine();
    const target = this.fishingState.target;
    this.fishingState.turns += 1;
    this.fishingState.progress = Phaser.Math.Clamp(this.fishingState.progress, -12, 120);
    this.fishingState.tension = Phaser.Math.Clamp(this.fishingState.tension, 0, line.limit + 20);
    if (this.fishingState.tension >= line.limit) {
      this.closeFishingModal(false);
      this.showFishingResultModal({
        status: `Misina koptu, ${target.label} kacti. (${line.label})`,
        gained: {}
      });
      return;
    }
    if (this.fishingState.progress <= 0) {
      this.closeFishingModal(false);
      this.showFishingResultModal({
        status: `${target.label} oltadan kurtuldu.`,
        gained: {}
      });
      return;
    }
    if (this.fishingState.progress >= 100) {
      const result = this.collectFishingReward(target);
      this.closeFishingModal(false);
      this.showFishingResultModal(result);
      this.updateHud();
      return;
    }
    this.renderFishingModal(status);
  }

  applyFishCounterPull(multiplier = 1) {
    return this.fishingSystem.applyFishCounterPull(multiplier);
  }

  rollFishMove(staminaRatio, isReleasing) {
    return this.fishingSystem.rollFishMove(staminaRatio, isReleasing);
  }

  rollFishingTarget() {
    return this.fishingSystem.rollTarget();
  }

  collectFishingReward(target) {
    return this.fishingSystem.collectReward(target);
  }

  showFishingResultModal(result) {
    if (!this.fishingResultModal) return;
    this.fishingResultModal.querySelector(".fishing-result-status").textContent = result.status;
    this.renderResultList(this.fishingResultModal.querySelector(".fishing-result-list"), result.gained);
    this.fishingResultModal.classList.add("open");
  }

  closeFishingResultModal() {
    this.fishingResultModal?.classList.remove("open");
  }

  getFishingLine() {
    return this.fishingSystem.getLine();
  }

  getFishingRod() {
    return this.fishingSystem.getRod();
  }

  openDiveModal() {
    if (this.isGameOver) return;
    if (!this.isAnchored) {
      this.toast("Dalis icin once capa at", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return;
    }
    const siteKey = this.getCurrentDiveSite();
    if (!this.canEnterDiveSite(siteKey)) {
      this.toast(`${DIVE_SITES[siteKey].requirement} gerekli`, this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return;
    }
    if (siteKey === "shallow" && this.nearIsland) this.markQuestFlag("shoreDive");
    this.startUnderwaterDive(siteKey, false);
  }

  closeDiveModal() {
    const shouldReturnToIsland = this.diveState?.fromIsland && this.isOnIsland && this.currentIsland && !this.isGameOver;
    this.diveModal?.classList.remove("open");
    this.diveState = null;
    if (shouldReturnToIsland) {
      this.renderIslandModal();
      this.islandModal.classList.add("open");
    }
  }

  startUnderwaterDive(siteKey, fromIsland = false) {
    if (this.isGameOver || !DIVE_SITES[siteKey]) return false;
    if (!this.canStartDiveNow()) return false;
    const areaKey = this.getDiveAreaKey(siteKey);
    const pressure = this.registerDivePressure(areaKey);
    this.actionMenu?.classList.remove("open");
    this.closeCraftModal();
    this.closeInventoryModal();
    this.closeCrewModal();
    this.closeTradeModal();
    this.closeFishingModal(false);
    this.diveModal?.classList.remove("open");
    if (this.uiRoot) this.uiRoot.style.display = "none";
    this.scene.launch("underwater", {
      parentScene: this,
      siteKey,
      fromIsland,
      oxygen: this.getDiveOxygen(siteKey),
      pressure,
      weatherState: this.weatherState,
      seaState: this.seaState,
      isNight: this.isNight
    });
    this.scene.pause();
    return true;
  }

  canStartDiveNow() {
    return this.divingSystem.canStartNow();
  }

  getDiveAreaKey(siteKey) {
    return this.divingSystem.getAreaKey(siteKey);
  }

  registerDivePressure(areaKey) {
    return this.divingSystem.registerPressure(areaKey);
  }

  attractDiveThreat() {
    const nearby = this.getNearbySharks(760);
    if (nearby.length > 0) {
      nearby.forEach((shark) => {
        shark.meta.retreatTime = 0;
        shark.meta.warned = false;
      });
      this.logEvent("Dalis hareketliligi kopek baliginin dikkatini cekti.", "warn");
      return;
    }
    this.spawnSharkNearPlayer(Phaser.Math.Between(420, 620));
    this.logEvent("Suda bir kopek baligi belirdi. Dalis spam'i riskli.", "danger");
  }

  spawnSharkNearPlayer(distance = 560) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const x = Phaser.Math.Clamp(this.playerRoot.x + Math.cos(angle) * distance, -WORLD_SIZE / 2, WORLD_SIZE / 2);
    const y = Phaser.Math.Clamp(this.playerRoot.y + Math.sin(angle) * distance, -WORLD_SIZE / 2, WORLD_SIZE / 2);
    if (this.isPointOnIsland(x, y, 80)) return this.spawnShark();
    const shark = this.add.image(x, y, "creature-shark");
    shark.setDisplaySize(48, 36);
    shark.meta = {
      speed: Phaser.Math.FloatBetween(0.55, 0.95),
      biteCooldown: 80,
      retreatTime: 0,
      warned: false,
      wanderAngle: Phaser.Math.FloatBetween(0, Math.PI * 2)
    };
    this.threats.add(shark);
  }

  finishUnderwaterDive(result) {
    if (this.uiRoot) this.uiRoot.style.display = "";
    this.scene.resume();
    const site = DIVE_SITES[result.siteKey] ?? DIVE_SITES.shallow;

    if (result.oxygenFailed) {
      this.handleDiveOxygenFailure(site);
    }

    this.resolveDiveAftermath(result);
    this.showDiveResultModal(result);
    this.updateHud();
  }

  resolveDiveAftermath(result) {
    this.divingSystem.resolveAftermath(result);
  }

  renderResultList(container, gained) {
    this.gameplayModalsUI.renderResultList(container, gained, ITEM_LABELS);
  }

  showDiveResultModal(result) {
    if (!this.diveResultModal) return;
    this.lastDiveResult = result;
    const status = result.oxygenFailed
      ? "Oksijen bitti. Zorla yuzeye ciktin ve can kaybettin."
      : result.summary;
    this.diveResultModal.querySelector(".dive-result-status").textContent = status;
    this.renderResultList(this.diveResultModal.querySelector(".dive-result-list"), result.gained);
    this.diveResultModal.classList.add("open");
  }

  closeDiveResultModal() {
    this.diveResultModal?.classList.remove("open");
  }

  repeatDiveFromResult() {
    const result = this.lastDiveResult;
    if (!result || this.isGameOver) return;
    this.closeDiveResultModal();
    if (!this.canEnterDiveSite(result.siteKey)) {
      this.toast("Bu dalis icin ekipman eksik", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      this.resumeIslandAfterDiveIfNeeded(result);
      return;
    }
    if (!this.startUnderwaterDive(result.siteKey, result.fromIsland)) {
      this.resumeIslandAfterDiveIfNeeded(result);
    }
  }

  returnFromDiveResult() {
    const result = this.lastDiveResult;
    this.closeDiveResultModal();
    this.resumeIslandAfterDiveIfNeeded(result);
    this.lastDiveResult = null;
  }

  resumeIslandAfterDiveIfNeeded(result) {
    if (result?.fromIsland && this.isOnIsland && this.currentIsland && !this.isGameOver) {
      this.startIslandExplore();
    }
  }

  renderDiveModal(status) {
    if (!this.diveState) return;
    const site = DIVE_SITES[this.diveState.site] ?? DIVE_SITES.shallow;
    this.diveModal.querySelector(".dive-status").textContent = status;
    const oxygen = Phaser.Math.Clamp((this.diveState.oxygen / this.diveState.maxOxygen) * 100, 0, 100);
    const oxygenFill = this.diveModal.querySelector(".dive-oxygen");
    oxygenFill.style.width = `${oxygen}%`;
    oxygenFill.classList.toggle("warn", oxygen < 45);
    oxygenFill.classList.toggle("danger", oxygen < 20);

    const zoneInfo = this.diveModal.querySelector(".dive-zone-info");
    zoneInfo.textContent = `${site.label} - ${site.hint}`;

    ["scrap", "stone", "coral"].forEach((resource) => {
      const button = this.diveModal.querySelector(`.dive-${resource}`);
      const config = site.resources[resource];
      button.disabled = !config;
      button.textContent = config?.label ?? `${ITEM_LABELS[resource]} yok`;
    });
  }

  collectDiveResource(resource) {
    if (!this.diveState || this.isGameOver) return;
    const site = DIVE_SITES[this.diveState.site] ?? DIVE_SITES.shallow;
    const target = site.resources[resource];
    if (!target) return;
    this.diveState.oxygen -= target.oxygen;
    if (this.diveState.oxygen <= 0) {
      this.handleDiveOxygenFailure(site);
      return;
    }

    const riskText = this.resolveDiveRisk(site);
    if (Phaser.Math.Between(1, 100) > target.chance) {
      this.renderDiveModal(`${site.label}: bir sey bulamadin. ${riskText}`);
      this.updateHud();
      return;
    }

    const amount = target.bonusChance && Phaser.Math.Between(1, 100) <= target.bonusChance ? 2 : 1;
    if (this.addInventoryItem(resource, amount)) {
      this.notify(`${ITEM_LABELS[resource]} +${amount} (${site.label})`, this.playerRoot.x, this.playerRoot.y - 70, "#c4f6ff", "good");
    }
    this.renderDiveModal(`${ITEM_LABELS[resource]} bulundu. ${riskText}`);
    this.updateHud();
  }

  handleDiveOxygenFailure(site) {
    this.divingSystem.handleOxygenFailure(site);
  }

  canEnterDiveSite(siteKey) {
    return this.divingSystem.canEnterSite(siteKey);
  }

  getCurrentDiveSite() {
    return this.divingSystem.getCurrentSite();
  }

  getCurrentDiveZone() {
    let current = null;
    this.diveZones?.getChildren().forEach((zone) => {
      const distance = Phaser.Math.Distance.Between(this.playerRoot.x, this.playerRoot.y, zone.x, zone.y);
      if (distance <= zone.meta.radius) current = zone;
    });
    return current;
  }

  isNearIslandShallows() {
    return this.islands?.getChildren().some((island) => {
      const radius = island.meta.radius + 280;
      return Phaser.Math.Distance.Between(this.playerRoot.x, this.playerRoot.y, island.x, island.y) <= radius;
    }) ?? false;
  }

  getDiveOxygen(siteKey = "shallow") {
    return this.divingSystem.getOxygen(siteKey);
  }

  resolveDiveRisk(site) {
    return this.divingSystem.resolveRisk(site);
  }

  renderCraftList() {
    this.craftUI.render();
  }

  createTouchControls() {
    this.joystick.base = this.add.circle(96, 0, 54, 0x07151f, 0.42).setStrokeStyle(3, 0xbfe9ef, 0.55);
    this.joystick.knob = this.add.circle(96, 0, 22, 0xf5e8bf, 0.85);
    this.joystick.base.setScrollFactor(0).setDepth(60);
    this.joystick.knob.setScrollFactor(0).setDepth(61);

    this.input.on("pointerdown", (pointer) => {
      if (pointer.x < this.scale.width * 0.42 && pointer.y > this.scale.height * 0.42) {
        this.joystick.active = true;
        this.joystick.origin = new Phaser.Math.Vector2(pointer.x, pointer.y);
        this.joystick.base.setPosition(pointer.x, pointer.y);
        this.joystick.knob.setPosition(pointer.x, pointer.y);
      }
    });

    this.input.on("pointermove", (pointer) => {
      if (!this.joystick.active) return;
      const dx = pointer.x - this.joystick.origin.x;
      const dy = pointer.y - this.joystick.origin.y;
      const dist = Math.min(52, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      this.joystick.vector.set(Math.cos(angle) * (dist / 52), Math.sin(angle) * (dist / 52));
      this.joystick.knob.setPosition(
        this.joystick.origin.x + Math.cos(angle) * dist,
        this.joystick.origin.y + Math.sin(angle) * dist
      );
    });

    this.input.on("pointerup", () => this.resetJoystick());
    this.input.on("pointerupoutside", () => this.resetJoystick());
  }

  createKeyboardControls() {
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys("W,A,S,D");
  }

  resetJoystick() {
    this.joystick.active = false;
    this.joystick.vector.set(0, 0);
    const y = this.scale.height < 560 ? this.scale.height - 68 : this.scale.height - 90;
    this.joystick.base.setPosition(96, y);
    this.joystick.knob.setPosition(96, y);
  }

  layoutHud() {
    const w = this.scale.width;
    const h = this.scale.height;
    const compactHud = h < 560;
    const hudScale = compactHud ? 0.9 : 1;
    this.ui?.setScale(hudScale);
    if (!this.joystick.active) {
      const joystickY = compactHud ? h - 68 : h - 90;
      this.joystick.base.setPosition(96, joystickY);
      this.joystick.knob.setPosition(96, joystickY);
    }
    this.windText.setPosition(w > 900 ? 430 : 16, w > 900 ? 58 : 222);
    const compassY = compactHud ? 88 : 96;
    this.compassBar?.setPosition(w / 2, compassY);
    this.updateContractCompass();
    this.updateQuickAttackButton();
    this.updateQuickRepairButton();
  }

  updateQuickAttackButton() {
    if (!this.quickAttackButton) return;
    const canAttack = this.hasHarpoon && !this.isGameOver && !this.isOnIsland && !!this.getNearestThreat(240);
    this.quickAttackButton.classList.toggle("visible", canAttack);
    if (!canAttack) return;

    const camera = this.cameras.main;
    const screenX = this.playerRoot.x - camera.scrollX + 54;
    const screenY = this.playerRoot.y - camera.scrollY - 44;
    this.quickAttackButton.style.left = `${Phaser.Math.Clamp(screenX, 64, this.scale.width - 64)}px`;
    this.quickAttackButton.style.top = `${Phaser.Math.Clamp(screenY, 52, this.scale.height - 88)}px`;
  }

  updateQuickRepairButton() {
    if (!this.quickRepairButton) return;
    const canRepair =
      this.hasCraftingKit &&
      !this.isGameOver &&
      !this.isOnIsland &&
      this.canAfford({ branch: 1, plastic: 1 }) &&
      (this.raftIntegrity < 100 || this.raftTiles.some((tile) => (tile.hp ?? this.getMaxTileHp(tile)) < this.getMaxTileHp(tile)));
    this.quickRepairButton.classList.toggle("visible", canRepair);
    if (!canRepair) return;

    const camera = this.cameras.main;
    const screenX = this.playerRoot.x - camera.scrollX - 54;
    const screenY = this.playerRoot.y - camera.scrollY - 44;
    this.quickRepairButton.style.left = `${Phaser.Math.Clamp(screenX, 64, this.scale.width - 64)}px`;
    this.quickRepairButton.style.top = `${Phaser.Math.Clamp(screenY, 52, this.scale.height - 88)}px`;
  }

  spawnDriftItem(randomAnywhere = false) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = randomAnywhere ? Phaser.Math.Between(180, 1800) : Phaser.Math.Between(420, 760);
    const x = this.playerRoot.x + Math.cos(angle) * distance;
    const y = this.playerRoot.y + Math.sin(angle) * distance;
    return this.spawnDriftAt(x, y, this.getWorldRiskProfile(x, y));
  }

  spawnDriftItemInArea(centerX, centerY, radius, profile = null, rng = null) {
    const angle = rng ? rng.floatBetween(0, Math.PI * 2) : Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = rng ? rng.between(90, Math.max(120, Math.floor(radius))) : Phaser.Math.Between(90, Math.max(120, Math.floor(radius)));
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    return this.spawnDriftAt(x, y, profile ?? this.getWorldRiskProfile(x, y), rng);
  }

  spawnDriftAt(x, y, profile = null, rng = null) {
    const type = this.weightedType(profile, rng);
    if (Math.abs(x) > WORLD_SIZE / 2 || Math.abs(y) > WORLD_SIZE / 2) return;
    if (this.isPointOnWorldBlocker(x, y, 42)) return;

    const item = this.add.container(x, y).setDepth(2);
    const body = this.add.image(0, 0, `item-${type.key}`);
    this.fitSpriteToMaxSize(body, 34);
    item.add(body);
    item.meta = { type: type.key, label: type.label, drift: rng ? rng.floatBetween(0.2, 0.8) : Phaser.Math.FloatBetween(0.2, 0.8) };
    this.items.add(item);
    return item;
  }

  spawnLootItem(type, x, y, color = 0xd8c478) {
    const item = this.add.container(x, y).setDepth(2);
    const key = this.textures.exists(`item-${type}`) ? `item-${type}` : "item-loot";
    const body = this.add.image(0, 0, key);
    this.fitSpriteToMaxSize(body, 34);
    if (key === "item-loot") body.setTint(color);
    item.add(body);
    item.meta = { type, label: ITEM_LABELS[type] ?? type, drift: Phaser.Math.FloatBetween(0.08, 0.24) };
    this.items.add(item);
    return item;
  }

  fitSpriteToMaxSize(sprite, maxSize) {
    const width = Math.max(1, sprite.width ?? maxSize);
    const height = Math.max(1, sprite.height ?? maxSize);
    const scale = maxSize / Math.max(width, height);
    sprite.setDisplaySize(Math.round(width * scale), Math.round(height * scale));
  }

  spawnIsland(definition = null) {
    const x = definition?.x ?? Phaser.Math.Between(-WORLD_SIZE / 2 + 400, WORLD_SIZE / 2 - 400);
    const y = definition?.y ?? Phaser.Math.Between(-WORLD_SIZE / 2 + 400, WORLD_SIZE / 2 - 400);
    const island = this.add.container(x, y);
    const islandSprite = this.add.image(0, 0, "world-island");
    this.fitSpriteToMaxSize(islandSprite, 300);
    island.add(islandSprite);
    const riskProfile = this.getWorldRiskProfile(x, y);
    const archetype = getIslandArchetype(definition?.id, riskProfile.band);
    const islandLoot = this.createIslandLoot(riskProfile, archetype, definition?.id ?? `${Math.round(x)}-${Math.round(y)}`);
    island.meta = {
      id: definition?.id ?? `island-${Math.round(x)}-${Math.round(y)}`,
      name: definition?.name ?? "Ada",
      radius: definition?.radius ?? 136,
      collisionRadius: Math.max(definition?.radius ?? 136, Math.max(islandSprite.displayWidth, islandSprite.displayHeight) * 0.46),
      visited: false,
      riskBand: riskProfile.band,
      riskLabel: riskProfile.label,
      riskMultiplier: riskProfile.multiplier,
      archetype,
      archetypeLabel: ISLAND_ARCHETYPES[archetype]?.label ?? "Ada",
      loot: islandLoot
    };
    this.islands.add(island);
  }

  createIslandLoot(profile, archetype = "beach", islandId = "island") {
    const ranges = ISLAND_ARCHETYPES[archetype]?.loot ?? ISLAND_ARCHETYPES.beach.loot;
    const rng = createSeededRandom(hashSeed(this.worldSeed, "island-loot", islandId));
    const loot = Object.fromEntries(Object.entries(ranges).map(([key, [min, max]]) => [key, rng.between(min, max)]));
    if (profile.band === "harsh") {
      loot.stone += rng.between(0, 2);
      loot.ore += rng.between(0, 2);
    }
    return loot;
  }

  spawnPort(definition = null) {
    let x = definition?.x ?? Phaser.Math.Between(-WORLD_SIZE / 2 + 520, WORLD_SIZE / 2 - 520);
    let y = definition?.y ?? Phaser.Math.Between(-WORLD_SIZE / 2 + 520, WORLD_SIZE / 2 - 520);
    for (let attempt = 0; !definition && attempt < 24; attempt += 1) {
      const farEnough = Phaser.Math.Distance.Between(x, y, 0, 0) > 720 && !this.isPointOnWorldBlocker(x, y, 260);
      if (farEnough) break;
      x = Phaser.Math.Between(-WORLD_SIZE / 2 + 520, WORLD_SIZE / 2 - 520);
      y = Phaser.Math.Between(-WORLD_SIZE / 2 + 520, WORLD_SIZE / 2 - 520);
    }

    const port = this.add.container(x, y);
    const portSprite = this.add.image(0, 0, "world-port");
    this.fitSpriteToMaxSize(portSprite, 170);
    port.add(portSprite);
    port.meta = {
      id: definition?.id ?? `port-${Math.round(x)}-${Math.round(y)}`,
      radius: definition?.radius ?? 145,
      collisionRadius: Math.max(definition?.radius ?? 145, Math.max(portSprite.displayWidth, portSprite.displayHeight) * 0.48),
      name: definition?.name ?? "Kucuk Liman",
      marketBand: this.getWorldRiskProfile(x, y).band,
      marketType: definition?.marketType ?? "salvage"
    };
    this.ports.add(port);
  }

  spawnCity(definition) {
    const city = this.add.container(definition.x, definition.y);
    const citySprite = this.add.image(0, 0, "world-city");
    this.fitSpriteToMaxSize(citySprite, 620);
    city.add(citySprite);
    const profile = this.getWorldRiskProfile(definition.x, definition.y);
    city.meta = {
      id: definition.id,
      name: definition.name,
      radius: definition.radius ?? 220,
      collisionRadius: Math.max(definition.radius ?? 220, Math.max(citySprite.displayWidth, citySprite.displayHeight) * 0.46),
      marketBand: profile.band,
      marketType: definition.marketType ?? "industry",
      tavernCandidates: this.createCityCandidates(definition.id, profile.band)
    };
    this.cities.add(city);
  }

  createCityCandidates(cityId, band = "safe") {
    const pools = {
      safe: [
        { name: "Mara Venn", role: "fisher", roleLabel: "Balikci", price: 22 },
        { name: "Orin Vale", role: "handyman", roleLabel: "Tamirci", price: 28 },
        { name: "Elara Rook", role: "lookout", roleLabel: "Gozcu", price: 26 }
      ],
      harsh: [
        { name: "Dain Mercer", role: "handyman", roleLabel: "Tamirci", price: 38 },
        { name: "Neris Quill", role: "lookout", roleLabel: "Gozcu", price: 42 },
        { name: "Ilya Marr", role: "fisher", roleLabel: "Balikci", price: 36 }
      ],
      danger: [
        { name: "Varek Sorn", role: "handyman", roleLabel: "Tamirci", price: 58 },
        { name: "Selka Wraith", role: "lookout", roleLabel: "Gozcu", price: 62 },
        { name: "Cassian Drell", role: "fisher", roleLabel: "Balikci", price: 54 }
      ]
    };
    const key = band === "danger" || band === "edge" ? "danger" : band === "harsh" ? "harsh" : "safe";
    return pools[key].map((candidate, index) => ({ ...candidate, id: `${cityId}-${index}` }));
  }

  spawnDiveZone(type = "reef", centerX = null, centerY = null, areaRadius = 0, rng = null) {
    const radius = type === "deep"
      ? (rng ? rng.between(210, 280) : Phaser.Math.Between(210, 280))
      : (rng ? rng.between(150, 220) : Phaser.Math.Between(150, 220));
    const pickX = () => centerX == null
      ? (rng ? rng.between(-WORLD_SIZE / 2 + 520, WORLD_SIZE / 2 - 520) : Phaser.Math.Between(-WORLD_SIZE / 2 + 520, WORLD_SIZE / 2 - 520))
      : centerX + (rng ? rng.between(-areaRadius, areaRadius) : Phaser.Math.Between(-areaRadius, areaRadius));
    const pickY = () => centerY == null
      ? (rng ? rng.between(-WORLD_SIZE / 2 + 520, WORLD_SIZE / 2 - 520) : Phaser.Math.Between(-WORLD_SIZE / 2 + 520, WORLD_SIZE / 2 - 520))
      : centerY + (rng ? rng.between(-areaRadius, areaRadius) : Phaser.Math.Between(-areaRadius, areaRadius));
    let x = pickX();
    let y = pickY();
    const minCenterDistance = type === "deep" ? 1450 : 520;
    let validSpot = false;
    for (let attempt = 0; attempt < 36; attempt += 1) {
      const tooCloseIsland = this.isPointOnWorldBlocker(x, y, type === "deep" ? 380 : 220);
      const tooCloseCenter = Phaser.Math.Distance.Between(x, y, 0, 0) < minCenterDistance;
      const tooCloseZone = this.isTooCloseToDiveZone(x, y, radius, type);
      if (!tooCloseIsland && !tooCloseCenter && !tooCloseZone) {
        validSpot = true;
        break;
      }
      x = pickX();
      y = pickY();
    }
    if (!validSpot) return false;

    const zone = this.add.container(x, y);
    const color = type === "deep" ? 0x08364f : 0x1fa68d;
    const ring = this.add.ellipse(0, 0, radius * 2, radius * 1.25, color, type === "deep" ? 0.28 : 0.24);
    ring.setStrokeStyle(2, type === "deep" ? 0x4c8fb0 : 0x86f0d6, 0.36);
    const marker = this.add.circle(0, 0, type === "deep" ? 16 : 12, type === "deep" ? 0x0a2233 : 0x2ec4a6, 0.55);
    zone.add([ring, marker]);
    zone.setDepth(-10);
    zone.meta = { type, radius };
    this.diveZones.add(zone);
    return zone;
  }

  ensureTutorialDiveZone(type = "reef") {
    const nearby = this.diveZones?.getChildren().some((zone) =>
      zone.meta.type === type && Phaser.Math.Distance.Between(zone.x, zone.y, this.playerRoot.x, this.playerRoot.y) < 2200
    );
    if (nearby) return;
    const baseDistance = type === "deep" ? 1700 : 720;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const angle = this.playerRoot.rotation + Phaser.Math.FloatBetween(-1.2, 1.2) + attempt * 0.55;
      const distance = baseDistance + attempt * 90;
      const x = this.playerRoot.x + Math.cos(angle) * distance;
      const y = this.playerRoot.y + Math.sin(angle) * distance;
      const zone = this.spawnDiveZone(type, x, y, 60 + attempt * 12);
      if (!zone) continue;
      this.discoverLocation(type === "deep" ? "deep" : "reef", zone.x, zone.y, DIVE_SITES[type]?.label);
      return;
    }
  }

  spawnFishSchool(centerX = null, centerY = null, areaRadius = 0, rng = null) {
    const x = centerX == null
      ? (rng ? rng.between(-WORLD_SIZE / 2 + 420, WORLD_SIZE / 2 - 420) : Phaser.Math.Between(-WORLD_SIZE / 2 + 420, WORLD_SIZE / 2 - 420))
      : centerX + (rng ? rng.between(-areaRadius, areaRadius) : Phaser.Math.Between(-areaRadius, areaRadius));
    const y = centerY == null
      ? (rng ? rng.between(-WORLD_SIZE / 2 + 420, WORLD_SIZE / 2 - 420) : Phaser.Math.Between(-WORLD_SIZE / 2 + 420, WORLD_SIZE / 2 - 420))
      : centerY + (rng ? rng.between(-areaRadius, areaRadius) : Phaser.Math.Between(-areaRadius, areaRadius));
    if (this.isPointOnWorldBlocker(x, y, 240)) return false;
    const school = this.add.container(x, y).setDepth(-8);
    const ring = this.add.ellipse(0, 0, 230, 118, 0x68d9d1, 0.08).setStrokeStyle(2, 0xa6f5ed, 0.22);
    school.add(ring);
    for (let i = 0; i < 7; i += 1) {
      school.add(this.add.triangle(
        rng ? rng.between(-82, 82) : Phaser.Math.Between(-82, 82),
        rng ? rng.between(-34, 34) : Phaser.Math.Between(-34, 34),
        -8, -4, 8, 0, -8, 4,
        0xb8f3ea,
        0.36
      ));
    }
    school.meta = {
      radius: 128,
      drift: rng ? rng.floatBetween(0.04, 0.12) : Phaser.Math.FloatBetween(0.04, 0.12),
      phase: rng ? rng.floatBetween(0, Math.PI * 2) : Phaser.Math.FloatBetween(0, Math.PI * 2)
    };
    this.fishSchools.add(school);
    return true;
  }

  getCurrentFishSchool() {
    return this.fishSchools?.getChildren().find((school) =>
      Phaser.Math.Distance.Between(school.x, school.y, this.playerRoot.x, this.playerRoot.y) <= school.meta.radius
    ) ?? null;
  }

  isTooCloseToDiveZone(x, y, radius, type) {
    const spacing = type === "deep" ? 260 : 190;
    return this.diveZones.getChildren().some((zone) => {
      const distance = Phaser.Math.Distance.Between(x, y, zone.x, zone.y);
      return distance < radius + zone.meta.radius + spacing;
    });
  }

  spawnShark(centerX = null, centerY = null, areaRadius = 0, profile = null, rng = null) {
    const pickX = () => centerX == null
      ? (rng ? rng.between(-WORLD_SIZE / 2, WORLD_SIZE / 2) : Phaser.Math.Between(-WORLD_SIZE / 2, WORLD_SIZE / 2))
      : centerX + (rng ? rng.between(-areaRadius, areaRadius) : Phaser.Math.Between(-areaRadius, areaRadius));
    const pickY = () => centerY == null
      ? (rng ? rng.between(-WORLD_SIZE / 2, WORLD_SIZE / 2) : Phaser.Math.Between(-WORLD_SIZE / 2, WORLD_SIZE / 2))
      : centerY + (rng ? rng.between(-areaRadius, areaRadius) : Phaser.Math.Between(-areaRadius, areaRadius));
    let x = pickX();
    let y = pickY();
    for (let attempt = 0; attempt < 12 && this.isPointOnWorldBlocker(x, y, 80); attempt += 1) {
      x = pickX();
      y = pickY();
    }
    const shark = this.add.image(x, y, "creature-shark");
    shark.setDisplaySize(48, 36);
    shark.meta = {
      speed: (rng ? rng.floatBetween(0.4, 0.9) : Phaser.Math.FloatBetween(0.4, 0.9)) * (profile?.band === "danger" ? 1.18 : 1),
      biteCooldown: 0,
      retreatTime: 0,
      warned: false,
      wanderAngle: rng ? rng.floatBetween(0, Math.PI * 2) : Phaser.Math.FloatBetween(0, Math.PI * 2)
    };
    this.threats.add(shark);
  }

  weightedType(profile = null, rng = null) {
    const band = profile?.band === "danger" || profile?.band === "edge" ? "danger" : profile?.band === "harsh" ? "harsh" : "safe";
    const weights = DRIFT_LOOT_BY_BAND[band];
    const pool = weights.map((entry) => ({ ...DRIFT_TYPES.find((type) => type.key === entry.key), weight: entry.weight }));
    const total = pool.reduce((sum, type) => sum + type.weight, 0);
    let roll = rng ? rng.between(1, total) : Phaser.Math.Between(1, total);
    for (const type of pool) {
      roll -= type.weight;
      if (roll <= 0) return type;
    }
    return pool[0];
  }

  getWorldRiskProfile(x = this.playerRoot.x, y = this.playerRoot.y) {
    return this.worldSystem.getRiskProfile(x, y);
  }

  getRiskMultiplier() {
    return this.getWorldRiskProfile().multiplier;
  }

  update(time, delta) {
    const dt = delta / 16.67;
    const seconds = delta / 1000;
    this.layoutHud();
    this.timeSystem.update(delta);
    if (this.isGameOver) {
      this.updateFloatingTexts(dt);
      this.updateHud();
      return;
    }
    this.movePlayer(seconds);
    this.worldSystem.updateChunks();
    this.animateOcean(time, dt);
    this.moveItems(dt);
    this.moveFishSchools(dt, time);
    this.crewSystem.update(dt, time);
    this.checkPickup();
    this.checkIslandVisit();
    this.updateThreats(dt);
    this.updateFloatingTexts(dt);
    this.checkGameOver();
    this.updateQuickAttackButton();
    this.updateHud();
  }

  movePlayer(dt) {
    if (this.isAnchored || this.isOnIsland) {
      this.velocity.set(0, 0);
      this.sailingAlignment = 0;
      return;
    }
    const input = this.joystick.vector.clone();
    const keyboard = this.readKeyboardVector();
    input.add(keyboard);
    if (input.length() > 1) input.normalize();

    const integrityFactor = Phaser.Math.Clamp(this.raftIntegrity / 100, 0.45, 1);
    const mobilityFactor = this.getRaftMobilityFactor();
    const sea = SEA_STATES[this.seaState] ?? SEA_STATES.calm;
    const sail = this.getSailProfile();
    const acceleration = 220 * integrityFactor * Phaser.Math.Clamp(mobilityFactor * (1.02 + sail.speedBonus), 0.42, 1.18) * sea.speed;
    const maxSpeed = 152 * integrityFactor * mobilityFactor * (1 + sail.speedBonus) * sea.speed;
    const rawInput = input.clone();
    const hasInput = rawInput.length() > 0.05;
    let sailModifier = 1;
    if (this.windEnabled) {
      const windDir = this.wind.clone().normalize();
      this.sailingAlignment = hasInput ? rawInput.clone().normalize().dot(windDir) : 0;
      if (hasInput) {
        sailModifier = Phaser.Math.Clamp(1 + this.sailingAlignment * this.windPower * sail.windBonus, 0.72, 1.44);
      } else {
        const drift = windDir.scale(this.windPower * sail.drift * sea.drift * dt);
        this.velocity.add(drift);
      }
    } else {
      this.sailingAlignment = 0;
    }
    const thrust = input.scale(acceleration * sailModifier * dt);
    this.velocity.add(thrust);
    this.velocity.scale(Math.pow(0.965, dt * 60));
    if (this.velocity.length() > maxSpeed) {
      this.velocity.setLength(maxSpeed);
    }

    const nextX = this.playerRoot.x + this.velocity.x * dt;
    const nextY = this.playerRoot.y + this.velocity.y * dt;
    const nextRisk = this.getWorldRiskProfile(nextX, nextY);
    if (nextRisk.distance >= MAX_CHUNK_DISTANCE) {
      this.velocity.scale(0.2);
      this.logEvent("Buradan sadece oluler ve tanrilar gecer.", "danger");
    } else {
      this.playerRoot.x = Phaser.Math.Clamp(nextX, -WORLD_SIZE / 2, WORLD_SIZE / 2);
      this.playerRoot.y = Phaser.Math.Clamp(nextY, -WORLD_SIZE / 2, WORLD_SIZE / 2);
    }
    this.resolveIslandCollisionForPlayer();

    if (this.velocity.length() > 6) {
      this.playerRoot.rotation = Phaser.Math.Angle.RotateTo(
        this.playerRoot.rotation,
        this.velocity.angle() + Math.PI / 2,
        0.05
      );
    }
  }

  readKeyboardVector() {
    const v = new Phaser.Math.Vector2();
    if (this.cursorKeys.left.isDown || this.wasdKeys.A.isDown) v.x -= 1;
    if (this.cursorKeys.right.isDown || this.wasdKeys.D.isDown) v.x += 1;
    if (this.cursorKeys.up.isDown || this.wasdKeys.W.isDown) v.y -= 1;
    if (this.cursorKeys.down.isDown || this.wasdKeys.S.isDown) v.y += 1;
    if (v.length() > 1) v.normalize();
    return v;
  }

  animateOcean(time, dt) {
    const sea = SEA_STATES[this.seaState] ?? SEA_STATES.calm;
    this.waveLayer.getChildren().forEach((wave, index) => {
      wave.x += (this.windEnabled ? this.wind.x : 0.18) * wave.width * 0.0012 * sea.drift * dt;
      wave.y += (this.windEnabled ? this.wind.y : -0.04) * wave.width * 0.0012 * sea.drift * dt;
      wave.alpha = 0.11 + sea.roughness * 0.045 + Math.sin(time * (0.0015 + sea.roughness * 0.0004) + index) * 0.06;
      if (wave.x > WORLD_SIZE / 2) wave.x = -WORLD_SIZE / 2;
      if (wave.x < -WORLD_SIZE / 2) wave.x = WORLD_SIZE / 2;
      if (wave.y > WORLD_SIZE / 2) wave.y = -WORLD_SIZE / 2;
      if (wave.y < -WORLD_SIZE / 2) wave.y = WORLD_SIZE / 2;
    });
  }

  moveItems(dt) {
    this.items.getChildren().forEach((item) => {
      if (this.windEnabled) {
        const windDir = this.wind.clone().normalize();
        item.x += windDir.x * item.meta.drift * this.windPower * 1.7 * dt;
        item.y += windDir.y * item.meta.drift * this.windPower * 1.7 * dt;
      }
      this.resolveIslandCollisionForItem(item);
      item.rotation += 0.006 * dt;

      if (Phaser.Math.Distance.Between(item.x, item.y, this.playerRoot.x, this.playerRoot.y) > 1800) {
        item.destroy();
        return;
      }

    });
  }

  moveFishSchools(dt, time) {
    this.fishSchools?.getChildren().forEach((school) => {
      school.x += Math.cos(time * 0.00018 + school.meta.phase) * school.meta.drift * dt;
      school.y += Math.sin(time * 0.00016 + school.meta.phase) * school.meta.drift * dt;
      school.rotation = Math.sin(time * 0.0005 + school.meta.phase) * 0.08;
    });
  }

  checkPickup() {
    this.items.getChildren().forEach((item) => {
      const collectorTile = this.findCollectorTile(item);
      if (collectorTile) {
        this.collectItem(item, this.isCenterTile(collectorTile) ? "Toplandi" : "Ag topladi");
      }
    });
  }

  getRaftTileWorldPosition(tile) {
    const point = new Phaser.Math.Vector2(tile.x * this.raftTileSize, tile.y * this.raftTileSize);
    point.rotate(this.playerRoot.rotation);
    return { x: this.playerRoot.x + point.x, y: this.playerRoot.y + point.y };
  }

  isCenterTile(tile) {
    return tile.x === 0 && tile.y === 0;
  }

  isStartingRaftTile(tile) {
    return tile.y === 0 && tile.x >= -1 && tile.x <= 1;
  }

  getMaxTileHp(tile) {
    return this.isCenterTile(tile) ? 3 : 2;
  }

  getShieldTileFromThreat(threat) {
    return this.threatSystem.getShieldTile(threat);
  }

  damageRaftFromShark(shark) {
    return this.threatSystem.damageRaftFromShark(shark);
  }

  breakRaftTile(tile) {
    if (this.isCenterTile(tile)) return;
    this.raftTiles = this.raftTiles.filter((candidate) => candidate !== tile);
    this.raftLevel = this.raftTiles.length;
    this.recalculatePlacedModules();
    this.refreshPlacementMarkers();
    this.drawRaft();
  }

  recalculatePlacedModules() {
    this.moduleCount = this.raftTiles.filter((tile) => tile.module).length;
    this.hasWaterCollector = this.raftTiles.some((tile) => tile.module === "waterCollector");
    this.hasWaterDist = this.raftTiles.some((tile) => tile.module === "waterDist");
    this.hasGrill = this.raftTiles.some((tile) => tile.module === "grill");
    this.hasMast = this.raftTiles.some((tile) => tile.module === "mast");
    this.hasForge = this.forgeLegacyUnlocked || this.raftTiles.some((tile) => tile.module === "forge");
    this.crabTrapCount = this.raftTiles.filter((tile) => tile.module === "crabTrap").length;
    if (!this.hasMast) {
      this.hasSail = false;
      this.sailHp = 0;
      this.drawSail();
    }
    this.chests = this.raftTiles.filter((tile) => tile.module === "chest").length;
    this.beds = this.raftTiles.filter((tile) => tile.module === "bed").length;
  }

  findCollectorTile(item) {
    return this.raftTiles.find((tile) => {
      const canCollect = this.isCenterTile(tile) || tile.netHp > 0;
      if (!canCollect) return false;
      const point = this.getRaftTileWorldPosition(tile);
      const radius = this.isCenterTile(tile) ? 28 : 36;
      return Phaser.Math.Distance.Between(item.x, item.y, point.x, point.y) < radius;
    });
  }

  getWorldBlockers() {
    return [
      ...(this.islands?.getChildren() ?? []),
      ...(this.ports?.getChildren() ?? []),
      ...(this.cities?.getChildren() ?? [])
    ];
  }

  getBlockerRadius(blocker, padding = 0) {
    return (blocker.meta?.collisionRadius ?? blocker.meta?.radius ?? 0) + padding;
  }

  isPointOnIsland(x, y, padding = 0) {
    return this.islands?.getChildren().some((island) => {
      const radius = island.meta.radius + padding;
      return Phaser.Math.Distance.Between(x, y, island.x, island.y) < radius;
    }) ?? false;
  }

  isPointOnWorldBlocker(x, y, padding = 0) {
    return this.getWorldBlockers().some((blocker) => {
      const radius = this.getBlockerRadius(blocker, padding);
      return Phaser.Math.Distance.Between(x, y, blocker.x, blocker.y) < radius;
    });
  }

  resolveWorldBlockerCollision(target, padding = 0, options = {}) {
    this.getWorldBlockers().forEach((blocker) => {
      const radius = this.getBlockerRadius(blocker, padding);
      const dx = target.x - blocker.x;
      const dy = target.y - blocker.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 0 || distance >= radius) return;

      const nx = dx / distance;
      const ny = dy / distance;
      target.x = blocker.x + nx * radius;
      target.y = blocker.y + ny * radius;
      if (options.reflectVelocity && this.velocity) {
        const inwardSpeed = this.velocity.x * nx + this.velocity.y * ny;
        if (inwardSpeed < 0) {
          this.velocity.x -= nx * inwardSpeed;
          this.velocity.y -= ny * inwardSpeed;
        }
      }
      if (options.rotate) target.rotation = Math.atan2(ny, nx) + Math.PI / 2;
    });
  }

  resolveIslandCollisionForPlayer() {
    this.resolveWorldBlockerCollision(this.playerRoot, 24, { reflectVelocity: true });
  }

  resolveIslandCollisionForItem(item) {
    this.resolveWorldBlockerCollision(item, 14);
  }

  resolveIslandCollisionForThreat(threat) {
    this.resolveWorldBlockerCollision(threat, 34, { rotate: true });
  }

  collectItem(item, prefix) {
    if (this.isGameOver) return;
    if (!item || !item.meta) return;
    if (!this.addInventoryItem(item.meta.type, 1)) return;
    this.toast(`${prefix}: ${item.meta.label}`, item.x, item.y, item.meta.type === "fruit" ? "#ffd18c" : "#e7fff9");
    item.destroy();
  }

  checkIslandVisit() {
    this.worldSystem.checkNearbyLocations();
  }

  updateThreats(dt) {
    this.threatSystem.update(dt);
  }

  updateFloatingTexts(dt) {
    this.floatingTexts.getChildren().forEach((text) => {
      text.y -= 0.45 * dt;
      text.alpha -= 0.012 * dt;
      if (text.alpha <= 0) text.destroy();
    });
  }

  tryCraft(craft) {
    if (this.isGameOver) return false;
    const blockReason = this.getCraftBlockReason(craft);
    if (blockReason) {
      this.toast(blockReason, this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    if (!this.canAfford(craft.cost)) {
      this.toast(`Eksik: ${this.getMissingCostText(craft.cost)}`, this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    if (craft.requires && !craft.requires(this)) {
      this.toast("Bu tarif icin on kosul eksik", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    const applied = craft.apply(this);
    if (applied === false) return false;
    Object.entries(craft.cost).forEach(([key, value]) => {
      this.inventory[key] -= value;
    });
    const refundKind = this.getBuildRefundKind(craft.name);
    if (refundKind) {
      this.pendingBuildRefunds.push({ kind: refundKind, cost: { ...craft.cost } });
    }
    this.stats.morale = Math.min(100, this.stats.morale + 3);
    if (craft.name === "Cam Erit") this.recordQuestAction("glassCrafted");
    this.checkQuestProgress();
    this.updateHud();
    return true;
  }

  getCraftBlockReason(craft) {
    if (!craft) return "";
    if (craft.name !== "Uretim Kiti" && !craft.basic && !this.hasCraftingKit) return "Once Uretim Kiti yap";
    if (craft.requires && !craft.requires(this)) return craft.requiresText ?? "Bu tarif icin on kosul eksik";
    return "";
  }

  getBuildRefundKind(name) {
    const map = {
      "Sal Parcasi": "raft",
      "Baglanti Kirisi": "beam",
      "Toplama Agi": "net",
      "Su Toplayici": "module:waterCollector",
      "Basit Ocak": "module:grill",
      "Yengec Kafesi": "module:crabTrap",
      "Kucuk Sandik": "module:chest",
      "Basit Yatak": "module:bed",
      "Basit Direk": "module:mast",
      "Basit Forge": "module:forge",
      "Su Damitici": "module:waterDist"
    };
    return map[name] ?? null;
  }

  consumeBuildRefund(kind) {
    const index = this.pendingBuildRefunds.findIndex((entry) => entry.kind === kind);
    if (index >= 0) this.pendingBuildRefunds.splice(index, 1);
  }

  canAfford(cost) {
    return this.inventorySystem.canAfford(cost);
  }

  getMissingCostText(cost) {
    return this.inventorySystem.getMissingCostText(cost);
  }

  getCarryCapacity() {
    return this.baseCarryCapacity;
  }

  getRaftTileLimit() {
    return this.raftSystem.getTileLimit();
  }

  getMaxRaftCells() {
    return this.raftSystem.getMaxCells();
  }

  getRaftLoadCapacity() {
    return this.raftSystem.getLoadCapacity();
  }

  getRaftLoad() {
    return this.raftSystem.getLoad();
  }

  getRaftLoadRatio() {
    return this.raftSystem.getLoadRatio();
  }

  getRaftBurdenLabel() {
    return this.raftSystem.getBurdenLabel();
  }

  getRaftMobilityFactor() {
    return this.raftSystem.getMobilityFactor();
  }

  getSailProfile() {
    if (!this.hasSail || this.sailHp <= 0) return SAIL_TYPES[0];
    const base = SAIL_TYPES[1];
    const hpRatio = Phaser.Math.Clamp(this.sailHp / base.maxHp, 0.25, 1);
    return {
      ...base,
      speedBonus: base.speedBonus * hpRatio,
      windBonus: base.windBonus * hpRatio,
      drift: base.drift * hpRatio
    };
  }

  getInventoryLoad(container = this.inventory) {
    return this.inventorySystem.getLoad(container);
  }

  canStore(amount = 1) {
    return this.inventorySystem.canStore(amount);
  }

  getStorageCapacity() {
    return this.chests * this.storagePerChest;
  }

  getStorageLoad() {
    return this.inventorySystem.getLoad(this.storage);
  }

  canStoreInChest(amount = 1) {
    return this.inventorySystem.canStoreInChest(amount);
  }

  canRemoveModuleFromTile(tile) {
    if (!tile?.module) return false;
    if (tile.module === "chest") {
      const capacityAfter = Math.max(0, (this.chests - 1) * this.storagePerChest);
      return this.getStorageLoad() <= capacityAfter;
    }
    if (tile.module === "bed") {
      const capacityAfter = Math.max(0, this.getCrewCapacity() - (MODULE_TYPES.bed.crewCapacity ?? 1));
      return this.getCrewCount() <= capacityAfter;
    }
    return true;
  }

  getCrewCapacity() {
    return this.raftSystem.getCrewCapacity();
  }

  getCrewCount() {
    return this.crew?.length ?? 0;
  }

  assignCrewRole(memberId, role) {
    if (!this.crewSystem.assignRole(memberId, role)) return;
    this.crewUI.render();
  }

  getModuleCapacity() {
    return this.raftSystem.getModuleCapacity();
  }

  hasFreeModuleSlot() {
    return this.moduleCount + this.pendingModules.length < this.getModuleCapacity();
  }

  queueModulePlacement(type) {
    const module = MODULE_TYPES[type];
    if (!module) return false;
    if (!this.hasFreeModuleSlot() || this.getModuleCandidates().length <= this.pendingModules.length) {
      this.toast(`${module.label} icin bos ust parca yok`, this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      this.logEvent("Modul kurmak icin once sali genislet veya bos parca birak.", "warn");
      return false;
    }
    this.pendingModules.push(type);
    this.placingModule = true;
    this.placingRaft = false;
    this.placingNet = false;
    this.placingBeam = false;
    this.movingModuleFrom = null;
    this.movingNetFrom = null;
    this.refreshPlacementMarkers();
    this.toast(`${module.label} hazir. Mavi + ile parca sec.`, this.playerRoot.x, this.playerRoot.y - 70, "#d9fbff");
    return true;
  }

  addInventoryItem(key, amount = 1) {
    return this.inventorySystem.addItem(key, amount);
  }

  canUseItem(key) {
    return this.inventorySystem.canUseItem(key);
  }

  useInventoryItem(key) {
    this.inventorySystem.useItem(key);
  }

  dropInventoryItem(key) {
    this.inventorySystem.dropItem(key);
  }

  moveItemToStorage(key) {
    this.inventorySystem.moveToStorage(key);
  }

  takeItemFromStorage(key) {
    this.inventorySystem.takeFromStorage(key);
  }

  buildWaterCollector() {
    if (this.hasWaterCollector || this.pendingModules.includes("waterCollector")) {
      this.toast("Su toplayici zaten kurulu", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    return this.queueModulePlacement("waterCollector");
  }

  buildWaterDist() {
    if (!this.hasForge) {
      this.toast("Su damitici icin once forge kur", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    if (this.hasWaterDist || this.pendingModules.includes("waterDist")) {
      this.toast("Su damitici zaten kurulu", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    return this.queueModulePlacement("waterDist");
  }

  buildGrill() {
    if (this.hasGrill || this.pendingModules.includes("grill")) {
      this.toast("Ocak zaten kurulu", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    return this.queueModulePlacement("grill");
  }

  buildCrabTrap() {
    return this.queueModulePlacement("crabTrap");
  }

  addChest() {
    return this.queueModulePlacement("chest");
  }

  buildMast() {
    if (this.hasMast || this.pendingModules.includes("mast")) {
      this.toast("Direk zaten kurulu", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    return this.queueModulePlacement("mast");
  }

  buildForge() {
    if (this.hasForge || this.pendingModules.includes("forge")) {
      this.toast("Forge zaten kurulu", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    return this.queueModulePlacement("forge");
  }

  buildBed() {
    return this.queueModulePlacement("bed");
  }

  buildSail() {
    if (!this.hasMast) {
      this.toast("Yelken icin once direk kur", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    if (this.hasSail) {
      this.toast("Yelken zaten kurulu", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    this.hasSail = true;
    this.sailHp = SAIL_TYPES[1].maxHp;
    this.drawSail();
    this.notify("Basit yelken kuruldu. Ruzgari artik daha iyi kullanabilirsin.", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  placeModuleOnTile(tile) {
    if (this.isGameOver) return;
    if (!this.placingModule || this.pendingModules.length <= 0) return;
    const target = this.raftTiles.find((candidate) => candidate.x === tile.x && candidate.y === tile.y);
    if (!target || target.module) return;
    const type = this.pendingModules.shift();
    this.consumeBuildRefund(`module:${type}`);
    target.module = type;
    target.moduleHp = 2;
    this.moduleCount += 1;
    this.applyPlacedModule(type);
    this.recordQuestAction(`${type}Placed`);
    this.placingModule = this.pendingModules.length > 0 && this.getModuleCandidates().length > 0;
    this.drawRaft();
    const message = this.pendingModules.length > 0 ? `${MODULE_TYPES[type].label} kuruldu, siradaki modulu sec` : `${MODULE_TYPES[type].label} kuruldu`;
    this.notify(message, this.playerRoot.x, this.playerRoot.y - 70, "#d9fbff", "good");
    return true;
  }

  moveModuleToTile(tile) {
    const source = this.movingModuleFrom ? this.getRaftTile(this.movingModuleFrom.x, this.movingModuleFrom.y) : null;
    const target = this.getRaftTile(tile.x, tile.y);
    if (!source?.module || !target || target.module || this.isStartingRaftTile(target)) return;
    target.module = source.module;
    target.moduleHp = source.moduleHp ?? 2;
    delete source.module;
    delete source.moduleHp;
    this.cancelRaftEditPlacement(false);
    this.recalculatePlacedModules();
    this.drawRaft();
    this.notify("Modul tasindi.", this.playerRoot.x, this.playerRoot.y - 70, "#d9fbff", "good");
    this.updateHud();
  }

  removeModuleFromTile(tile) {
    const target = this.getRaftTile(tile.x, tile.y);
    if (!target?.module) return;
    if (!this.canRemoveModuleFromTile(target)) {
      const message = target.module === "bed" ? "Tayfa kalacak yer bulmadan yatak sokulemez" : "Sandikta esya varken bu sandik sokulemez";
      this.toast(message, this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return;
    }
    const label = MODULE_TYPES[target.module]?.label ?? "Modul";
    delete target.module;
    delete target.moduleHp;
    this.recalculatePlacedModules();
    this.drawRaft();
    this.renderRaftEditModal();
    this.notify(`${label} sokuldu.`, this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93", "warn");
    this.updateHud();
  }

  applyPlacedModule(type) {
    if (type === "waterCollector") {
      this.hasWaterCollector = true;
    } else if (type === "waterDist") {
      this.hasWaterDist = true;
    } else if (type === "crabTrap") {
      this.crabTrapCount += 1;
    } else if (type === "grill") {
      this.hasGrill = true;
    } else if (type === "chest") {
      this.chests += 1;
    } else if (type === "mast") {
      this.hasMast = true;
    } else if (type === "forge") {
      this.hasForge = true;
      this.recordQuestAction("forgeBuilt");
    } else if (type === "bed") {
      this.beds += 1;
    }
    if (type === "mast") this.drawSail();
  }

  removeNetFromTile(tile) {
    const target = this.getRaftTile(tile.x, tile.y);
    if (!(target?.netHp > 0)) return;
    delete target.netHp;
    this.drawRaft();
    this.renderRaftEditModal();
    this.notify("Toplama agi sokuldu.", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93", "warn");
    this.updateHud();
  }

  moveNetToTile(tile) {
    const source = this.movingNetFrom ? this.getRaftTile(this.movingNetFrom.x, this.movingNetFrom.y) : null;
    const target = this.getRaftTile(tile.x, tile.y);
    if (!(source?.netHp > 0) || !target || this.isCenterTile(target) || target.netHp > 0) return;
    target.netHp = source.netHp;
    delete source.netHp;
    this.cancelRaftEditPlacement(false);
    this.drawRaft();
    this.notify("Toplama agi tasindi.", this.playerRoot.x, this.playerRoot.y - 70, "#d9fbff", "good");
    this.updateHud();
  }

  canRemoveBeamFromTile(tile) {
    if (!(tile?.beamHp > 0)) return false;
    const remaining = this.raftTiles.map((candidate) => {
      if (candidate !== tile) return candidate;
      const copy = { ...candidate };
      delete copy.beamHp;
      return copy;
    });
    return remaining.some((candidate) => candidate.beamHp > 0) && this.areRaftTilesSupported(remaining);
  }

  removeBeamFromTile(tile) {
    const target = this.getRaftTile(tile.x, tile.y);
    if (!this.canRemoveBeamFromTile(target)) {
      this.toast("Bu kiris sokulurse sal destegi bozulur", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return;
    }
    delete target.beamHp;
    this.drawRaft();
    this.notify("Baglanti kirisi sokuldu.", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93", "warn");
    this.updateHud();
  }

  moveBeamToTile(sourceTile, targetTile) {
    const source = this.getRaftTile(sourceTile.x, sourceTile.y);
    const target = this.getRaftTile(targetTile.x, targetTile.y);
    if (!(source?.beamHp > 0) || !target || target.beamHp > 0 || target.netHp > 0) return;
    const candidates = this.getBeamMoveCandidates(source);
    if (!candidates.some((candidate) => candidate.x === target.x && candidate.y === target.y)) return;
    target.beamHp = source.beamHp;
    delete source.beamHp;
    this.drawRaft();
    this.notify("Baglanti kirisi tasindi.", this.playerRoot.x, this.playerRoot.y - 70, "#d9fbff", "good");
    this.updateHud();
  }

  removeRaftTile(tile) {
    const target = this.getRaftTile(tile.x, tile.y);
    if (!this.canRemoveRaftTile(target)) {
      this.toast("Bu parca silinemez. Once modul/agi sok veya baglantiyi koru.", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return;
    }
    this.raftTiles = this.raftTiles.filter((candidate) => candidate !== target);
    this.raftLevel = this.raftTiles.length;
    this.recalculatePlacedModules();
    this.drawRaft();
    this.renderRaftEditModal();
    this.notify("Sal parcasi sokuldu.", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93", "warn");
    this.updateHud();
  }

  unlockCraftingKit() {
    this.hasCraftingKit = true;
    this.notify("Uretim kiti hazir. Adada uretim ve sal tamiri acildi.", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  unlockFlask() {
    this.hasFlask = true;
    this.flaskWater = Math.max(this.flaskWater, 1);
    this.notify("Basit matara hazir. Limandan veya su toplayicidan su doldurabilirsin.", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  unlockTorch() {
    this.hasTorch = true;
    this.updateTorchVisual(this.nightOverlay?.alpha ?? 0);
    this.notify("Basit mesale hazir. Gece gorusun biraz artti.", this.playerRoot.x, this.playerRoot.y - 70, "#ffd18c", "good");
    return true;
  }

  unlockAxe() {
    this.hasAxe = true;
    this.notify("Basit balta hazir. Adalardaki agaclari kesebilirsin.", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  unlockPickaxe() {
    this.hasPickaxe = true;
    this.notify("Basit kazma hazir. Adalardaki maden damarlarini kazabilirsin.", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  unlockForge() {
    this.hasForge = true;
    this.notify("Basit forge hazir. Kum eritip cam uretebilirsin.", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  fillFlask(source = "Su dolduruldu") {
    if (!this.hasFlask) {
      this.toast("Once Basit Matara yap", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    if (this.flaskWater >= this.maxFlaskWater) {
      this.toast("Matara zaten dolu", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    this.flaskWater = this.maxFlaskWater;
    this.recordQuestAction("flaskFilled");
    this.notify(`${source}. Matara ${this.flaskWater}/${this.maxFlaskWater}`, this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    this.updateHud();
    return true;
  }

  drinkFromFlask() {
    if (!this.hasFlask || this.flaskWater <= 0) return false;
    this.flaskWater -= 1;
    this.stats.thirst = Math.min(100, this.stats.thirst + 18);
    this.logEvent("Mataradan su icildi.", "good");
    this.updateHud();
    return true;
  }

  repairRaft(spendCost = false) {
    if (!this.hasCraftingKit) return false;
    if (spendCost && !this.canAfford({ branch: 1, plastic: 1 })) {
      this.toast("Tamir icin 1 dal + 1 plastik gerekli", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    if (spendCost) {
      this.inventory.branch -= 1;
      this.inventory.plastic -= 1;
    }
    const before = this.raftIntegrity;
    this.raftIntegrity = Math.min(100, this.raftIntegrity + 22);
    const damagedTile = this.raftTiles
      .filter((tile) => (tile.hp ?? this.getMaxTileHp(tile)) < this.getMaxTileHp(tile))
      .sort((a, b) => (a.hp ?? this.getMaxTileHp(a)) - (b.hp ?? this.getMaxTileHp(b)))[0];
    if (damagedTile) {
      damagedTile.hp = Math.min(this.getMaxTileHp(damagedTile), (damagedTile.hp ?? 1) + 1);
      this.drawRaft();
    }
    this.notify(`Sal tamir edildi. ${Math.round(before)} -> ${Math.round(this.raftIntegrity)}`, this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    this.updateHud();
    this.updateQuickRepairButton();
    return true;
  }

  tryQuickRepair() {
    if (this.isGameOver || this.isOnIsland) return;
    this.repairRaft(true);
  }

  cookFish() {
    if (!this.hasGrill) {
      this.toast("Balik pisirmek icin ocak gerekli", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return;
    }
    this.inventory.cookedFish += 1;
    this.recordQuestAction("fishCooked");
    this.notify("Balik pisirildi.", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
  }

  cookShellfish() {
    if (!this.hasGrill) {
      this.toast("Kabuklu pisirmek icin ocak gerekli", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    const source = ["lobster", "crab", "shrimp"].find((key) => (this.inventory[key] ?? 0) > 0);
    if (!source) {
      this.toast("Pisirilecek kabuklu av yok", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    this.inventory[source] -= 1;
    this.inventory.cookedMeat = (this.inventory.cookedMeat ?? 0) + (source === "lobster" ? 2 : 1);
    this.notify(`${ITEM_LABELS[source]} pisirildi.`, this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  unlockCompass() {
    this.hasCompass = true;
    this.notify("Pusula hazir. Ruzgar yonu ve sal hizi gorunur oldu.", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  unlockSpyglass() {
    this.hasSpyglass = true;
    this.notify("Durbun hazir. Direkten bakinca hedef mesafesi daha net gorunur.", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  handleContextAction() {
    if (this.isGameOver) return;
    this.actionMenu.classList.remove("open");
    this.toggleAnchor();
  }

  handleEntryAction() {
    if (this.isGameOver) return;
    this.actionMenu.classList.remove("open");
    this.worldSystem.checkNearbyLocations();
    if (this.nearSurvivor) {
      this.crewSystem.rescueNearby();
      return;
    }
    if (this.nearCity) {
      this.openCityModal();
      return;
    }
    if (this.nearPort) {
      this.openTradeModal();
      return;
    }
    if (this.nearIsland) {
      this.enterIslandFromSea();
      return;
    }
    this.toast("Giris icin ada, liman, sehir veya kazazedeye yaklas", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
  }

  toggleAnchor() {
    if (this.isGameOver || this.isOnIsland) return;
    this.isAnchored = !this.isAnchored;
    this.velocity.set(0, 0);
    this.updateActionLabels();
    this.notify(this.isAnchored ? "Capa atildi" : "Capa alindi", this.playerRoot.x, this.playerRoot.y - 70, "#d6f7ff", this.isAnchored ? "warn" : "info");
  }

  enterIslandFromSea() {
    if (this.islandSystem.enterFromSea()) this.startIslandExplore();
  }

  startIslandExplore() {
    if (!this.currentIsland || this.isGameOver) return;
    this.closeCraftModal();
    this.closeInventoryModal();
    this.closeCrewModal();
    this.closeFishingModal(false);
    this.islandModal?.classList.remove("open");
    if (this.uiRoot) this.uiRoot.style.display = "none";
    this.scene.launch("island", {
      parentScene: this,
      island: this.currentIsland
    });
    this.scene.pause();
  }

  finishIslandExplore(result = {}) {
    this.islandCraftScene = null;
    if (this.uiRoot) this.uiRoot.style.display = "";
    this.scene.resume();
    if (result.gained && Object.keys(result.gained).length > 0) {
      const parts = Object.entries(result.gained).map(([key, amount]) => `${ITEM_LABELS[key] ?? key} +${amount}`);
      this.notify(`Ada kesfi: ${parts.join(", ")}`, this.playerRoot.x, this.playerRoot.y - 70, "#fff0aa", "good");
    }
    if (this.currentIsland && Object.values(this.currentIsland.meta.loot).every((value) => value <= 0)) {
      this.islandSystem.markDepletedIfNeeded(this.currentIsland);
    }
    this.islandSystem.leave();
    this.updateActionLabels();
    this.updateHud();
  }

  closeIslandModal() {
    this.islandModal?.classList.remove("open");
    this.islandSystem.leave();
  }

  renderIslandModal() {
    if (!this.currentIsland) return;
    const riskSummary = this.islandModal.querySelector(".island-risk-summary");
    if (riskSummary) {
      const riskLabel = this.currentIsland.meta.riskLabel ?? "Guvenli Sular";
      const riskMultiplier = this.currentIsland.meta.riskMultiplier ?? 1;
      riskSummary.textContent = `${this.currentIsland.meta.name} / ${riskLabel} / Tehlike x${riskMultiplier}`;
    }
    this.islandModal.querySelectorAll(".island-action").forEach((button) => {
      const state = this.islandSystem.getResourceState(button.dataset.action);
      button.disabled = state.disabled;
      button.querySelector(".recipe-state").textContent = state.stateText;
    });
    const restButton = this.islandModal.querySelector(".island-rest");
    if (restButton) {
      const state = this.islandSystem.getRestState();
      restButton.disabled = state.disabled;
      restButton.querySelector(".recipe-state").textContent = state.stateText;
    }
  }

  collectIslandResource(resource) {
    if (!this.islandSystem.collectResource(resource)) return;
    this.renderIslandModal();
    this.updateHud();
  }

  restOnIsland() {
    if (!this.islandSystem.rest()) return;
    this.renderIslandModal();
    this.updateHud();
  }

  getNearbySharks(maxDistance = 900) {
    return this.threatSystem.getNearby(maxDistance);
  }

  scatterNearbySharks(sharks = this.getNearbySharks(900)) {
    return this.threatSystem.scatter(sharks);
  }

  moveSharkAway(shark, dt) {
    this.threatSystem.moveAway(shark, dt);
  }

  moveSharkIdle(shark, dt) {
    this.threatSystem.moveIdle(shark, dt);
  }

  addRaftPiece() {
    if (this.getBuildCandidates().length <= this.pendingRaftPieces) {
      this.toast("Genislemek icin uygun kiris alani yok", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      this.logEvent("Yeni sal parcasi icin once uygun noktaya Baglanti Kirisi kur.", "warn");
      return false;
    }
    this.pendingRaftPieces += 1;
    this.placingRaft = true;
    this.placingNet = false;
    this.placingBeam = false;
    this.placingModule = false;
    this.movingModuleFrom = null;
    this.movingNetFrom = null;
    this.refreshPlacementMarkers();
    this.toast("Sal parcasi hazir", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7");
  }

  toggleRaftPlacement() {
    if (this.isGameOver) return;
    if (this.pendingRaftPieces <= 0) {
      this.placingRaft = false;
      this.refreshPlacementMarkers();
      this.toast("Once sal parcasi craft et", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return;
    }
    this.placingRaft = !this.placingRaft;
    if (this.placingRaft) {
      this.placingNet = false;
      this.placingBeam = false;
      this.placingModule = false;
      this.movingModuleFrom = null;
      this.movingNetFrom = null;
    }
    this.refreshPlacementMarkers();
    this.toast(this.placingRaft ? "Yerlestirme acik" : "Yerlestirme kapali", this.playerRoot.x, this.playerRoot.y - 70, "#d6f7ff");
  }

  placeRaftTile(tile) {
    if (this.isGameOver) return;
    if (this.pendingRaftPieces <= 0 || !this.placingRaft) return;
    if (!this.isWithinRaftBounds(tile.x, tile.y)) return;
    if (this.raftTiles.some((existing) => existing.x === tile.x && existing.y === tile.y)) return;

    this.raftTiles.push({ x: tile.x, y: tile.y, hp: 2 });
    this.consumeBuildRefund("raft");
    this.pendingRaftPieces -= 1;
    this.raftLevel = this.raftTiles.length;
    this.placingRaft = this.pendingRaftPieces > 0;
    this.drawRaft();
    this.recordQuestAction("raftPiecePlaced");
    this.checkQuestProgress();
    const message = this.pendingRaftPieces > 0 ? "Parca yerlestirildi, siradaki parcayi sec" : "Parca yerlestirildi";
    this.toast(message, this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7");
  }

  addNet() {
    if (this.getNetCandidates().length <= this.pendingNets) {
      this.toast("Ag takmak icin bos sal parcasi yok", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      this.logEvent("Toplama agi icin once sali genislet ya da agsiz parca birak.", "warn");
      return false;
    }
    this.pendingNets += 1;
    this.placingNet = true;
    this.placingRaft = false;
    this.placingBeam = false;
    this.placingModule = false;
    this.movingModuleFrom = null;
    this.movingNetFrom = null;
    this.refreshPlacementMarkers();
    this.toast("Toplama agi hazir. Sari + ile parca sec.", this.playerRoot.x, this.playerRoot.y - 70, "#fff0aa");
    return true;
  }

  addBeam() {
    if (this.getBeamCandidates().length <= this.pendingBeams) {
      this.toast("Kiris kurmak icin uygun sal parcasi yok", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    this.pendingBeams += 1;
    this.placingBeam = true;
    this.placingRaft = false;
    this.placingNet = false;
    this.placingModule = false;
    this.movingModuleFrom = null;
    this.movingNetFrom = null;
    this.refreshPlacementMarkers();
    this.toast("Baglanti kirisi hazir. Kahverengi + ile parca sec.", this.playerRoot.x, this.playerRoot.y - 70, "#ffdf9d");
    return true;
  }

  placeBeamOnTile(tile) {
    if (this.isGameOver) return;
    if (this.pendingBeams <= 0 || !this.placingBeam) return;
    const target = this.getRaftTile(tile.x, tile.y);
    if (!target || target.beamHp > 0 || target.netHp > 0) return;
    target.beamHp = 3;
    this.consumeBuildRefund("beam");
    this.pendingBeams -= 1;
    this.placingBeam = this.pendingBeams > 0 && this.getBeamCandidates().length > 0;
    this.drawRaft();
    this.recordQuestAction("beamPlaced");
    const message = this.pendingBeams > 0 ? "Kiris kuruldu, siradaki parcayi sec" : "Kiris kuruldu";
    this.notify(message, this.playerRoot.x, this.playerRoot.y - 70, "#ffdf9d", "good");
    this.updateHud();
    return true;
  }

  placeNetOnTile(tile) {
    if (this.isGameOver) return;
    if (this.pendingNets <= 0 || !this.placingNet) return;
    const target = this.raftTiles.find((candidate) => candidate.x === tile.x && candidate.y === tile.y);
    if (!target || this.isCenterTile(target) || target.netHp > 0 || target.beamHp > 0) return;
    target.netHp = 2;
    this.consumeBuildRefund("net");
    this.pendingNets -= 1;
    this.placingNet = this.pendingNets > 0 && this.getNetCandidates().length > 0;
    if (this.pendingNets > 0 && this.getNetCandidates().length <= 0) {
      this.logEvent("Hazir ag var ama takilacak bos sal parcasi kalmadi.", "warn");
    }
    this.drawRaft();
    this.recordQuestAction("netPlaced");
    const message = this.pendingNets > 0 ? "Ag takildi, siradaki parcayi sec" : "Ag takildi";
    this.toast(message, this.playerRoot.x, this.playerRoot.y - 70, "#fff0aa");
    return true;
  }

  getActiveNetCount() {
    return this.raftTiles.filter((tile) => tile.netHp > 0).length;
  }

  damageRaftNet() {
    return this.threatSystem.damageRaftNet();
  }

  unlockFishing() {
    this.hasFishingRod = true;
    this.toast("Olta hazir", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7");
  }

  upgradeFishingLine(level) {
    if (this.fishingLineLevel >= level) {
      this.toast("Misina zaten hazir", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    this.fishingLineLevel = level;
    this.notify(`${this.getFishingLine().label} hazir. Buyuk baliklara daha uzun dayanirsin.`, this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  upgradeFishingRod(level) {
    if (this.fishingRodLevel >= level) {
      this.toast("Olta zaten guclu", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    this.fishingRodLevel = level;
    this.notify(`${this.getFishingRod().label} hazir. Cekis gucun artti.`, this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  addFishingBait(amount) {
    this.fishingBait += amount;
    this.notify(`Balik yemi +${amount}. Cop ihtimali azalir.`, this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  getActiveQuest() {
    return this.questSystem.getActiveQuest();
  }

  markQuestFlag(flag) {
    this.questSystem.markFlag(flag);
  }

  recordQuestAction(action, amount = 1) {
    return this.questSystem.recordAction(action, amount);
  }

  checkQuestProgress() {
    this.questSystem.checkProgress();
  }

  revealMeridiaForQuest() {
    const meridia = STATIC_CITIES.find((city) => city.id === "meridia");
    if (!meridia) return;
    const entry = this.discoverLocation("city", meridia.x, meridia.y, meridia.name);
    if (this.hasCompass && entry) this.followDiscovery(entry.id);
  }

  revealTestCity() {
    const city = STATIC_CITIES[0];
    if (!city) return;
    const entry = this.discoverLocation("city", city.x, city.y, city.name);
    if (entry) this.followedDiscoveryId = entry.id;
  }

  resetProceduralWorld() {
    this.items?.clear(true, true);
    this.diveZones?.clear(true, true);
    this.fishSchools?.clear(true, true);
    this.threats?.clear(true, true);
    this.worldSystem?.generatedChunks?.clear();
    this.worldSystem?.ensureChunksAroundPlayer(2);
    for (let i = 0; i < 2; i += 1) this.spawnShark();
  }

  applyQuestReward(reward) {
    this.questSystem.applyReward(reward);
  }

  unlockHarpoon() {
    this.hasHarpoon = true;
    this.notify("Basit zipkin hazir. Kopek baligi yaklasirsa Saldir aktif olur.", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
  }

  unlockDiveMask() {
    this.hasDiveMask = true;
    this.notify("Dalis maskesi hazir. Dalis oksijeni ve gorus artti.", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
  }

  unlockDiveTank() {
    this.hasDiveTank = true;
    this.notify("Basit dalis tupu hazir. Derin su dalislari acildi.", this.playerRoot.x, this.playerRoot.y - 70, "#bff4c7", "good");
  }

  getNearestThreat(maxDistance = 220) {
    return this.threatSystem.getNearest(maxDistance);
  }

  ensureTutorialShark() {
    if (this.isGameOver || this.getNearbySharks(850).length > 0) return;
    const angle = this.playerRoot.rotation + Phaser.Math.FloatBetween(-0.7, 0.7);
    const distance = Phaser.Math.Between(520, 620);
    const x = this.playerRoot.x + Math.cos(angle) * distance;
    const y = this.playerRoot.y + Math.sin(angle) * distance;
    this.spawnShark(x, y, 35, { band: "safe" });
    this.notify("Suda bir kopek baligi dolasiyor. Zipkinini hazirla.", this.playerRoot.x, this.playerRoot.y - 78, "#fff0aa", "warn");
  }

  tryAttackShark() {
    this.threatSystem.tryAttack();
    this.updateActionLabels();
  }

  forceSharkRetreat(shark) {
    this.threatSystem.forceRetreat(shark);
  }

  tryFishing() {
    if (this.isGameOver) return;
    if (!this.hasFishingRod) {
      this.toast("Once olta craft et", this.playerRoot.x, this.playerRoot.y - 70, "#ffcc93");
      return;
    }
    const roll = Phaser.Math.Between(1, 100);
    if (roll > 28) {
      const amount = roll > 92 ? 2 : 1;
      if (this.addInventoryItem("fish", amount)) {
        this.stats.hunger = Math.min(100, this.stats.hunger + 4);
        this.toast(amount > 1 ? "Nadir balik yakalandi" : "Balik yakalandi", this.playerRoot.x, this.playerRoot.y - 70, "#c4f6ff");
      }
    } else {
      this.toast("Balik kacirdi", this.playerRoot.x, this.playerRoot.y - 70, "#c9d7df");
    }
    this.updateHud();
  }

  changeWeatherBeat() {
    this.weatherSystem.changeBeat();
  }

  rollWeatherState() {
    this.weatherSystem.rollWeatherState();
  }

  passiveSurvivalTick() {
    this.weatherSystem.passiveSurvivalTick();
    this.crewSystem.survivalTick();
    this.updateCrabTraps(4);
  }

  updateCrabTraps(seconds = 0) {
    if (this.crabTrapCount <= 0 || this.isGameOver || this.isOnIsland) return;
    if (!this.isAnchored) {
      if (this.time.now - this.lastCrabTrapPauseLog > 45000) {
        this.lastCrabTrapPauseLog = this.time.now;
        this.logEvent("Yengec kafesi icin capa atmak gerekiyor.", "info");
      }
      return;
    }
    const risk = this.getRiskMultiplier();
    this.crabTrapTimer += seconds * this.crabTrapCount * Phaser.Math.Clamp(risk, 1, 2.4);
    const interval = 72;
    if (this.crabTrapTimer < interval) return;
    this.crabTrapTimer -= interval;
    const catchCount = Math.min(2, Math.max(1, Math.floor(this.crabTrapCount / 2)));
    for (let i = 0; i < catchCount; i += 1) {
      this.rollCrabTrapCatch();
    }
    this.updateHud();
  }

  rollCrabTrapCatch() {
    const total = CRAB_TRAP_LOOT.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Phaser.Math.Between(1, total);
    const result = CRAB_TRAP_LOOT.find((entry) => {
      roll -= entry.weight;
      return roll <= 0;
    });
    if (!result?.key) {
      this.logEvent("Yengec kafesi bos cikti.", "info");
      return false;
    }
    if (!this.addInventoryItem(result.key, 1)) {
      this.logEvent(`Yengec kafesi ${result.label} yakaladi ama envanter dolu.`, "warn");
      return false;
    }
    this.logEvent(`Yengec kafesi: ${result.label} yakalandi.`, result.key === "lobster" ? "good" : "info");
    return true;
  }

  resolveWeatherRaftStress(weather, sea) {
    this.weatherSystem.resolveRaftStress(weather, sea);
  }

  checkGameOver() {
    if (this.isGameOver || this.stats.hp > 0) return;
    this.isGameOver = true;
    this.stats.hp = 0;
    this.velocity.set(0, 0);
    this.placingRaft = false;
    this.placingNet = false;
    this.placingModule = false;
    this.refreshPlacementMarkers();
    this.gameOverDom?.classList.add("open");
    this.actionMenu?.classList.remove("open");
    this.closeCraftModal();
    this.closeInventoryModal();
    this.closeCrewModal();
    this.closeFishingModal(false);
    this.closeDiveModal();
    this.closeIslandModal();
    this.toast("Yolculuk bitti", this.playerRoot.x, this.playerRoot.y - 80, "#ffb0a2");
  }

  toast(message, x, y, color) {
    const text = this.add.text(x, y, message, {
      fontSize: "14px",
      color,
      stroke: "#06202a",
      strokeThickness: 4
    }).setDepth(80).setOrigin(0.5);
    this.floatingTexts.add(text);
  }

  logEvent(message, type = "info") {
    this.hudUI.logEvent(message, type);
  }

  renderEventLog() {
    this.hudUI.renderEventLog();
  }

  notify(message, x, y, color, type = "info") {
    this.logEvent(message, type);
  }

  getWindDirectionName() {
    const angle = Phaser.Math.RadToDeg(this.wind.angle());
    const normalized = (angle + 360) % 360;
    const names = ["Doguya", "Guneydoguya", "Guneye", "Guneybatiya", "Batiya", "Kuzeybatiya", "Kuzeye", "Kuzeydoguya"];
    return names[Math.round(normalized / 45) % 8];
  }

  getWindSailingState() {
    if (!this.windEnabled || this.velocity.length() < 12) return "beklemede";
    if (!this.hasSail) return "yelken yok";
    const alignment = this.getWindAlignment();
    if (alignment > 0.45) return "avantaj";
    if (alignment < -0.35) return "ters";
    return "yan ruzgar";
  }

  getWindAlignment() {
    return this.sailingAlignment;
  }

  getSpeedLabel() {
    const speed = this.velocity.length();
    if (this.isAnchored || this.isOnIsland || speed < 10) return "duruyor";
    if (speed < 28) return "cok yavas";
    if (speed < 58) return "yavas";
    if (speed < 94) return "normal";
    if (speed < 132) return "hizli";
    return "cok hizli";
  }

  getWeatherLabel() {
    return WEATHER_STATES[this.weatherState]?.label ?? "Gunesli";
  }

  getSeaLabel() {
    return SEA_STATES[this.seaState]?.label ?? "Duz";
  }

  getWindArrow() {
    const angle = Phaser.Math.RadToDeg(this.wind.angle());
    const normalized = (angle + 360) % 360;
    const arrows = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
    return arrows[Math.round(normalized / 45) % 8];
  }

  getContractCompassTarget() {
    return this.contractSystem.getCompassTarget();
  }

  getFollowedDiscoveryTarget() {
    return this.discoverySystem.getFollowedTarget();
  }

  getCompassTarget() {
    return this.getFollowedDiscoveryTarget() ?? this.getContractCompassTarget();
  }

  getTargetDistanceLabel(distance) {
    if (distance < 650) return "yakin";
    if (distance < 1400) return "orta";
    if (distance < 2400) return "uzak";
    return "cok uzak";
  }

  getCompassTargetDistanceText(distance) {
    if (this.hasMast && this.hasSpyglass) {
      return `~${Math.round(distance / 50) * 50}m`;
    }
    if (this.hasMast) {
      return `${this.getTargetDistanceLabel(distance)} menzil`;
    }
    return this.getTargetDistanceLabel(distance);
  }

  updateContractCompass() {
    if (!this.compassBar || !this.compassTargetMarker || !this.compassTargetText) return;
    const compassVisible = Boolean(this.hasCompass);
    this.compassBar.setVisible(compassVisible);
    if (!compassVisible) return;

    const halfWidth = 164;
    const forwardAngle = Phaser.Math.Angle.Wrap(this.playerRoot.rotation - Math.PI / 2);
    this.compassCardinals.forEach((item) => {
      const relative = Phaser.Math.Angle.Wrap(item.angle - forwardAngle);
      const visible = Math.abs(relative) <= Math.PI;
      item.text.setVisible(visible);
      item.text.setPosition(Phaser.Math.Clamp((relative / Math.PI) * halfWidth, -halfWidth, halfWidth), -8);
    });

    const target = this.getCompassTarget();
    const visible = Boolean(target);
    this.compassTargetMarker.setVisible(visible);
    this.compassTargetText.setVisible(visible);
    if (!visible) return;

    const angle = Phaser.Math.Angle.Between(this.playerRoot.x, this.playerRoot.y, target.x, target.y);
    const relative = Phaser.Math.Angle.Wrap(angle - forwardAngle);
    const markerX = Phaser.Math.Clamp((relative / Math.PI) * halfWidth, -halfWidth, halfWidth);
    this.compassTargetMarker.setPosition(markerX, -10);
    this.compassTargetText.setPosition(markerX, 9);
    this.compassTargetText.setText(`${target.label} ${this.getCompassTargetDistanceText(target.distance)}`);
  }

  updateHud() {
    const stats = this.stats;
    this.statText.setText(
      `Can ${Math.round(stats.hp)}  Su ${Math.round(stats.thirst)}  Aclik ${Math.round(stats.hunger)}\n` +
        `Moral ${Math.round(stats.morale)}  Altin ${this.gold}  Sal ${this.raftTiles.length}/${this.getRaftTileLimit()}  Tayfa ${this.getCrewCount()}/${this.getCrewCapacity()}  Hiz ${this.getSpeedLabel()}\n` +
        `Hava ${this.getWeatherLabel()}  Deniz ${this.getSeaLabel()}`
    );
    this.invText.setText(
      `Dal ${this.inventory.branch}   Yaprak ${this.inventory.leaf}   Plastik ${this.inventory.plastic}\n` +
        `Kutuk ${this.inventory.log}   Meyve ${this.inventory.fruit}   Hurda ${this.inventory.scrap}   Balik ${this.inventory.fish}\n` +
        `Tas ${this.inventory.stone}   Kum ${this.inventory.sand}   Maden ${this.inventory.ore}   Mercan ${this.inventory.coral}   Yuk ${this.getInventoryLoad()}/${this.getCarryCapacity()}`
    );
    const direction = Math.round(Phaser.Math.RadToDeg(this.wind.angle()));
    this.windText.setVisible(this.windEnabled && this.hasCompass);
    this.windText.setText(`Pusula ${this.getWindArrow()}  Ruzgar ${this.getWindDirectionName()} ${direction} derece\nGuc ${this.windPower.toFixed(2)}  Seyir ${this.getWindSailingState()}  Deniz ${this.getSeaLabel()}`);
    this.updateContractCompass();
    const quest = this.getActiveQuest();
    this.questText.setText(quest ? `Gorev: ${quest.title}\n${quest.detail}` : "Gorevler tamamlandi.\nYeni kontratlar limanlarda acilacak.");
    this.updateDomHud();
    this.updateActionLabels();
  }

  updateDomHud() {
    this.hudUI.update();
  }

  updateActionLabels() {
    if (this.contextButton) {
      this.contextButton.title = this.isAnchored ? "Capa Al" : "Capa At";
      this.contextButton.classList.toggle("is-anchored", this.isAnchored);
      this.contextButton.classList.toggle("is-anchor-down", this.isAnchored);
      this.contextButton.classList.toggle("is-near-location", false);
      const contextIcon = this.contextButton.querySelector("img");
      if (contextIcon) {
        contextIcon.src = this.isAnchored ? "/assets/ui/menu/anchor-up.png" : "/assets/ui/menu/anchor-down.png";
      }
    }
    if (this.entryButton) {
      const nearLocation = Boolean(this.nearSurvivor || this.nearCity || this.nearPort || this.nearIsland);
      this.entryButton.title = this.nearSurvivor ? "Kazazedeyi Kurtar" : this.nearCity ? "Sehre Gir" : this.nearPort ? "Limana Gir" : this.nearIsland ? "Adaya Cik" : "Giris";
      this.entryButton.classList.toggle("visible", nearLocation && !this.isGameOver && !this.isOnIsland);
      this.entryButton.classList.toggle("is-port", !this.nearSurvivor && Boolean(this.nearCity || this.nearPort));
      this.entryButton.classList.toggle("is-island", !this.nearSurvivor && !this.nearCity && !this.nearPort && Boolean(this.nearIsland));
      this.entryButton.classList.toggle("is-survivor", Boolean(this.nearSurvivor));
    }
    if (this.diveButton) {
      this.diveButton.classList.toggle("is-disabled", !this.isAnchored);
    }
    if (this.quickDiveButton) {
      this.quickDiveButton.classList.toggle("visible", this.isAnchored && !this.isGameOver && !this.isOnIsland);
    }
    this.updateQuickAttackButton();
  }

  getWeatherHudIcon() {
    if (this.weatherState === "storm") return "ϟ";
    if (this.weatherState === "rain") return "☂";
    if (this.weatherState === "cloudy") return "☁";
    return "☀";
  }

  getSeaHudIcon() {
    if (this.seaState === "rough") return "≋";
    if (this.seaState === "choppy") return "≈";
    return "─";
  }
}
const config = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#07151f",
  resolution: RENDER_RESOLUTION,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight
  },
  input: {
    activePointers: 3
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
    powerPreference: "low-power"
  },
  scene: [WaybornScene, IslandScene, CityScene, UnderwaterScene]
};

new Phaser.Game(config);



