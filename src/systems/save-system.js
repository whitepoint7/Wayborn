import { SAVE_KEY } from "../data/config.js";

export class SaveSystem {
  constructor(scene) {
    this.scene = scene;
  }

  createData() {
    const scene = this.scene;
    return {
      version: 1,
      savedAt: Date.now(),
      worldSeed: scene.worldSeed,
      worldSeedCode: scene.worldSeedCode,
      inventory: scene.pickItemCounts(scene.inventory),
      storage: scene.pickItemCounts(scene.storage),
      stats: { ...scene.stats },
      gold: scene.gold,
      crew: scene.crew.map((member) => ({ ...member })),
      quests: {
        sequenceVersion: 3,
        index: scene.questIndex,
        activeId: scene.getActiveQuest()?.id ?? null,
        flags: { ...scene.questFlags },
        progress: { ...scene.questProgress }
      },
      contracts: scene.portContracts.map((contract) => ({ id: contract.id, origin: contract.origin, accepted: contract.accepted })),
      discoveries: scene.discoveries.map((entry) => ({ ...entry })),
      followedDiscoveryId: scene.followedDiscoveryId,
      raftLimitLevel: scene.raftLimitLevel,
      raftIntegrity: scene.raftIntegrity,
      raftTiles: scene.raftTiles.map((tile) => ({
        x: tile.x,
        y: tile.y,
        hp: tile.hp,
        netHp: tile.netHp,
        beamHp: tile.beamHp,
        module: tile.module,
        moduleHp: tile.moduleHp
      })),
      player: {
        x: scene.playerRoot.x,
        y: scene.playerRoot.y,
        rotation: scene.playerRoot.rotation
      },
      velocity: { x: scene.velocity.x, y: scene.velocity.y },
      unlocks: {
        hasCompass: scene.hasCompass,
        hasFlask: scene.hasFlask,
        flaskWater: scene.flaskWater,
        maxFlaskWater: scene.maxFlaskWater,
        hasSail: scene.hasSail,
        sailHp: scene.sailHp,
        hasSpyglass: scene.hasSpyglass,
        hasForge: scene.hasForge,
        hasCraftingKit: scene.hasCraftingKit,
        hasTorch: scene.hasTorch,
        hasAxe: scene.hasAxe,
        hasPickaxe: scene.hasPickaxe,
        hasFishingRod: scene.hasFishingRod,
        fishingLineLevel: scene.fishingLineLevel,
        fishingRodLevel: scene.fishingRodLevel,
        fishingBait: scene.fishingBait,
        hasHarpoon: scene.hasHarpoon,
        hasDiveMask: scene.hasDiveMask,
        hasDiveTank: scene.hasDiveTank
      },
      diveMemory: {
        cooldownRemaining: Math.max(0, scene.diveCooldownUntil - scene.time.now),
        fatigue: scene.diveFatigue,
        lastAreaKey: scene.lastDiveAreaKey,
        areaPressure: scene.diveAreaPressure
      },
      waterReserve: scene.waterReserve,
      maxWaterReserve: scene.maxWaterReserve,
      waterDistTimer: scene.waterDistTimer,
      crabTrap: {
        timer: scene.crabTrapTimer
      },
      wind: { x: scene.wind.x, y: scene.wind.y, power: scene.windPower },
      weather: {
        state: scene.weatherState,
        sea: scene.seaState,
        plan: scene.weatherPlan ? { ...scene.weatherPlan } : null
      },
      worldTime: {
        day: scene.worldDay,
        progress: scene.dayProgress
      },
      lastWindLogPower: scene.lastWindLogPower,
      tutorial: {
        hasSeenIntroLog: scene.hasSeenIntroLog
      }
    };
  }

  save() {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(this.createData()));
  }

  load() {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
