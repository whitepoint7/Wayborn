export class InventoryUI {
  constructor(scene, { inventoryKeys, itemLabels }) {
    this.scene = scene;
    this.inventoryKeys = inventoryKeys;
    this.itemLabels = itemLabels;
    this.modal = null;
  }

  create() {
    this.modal = document.createElement("div");
    this.modal.className = "craft-modal immersive-modal";
    this.modal.innerHTML = `
      <div class="craft-panel inventory-panel">
        <div class="craft-head">
          <strong>Envanter / Sandik</strong>
          <button class="craft-close inventory-close" type="button">X</button>
        </div>
        <div class="inventory-summary"></div>
        <div class="inventory-columns">
          <div>
            <div class="recipe-name">Envanter</div>
            <div class="inventory-list inventory-items"></div>
          </div>
          <div>
            <div class="recipe-name">Sandik</div>
            <div class="inventory-list storage-items"></div>
          </div>
        </div>
      </div>
    `;
    this.modal.querySelector(".inventory-close").addEventListener("click", () => this.scene.closeInventoryModal());
    return this.modal;
  }

  render() {
    if (!this.modal) return;
    const scene = this.scene;
    const summary = this.modal.querySelector(".inventory-summary");
    const inventoryList = this.modal.querySelector(".inventory-items");
    const storageList = this.modal.querySelector(".storage-items");
    const storageCapacity = scene.getStorageCapacity();
    const equipment = [
      scene.hasCraftingKit ? "Uretim Kiti" : null,
      scene.hasAxe ? "Basit Balta" : null,
      scene.hasPickaxe ? "Basit Kazma" : null,
      scene.hasHarpoon ? "Basit Zipkin" : null,
      scene.hasForge ? "Basit Forge" : null,
      scene.hasFishingRod ? "Olta" : null,
      scene.hasDiveMask ? "Dalis Maskesi" : null,
      scene.hasDiveTank ? "Dalis Tupu" : null
    ].filter(Boolean);
    summary.textContent = `Yuk ${scene.getInventoryLoad()}/${scene.getCarryCapacity()}   Sandik ${scene.getStorageLoad()}/${storageCapacity}   Ekipman: ${equipment.join(", ") || "yok"}`;
    inventoryList.innerHTML = "";
    storageList.innerHTML = "";

    this.inventoryKeys.forEach((key) => {
      if ((scene.inventory[key] ?? 0) > 0) inventoryList.append(this.createItemRow(key, scene.inventory[key], "inventory"));
    });
    if (!inventoryList.children.length) inventoryList.append(this.createEmptyRow("Envanter bos"));

    if (storageCapacity <= 0) {
      storageList.append(this.createEmptyRow("Sandik yok"));
      return;
    }

    this.inventoryKeys.forEach((key) => {
      if ((scene.storage[key] ?? 0) > 0) storageList.append(this.createItemRow(key, scene.storage[key], "storage"));
    });
    if (!storageList.children.length) storageList.append(this.createEmptyRow("Sandik bos"));
  }

  createEmptyRow(text) {
    const row = document.createElement("div");
    row.className = "inventory-row empty";
    row.textContent = text;
    return row;
  }

  createItemRow(key, amount, source) {
    const scene = this.scene;
    const row = document.createElement("div");
    row.className = "inventory-row";
    const iconPath = this.getItemIconPath(key);
    if (iconPath) {
      row.classList.add("has-icon");
      const icon = document.createElement("img");
      icon.className = "inventory-item-icon";
      icon.src = iconPath;
      icon.alt = "";
      icon.draggable = false;
      row.append(icon);
    }
    const label = document.createElement("span");
    label.innerHTML = `<strong>${this.itemLabels[key]}</strong><small>${amount} adet</small>`;
    const actions = document.createElement("div");
    actions.className = "inventory-actions";

    if (source === "inventory") {
      const use = this.createAction("Kullan", () => scene.useInventoryItem(key));
      use.disabled = !scene.canUseItem(key);
      const store = this.createAction("Koy", () => scene.moveItemToStorage(key));
      store.disabled = scene.getStorageCapacity() <= 0 || !scene.canStoreInChest(1);
      actions.append(use, store, this.createAction("At", () => scene.dropInventoryItem(key)));
    } else {
      const take = this.createAction("Al", () => scene.takeItemFromStorage(key));
      take.disabled = !scene.canStore(1);
      actions.append(take);
    }

    row.append(label, actions);
    return row;
  }

  getItemIconPath(key) {
    return {
      branch: "/assets/items/branch.png",
      leaf: "/assets/items/leaf.png?v=2",
      plastic: "/assets/items/plastic.png?v=2",
      log: "/assets/items/log.png",
      ore: "/assets/items/ore.png",
      sand: "/assets/items/sand.png",
      stone: "/assets/items/stone.png",
      rope: "/assets/items/string.png",
      cloth: "/assets/items/cloth.png",
      coral: "/assets/items/coral.png"
    }[key] ?? null;
  }

  createAction(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "inventory-action";
    button.textContent = label;
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }
}
