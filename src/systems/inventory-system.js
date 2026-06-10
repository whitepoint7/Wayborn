export class InventorySystem {
  constructor(scene, { itemLabels, inventoryKeys }) {
    this.scene = scene;
    this.itemLabels = itemLabels;
    this.inventoryKeys = inventoryKeys;
  }

  pickItemCounts(source) {
    return this.inventoryKeys.reduce((items, key) => {
      items[key] = Math.max(0, Math.floor(source[key] ?? 0));
      return items;
    }, {});
  }

  applyItemCounts(target, source) {
    this.inventoryKeys.forEach((key) => {
      target[key] = Math.max(0, Math.floor(source?.[key] ?? 0));
    });
  }

  canAfford(cost) {
    return Object.entries(cost).every(([key, value]) => (this.scene.inventory[key] ?? 0) >= value);
  }

  getMissingCostText(cost) {
    return Object.entries(cost)
      .filter(([key, value]) => (this.scene.inventory[key] ?? 0) < value)
      .map(([key, value]) => `${this.itemLabels[key] ?? key} ${value - (this.scene.inventory[key] ?? 0)}`)
      .join(", ");
  }

  getLoad(container = this.scene.inventory) {
    return Object.values(container).reduce((sum, value) => sum + value, 0);
  }

  canStore(amount = 1) {
    return this.getLoad(this.scene.inventory) + amount <= this.scene.getCarryCapacity();
  }

  canStoreInChest(amount = 1) {
    return this.getLoad(this.scene.storage) + amount <= this.scene.getStorageCapacity();
  }

  addItem(key, amount = 1) {
    if (!this.canStore(amount)) {
      const now = this.scene.time.now;
      if (now - this.scene.lastInventoryFullToast > 900) {
        this.scene.lastInventoryFullToast = now;
        this.scene.toast("Envanter dolu", this.scene.playerRoot.x, this.scene.playerRoot.y - 70, "#ffcc93");
      }
      return false;
    }
    this.scene.inventory[key] = (this.scene.inventory[key] ?? 0) + amount;
    this.scene.recordQuestAction("materialCollected", amount);
    this.scene.checkQuestProgress();
    return true;
  }

  canUseItem(key) {
    return key === "fruit" || key === "food" || key === "cookedFish" || key === "cookedMeat" || key === "cookedSharkMeat";
  }

  useItem(key) {
    if ((this.scene.inventory[key] ?? 0) <= 0 || !this.canUseItem(key)) return;
    if (key === "fruit" || key === "food") {
      this.scene.inventory[key] -= 1;
      this.scene.stats.hunger = Math.min(100, this.scene.stats.hunger + (key === "fruit" ? 16 : 14));
      this.scene.notify(key === "fruit" ? "Meyve yenildi." : "Yiyecek yenildi.", this.scene.playerRoot.x, this.scene.playerRoot.y - 70, "#bff4c7", "good");
    }
    if (key === "cookedFish") {
      this.scene.inventory.cookedFish -= 1;
      this.scene.stats.hunger = Math.min(100, this.scene.stats.hunger + 24);
      this.scene.notify("Pismis balik yenildi.", this.scene.playerRoot.x, this.scene.playerRoot.y - 70, "#bff4c7", "good");
    }
    if (key === "cookedSharkMeat") {
      this.scene.inventory.cookedSharkMeat -= 1;
      this.scene.stats.hunger = Math.min(100, this.scene.stats.hunger + 72);
      this.scene.notify("Pismis kopek baligi eti yenildi.", this.scene.playerRoot.x, this.scene.playerRoot.y - 70, "#bff4c7", "good");
    }
    if (key === "cookedMeat") {
      this.scene.inventory.cookedMeat -= 1;
      this.scene.stats.hunger = Math.min(100, this.scene.stats.hunger + 22);
      this.scene.notify("Pismis et yenildi.", this.scene.playerRoot.x, this.scene.playerRoot.y - 70, "#bff4c7", "good");
    }
    this.scene.renderInventoryModal();
    this.scene.updateHud();
  }

  dropItem(key) {
    if ((this.scene.inventory[key] ?? 0) <= 0) return;
    this.scene.inventory[key] -= 1;
    this.scene.toast(`${this.itemLabels[key]} atildi`, this.scene.playerRoot.x, this.scene.playerRoot.y - 70, "#ffcc93");
    this.scene.renderInventoryModal();
    this.scene.updateHud();
  }

  moveToStorage(key) {
    if ((this.scene.inventory[key] ?? 0) <= 0) return;
    if (this.scene.getStorageCapacity() <= 0) {
      this.scene.toast("Once sandik kur", this.scene.playerRoot.x, this.scene.playerRoot.y - 70, "#ffcc93");
      return;
    }
    if (!this.canStoreInChest(1)) {
      this.scene.toast("Sandik dolu", this.scene.playerRoot.x, this.scene.playerRoot.y - 70, "#ffcc93");
      return;
    }
    this.scene.inventory[key] -= 1;
    this.scene.storage[key] = (this.scene.storage[key] ?? 0) + 1;
    this.scene.recordQuestAction("itemStored");
    this.scene.renderInventoryModal();
    this.scene.updateHud();
  }

  takeFromStorage(key) {
    if ((this.scene.storage[key] ?? 0) <= 0) return;
    if (!this.canStore(1)) {
      this.scene.toast("Envanter dolu", this.scene.playerRoot.x, this.scene.playerRoot.y - 70, "#ffcc93");
      return;
    }
    this.scene.storage[key] -= 1;
    this.scene.inventory[key] = (this.scene.inventory[key] ?? 0) + 1;
    this.scene.renderInventoryModal();
    this.scene.updateHud();
  }
}
