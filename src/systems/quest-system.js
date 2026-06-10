import { INVENTORY_KEYS, ITEM_LABELS } from "../data/items.js";
import { QUESTS } from "../data/quests.js";
import { CRAFTS } from "../data/crafts.js";

const ACTION_LABELS = {
  raftPiecePlaced: "Sal parcasini yerlestir",
  caughtFish: "Balik yakala",
  grillPlaced: "Ocagi yerlestir",
  fishCooked: "Balik pisir",
  sharkAttacked: "Kopek baligina saldir",
  visitedPort: "Limana gir",
  soldItem: "Urun sat",
  boughtItem: "Urun al",
  contractAccepted: "Liman gorevi al",
  contractCompleted: "Liman gorevini tamamla",
  netPlaced: "Toplama agini yerlestir",
  chestPlaced: "Sandigi yerlestir",
  itemStored: "Sandiga nesne koy",
  beamPlaced: "Kirisi yerlestir",
  waterCollectorPlaced: "Su toplayiciyi yerlestir",
  bedPlaced: "Yatagi yerlestir",
  sandFound: "Kum bul",
  foundIslandOre: "Maden bul",
  glassCrafted: "Cam erit",
  portReachedWhileFollowing: "Takip edilen limana ulas",
  mastPlaced: "Diregi yerlestir",
  survivorRecruited: "Kazazedeyi tayfaya al",
  reefDived: "Resife dal",
  deepDived: "Derin suya dal",
  visitedCity: "Meridia'ya ulas"
};

export class QuestSystem {
  constructor(scene) {
    this.scene = scene;
    this.lastCompletedAt = 0;
  }

  getActiveQuest() {
    return QUESTS[this.scene.questIndex] ?? null;
  }

  resolveSavedIndex(savedQuest = {}) {
    const activeId = savedQuest.activeId;
    if (activeId) {
      const index = QUESTS.findIndex((quest) => quest.id === activeId);
      if (index >= 0) return index;
    }
    if (savedQuest.sequenceVersion >= 3) {
      return Math.min(QUESTS.length, Math.max(0, Math.floor(savedQuest.index ?? 0)));
    }
    if (savedQuest.sequenceVersion === 2) {
      const legacyIds = [
        "learn-inventory", "craft-flask", "craft-kit", "explore-island", "shore-dive", "expand-raft",
        "learn-fishing", "place-grill", "cook-fish", "fight-shark", "find-port", "learn-trade",
        "learn-contracts", "place-net", "use-chest", "place-beam", "place-water-collector", "place-bed",
        "find-sand", "find-ore", "build-forge", "make-glass", "make-compass", "follow-port", "place-mast",
        "make-spyglass", "place-sail", "recruit-survivor", "make-dive-mask", "make-dive-tank", "reach-meridia"
      ];
      const legacyId = legacyIds[Math.max(0, Math.floor(savedQuest.index ?? 0))];
      const replacements = { "shore-dive": "explore-island", "find-port": "find-port-and-trade", "learn-trade": "find-port-and-trade" };
      const index = QUESTS.findIndex((quest) => quest.id === (replacements[legacyId] ?? legacyId));
      if (index >= 0) return index;
    }
    return 0;
  }

  getActionCount(action) {
    return Math.max(0, this.scene.questProgress?.[action] ?? 0);
  }

  getRequirements(quest = this.getActiveQuest()) {
    if (!quest) return [];
    if (quest.requirements) return quest.requirements(this.scene, this);
    const results = [];
    if (quest.craftName) {
      const craft = CRAFTS.find((entry) => entry.name === quest.craftName);
      Object.entries(craft?.cost ?? {}).forEach(([key, required]) => {
        results.push({
          label: ITEM_LABELS[key] ?? key,
          current: this.scene.inventory[key] ?? 0,
          required
        });
      });
    }
    (quest.actions ?? []).forEach((key) => {
      results.push({
        label: ACTION_LABELS[key] ?? key,
        current: this.getActionCount(key),
        required: 1
      });
    });
    return results;
  }

  recordAction(action, amount = 1) {
    const quest = this.getActiveQuest();
    if (!quest?.actions?.includes(action)) return false;
    this.scene.questProgress[action] = this.getActionCount(action) + amount;
    this.checkProgress();
    return true;
  }

  markFlag(flag) {
    if (!Object.prototype.hasOwnProperty.call(this.scene.questFlags, flag)) return;
    this.scene.questFlags[flag] = true;
    if (!this.recordAction(flag)) this.checkProgress();
  }

  checkProgress() {
    if (Date.now() - this.lastCompletedAt < 180) return;
    const quest = this.getActiveQuest();
    if (!quest || !quest.isComplete(this.scene, this)) {
      this.scene.updateHud();
      return;
    }
    this.applyReward(quest.reward ?? {});
    this.lastCompletedAt = Date.now();
    this.scene.questIndex += 1;
    this.scene.questProgress = {};
    this.scene.notify(`Gorev tamamlandi: ${quest.title}`, this.scene.playerRoot.x, this.scene.playerRoot.y - 84, "#fff0aa", "good");
    this.activateCurrentQuest();
    this.scene.updateHud();
  }

  activateCurrentQuest() {
    const quest = this.getActiveQuest();
    quest?.onActivate?.(this.scene);
  }

  applyReward(reward) {
    if (reward.gold) this.scene.gold += reward.gold;
    if (reward.morale) this.scene.stats.morale = Math.min(100, this.scene.stats.morale + reward.morale);
    if (reward.bait) this.scene.fishingBait += reward.bait;
    if (reward.unlockForgeRecipe) this.scene.questFlags.forgeRecipeUnlocked = true;
    INVENTORY_KEYS.forEach((key) => {
      if (!reward[key]) return;
      if (this.scene.canStore(reward[key])) {
        this.scene.inventory[key] = (this.scene.inventory[key] ?? 0) + reward[key];
      }
    });
  }
}

export { QUESTS };
