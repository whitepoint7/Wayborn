import Phaser from "phaser";

const ISLAND_RESOURCE_LABELS = { log: "Kutuk", fruit: "Meyve", stone: "Tas", sand: "Kum", ore: "Maden", scrap: "Hurda" };

export class IslandSystem {
  constructor(scene, { itemLabels }) {
    this.scene = scene;
    this.itemLabels = itemLabels;
  }

  enterFromSea() {
    const scene = this.scene;
    if (scene.isGameOver || !scene.nearIsland) return false;
    if (!scene.isAnchored) {
      scene.isAnchored = true;
      scene.velocity.set(0, 0);
      scene.notify("Capa atildi, karaya cikildi", scene.playerRoot.x, scene.playerRoot.y - 70, "#fff0aa", "good");
    } else {
      scene.notify("Karaya cikildi", scene.playerRoot.x, scene.playerRoot.y - 70, "#fff0aa", "good");
    }
    scene.currentIsland = scene.nearIsland;
    scene.isOnIsland = true;
    if (scene.getActiveQuest()?.id === "find-sand" && (scene.currentIsland.meta.loot.sand ?? 0) <= 0) {
      scene.currentIsland.meta.loot.sand = 2;
    }
    if (scene.getActiveQuest()?.id === "find-ore" && (scene.currentIsland.meta.loot.ore ?? 0) <= 0) {
      scene.currentIsland.meta.loot.ore = 2;
    }
    scene.markQuestFlag("visitedIsland");
    scene.islandRestCount = 0;
    scene.velocity.set(0, 0);
    scene.actionMenu.classList.remove("open");
    scene.updateActionLabels();
    return true;
  }

  leave() {
    const scene = this.scene;
    scene.isOnIsland = false;
    scene.currentIsland = null;
    if (scene.isAnchored) {
      scene.isAnchored = false;
      scene.notify("Sala binildi ve capa alindi", scene.playerRoot.x, scene.playerRoot.y - 70, "#d6f7ff", "info");
    }
    scene.updateActionLabels();
    scene.updateQuickAttackButton();
  }

  getResourceState(resource) {
    const island = this.scene.currentIsland;
    const amount = island?.meta?.loot?.[resource] ?? 0;
    return {
      amount,
      disabled: amount <= 0,
      stateText: amount > 0 ? `${amount} var` : "Bitti"
    };
  }

  getRestState() {
    const scene = this.scene;
    const disabled = scene.stats.hunger <= 8 || scene.stats.thirst <= 8;
    const chance = Math.min(100, 25 + scene.islandRestCount * 20);
    return {
      disabled,
      chance,
      stateText: disabled ? "Yetersiz" : `%${chance}`
    };
  }

  collectResource(resource) {
    const scene = this.scene;
    if (!scene.currentIsland || scene.isGameOver) return false;
    const amount = scene.currentIsland.meta.loot[resource] ?? 0;
    if (amount <= 0) return { changed: false, reason: "empty" };
    const gathered = Math.min(amount, Phaser.Math.Between(1, 2));
    if (!scene.canStore(gathered)) {
      scene.toast("Envanter dolu", scene.playerRoot.x, scene.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    scene.currentIsland.meta.loot[resource] -= gathered;
    scene.inventory[resource] = (scene.inventory[resource] ?? 0) + gathered;
    scene.recordQuestAction("islandResourceCollected", gathered);
    if (resource === "scrap") scene.markQuestFlag("foundIslandScrap");
    if (resource === "ore") scene.markQuestFlag("foundIslandOre");
    if (resource === "sand") scene.recordQuestAction("sandFound");
    scene.stats.morale = Math.min(100, scene.stats.morale + 1);
    scene.toast(`${ISLAND_RESOURCE_LABELS[resource] ?? this.itemLabels[resource] ?? resource} +${gathered}`, scene.playerRoot.x, scene.playerRoot.y - 70, "#fff0aa");
    this.markDepletedIfNeeded(scene.currentIsland);
    return { changed: true, gathered };
  }

  rest() {
    const scene = this.scene;
    if (!scene.currentIsland || scene.isGameOver) return false;
    if (scene.stats.hunger <= 8 || scene.stats.thirst <= 8) {
      scene.toast("Dinlenmek icin cok ac/susuzsun", scene.playerRoot.x, scene.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    scene.stats.hp = Math.min(100, scene.stats.hp + 18);
    scene.stats.hunger = Math.max(0, scene.stats.hunger - 6);
    scene.stats.thirst = Math.max(0, scene.stats.thirst - 7);
    scene.stats.morale = Math.min(100, scene.stats.morale + 2);
    scene.islandRestCount += 1;

    const nearbySharks = scene.getNearbySharks(900);
    if (nearbySharks.length <= 0) {
      scene.notify("Adada dinlendin. Canin toparlandi.", scene.playerRoot.x, scene.playerRoot.y - 70, "#bff4c7", "good");
      return true;
    }

    const chance = Math.min(100, 25 + (scene.islandRestCount - 1) * 20);
    const lostInterest = Phaser.Math.Between(1, 100) <= chance;
    if (lostInterest) {
      const scattered = scene.scatterNearbySharks(nearbySharks);
      const subject = scattered > 0 ? `${scattered} kopek baligi` : "Kopek baligi";
      scene.notify(`${subject} ilgisini kaybetti ve uzaklasti. (%${chance})`, scene.playerRoot.x, scene.playerRoot.y - 70, "#bff4c7", "good");
    } else {
      scene.notify(`Dinlendin ama kopek baligi hala yakinlarda. (%${chance} sans basarisiz)`, scene.playerRoot.x, scene.playerRoot.y - 70, "#fff0aa", "warn");
    }
    return true;
  }

  markDepletedIfNeeded(island) {
    if (island && Object.values(island.meta.loot).every((value) => value <= 0)) {
      island.setAlpha(0.76);
    }
  }
}
