import Phaser from "phaser";
import { FISHING_GEAR, FISH_TARGETS } from "../data/fishing.js";

export class FishingSystem {
  constructor(scene) {
    this.scene = scene;
  }

  createState() {
    const target = this.rollTarget();
    return {
      target,
      progress: Phaser.Math.Between(target.startMin, target.startMax),
      tension: Phaser.Math.Between(16, 28),
      stamina: target.stamina,
      turns: 0,
      lastFishPull: 0
    };
  }

  pull() {
    const scene = this.scene;
    if (!scene.fishingState) return;
    const target = scene.fishingState.target;
    const rod = this.getRod();
    const line = this.getLine();
    const playerPull = Phaser.Math.Between(target.playerPullMin, target.playerPullMax) + rod.pullBonus;
    scene.fishingState.progress += playerPull;
    scene.fishingState.tension += Math.ceil(Phaser.Math.Between(target.tensionGain - 2, target.tensionGain + 4) * line.tensionMultiplier);
    scene.fishingState.stamina = Math.max(0, scene.fishingState.stamina - Phaser.Math.Between(8 + rod.staminaDamage, 14 + rod.staminaDamage));
    const fishPull = this.applyFishCounterPull();
    scene.resolveFishingStep(`Cektin +${playerPull}, ${scene.fishingState.lastMoveLabel} -${fishPull}.`);
  }

  release() {
    const scene = this.scene;
    if (!scene.fishingState) return;
    const target = scene.fishingState.target;
    const line = this.getLine();
    const relief = Phaser.Math.Between(Math.max(8, target.releaseRelief - 5), target.releaseRelief + 4);
    scene.fishingState.tension = Math.max(0, scene.fishingState.tension - relief);
    scene.fishingState.stamina = Math.max(0, scene.fishingState.stamina - Phaser.Math.Between(3, 7));
    const fishPull = this.applyFishCounterPull(0.65);
    if (scene.fishingState.lastMove === "burst") {
      scene.fishingState.tension = Math.max(0, scene.fishingState.tension - Math.ceil(10 * (1 / line.tensionMultiplier)));
    }
    scene.resolveFishingStep(`Misina gevsetildi. Gerginlik -${relief}, ${scene.fishingState.lastMoveLabel} -${fishPull}.`);
  }

  applyFishCounterPull(multiplier = 1) {
    const scene = this.scene;
    const state = scene.fishingState;
    const target = state.target;
    const line = this.getLine();
    const staminaRatio = target.stamina > 0 ? state.stamina / target.stamina : 0;
    const move = this.rollFishMove(staminaRatio, multiplier < 1);
    const staminaFactor = Phaser.Math.Clamp(0.35 + staminaRatio, 0.35, 1.15);
    const fishPull = Math.ceil(Phaser.Math.Between(target.pullMin, target.pullMax) * staminaFactor * move.multiplier * multiplier);
    state.lastFishPull = fishPull;
    state.lastMove = move.key;
    state.lastMoveLabel = move.label;
    state.progress -= fishPull;
    state.tension += Math.ceil(fishPull * move.tension * line.tensionMultiplier);
    return fishPull;
  }

  rollFishMove(staminaRatio, isReleasing) {
    if (staminaRatio < 0.22) return { key: "tired", label: "balik yoruldu", multiplier: 0.55, tension: 0.12 };
    const roll = Phaser.Math.Between(1, 100);
    if (roll <= 24) return { key: "calm", label: "balik sakin cekti", multiplier: 0.55, tension: 0.12 };
    if (roll >= (isReleasing ? 92 : 78)) return { key: "burst", label: "balik ani hamle yapti", multiplier: 1.35, tension: 0.32 };
    return { key: "steady", label: "balik geri cekti", multiplier: 0.9, tension: 0.2 };
  }

  rollTarget() {
    const scene = this.scene;
    const line = this.getLine();
    const usingBait = scene.fishingBait > 0;
    if (usingBait) scene.fishingBait -= 1;
    let pool = FISH_TARGETS.map((target) => {
      let weight = target.weight;
      if (target.tier > line.maxTier) weight = Math.max(1, Math.floor(weight * 0.18));
      if (target.tier >= line.maxTier + 2) weight = 0;
      if (usingBait && target.kind === "trash") weight = Math.floor(weight * 0.25);
      if (usingBait && target.kind === "fish") weight += 8 + target.tier * 2;
      return { ...target, weight };
    }).filter((target) => target.weight > 0);
    if (scene.getCurrentDiveZone()?.meta.type === "reef") {
      pool = pool.map((target) => target.key === "reefFish" ? { ...target, weight: target.weight + 18 } : target);
    } else if (!scene.isNearIslandShallows()) {
      pool = pool.map((target) => ["tuna", "swordfish"].includes(target.key) ? { ...target, weight: target.weight + 8 } : target);
    }
    if (scene.getCurrentFishSchool?.()) {
      pool = pool.map((target) => target.kind === "fish"
        ? { ...target, weight: target.weight + 12 }
        : { ...target, weight: Math.max(1, target.weight - 10) });
    }
    const total = pool.reduce((sum, target) => sum + target.weight, 0);
    let roll = Phaser.Math.Between(1, total);
    for (const target of pool) {
      roll -= target.weight;
      if (roll <= 0) return target;
    }
    return pool[0];
  }

  collectReward(target) {
    const scene = this.scene;
    const gained = {};
    Object.entries(target.reward).forEach(([key, amount]) => {
      if (scene.addInventoryItem(key, amount)) {
        gained[key] = (gained[key] ?? 0) + amount;
      }
    });
    scene.markQuestFlag("caughtFish");
    const suffix = target.value > 0 ? ` Deger ${target.value}.` : "";
    scene.notify(`${target.label} yakalandi.${suffix}`, scene.playerRoot.x, scene.playerRoot.y - 70, "#c4f6ff", "good");
    return {
      status: `${target.label} yakalandi.${suffix}`,
      gained
    };
  }

  getLine() {
    return FISHING_GEAR.line[this.scene.fishingLineLevel] ?? FISHING_GEAR.line[0];
  }

  getRod() {
    return FISHING_GEAR.rod[this.scene.fishingRodLevel] ?? FISHING_GEAR.rod[0];
  }
}

export { FISHING_GEAR, FISH_TARGETS };
