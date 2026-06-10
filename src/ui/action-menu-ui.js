import { iconMarkup } from "./icon-library.js";

export function createDomButton(className, label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  if (typeof label === "string" && label.includes("<")) {
    button.innerHTML = label;
  } else {
    button.textContent = label;
  }
  let handledAt = 0;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener("pointerup", (event) => {
    event.preventDefault();
    event.stopPropagation();
    handledAt = performance.now();
    onClick();
  });
  button.addEventListener("click", (event) => {
    if (performance.now() - handledAt < 350) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
    onClick();
  });
  return button;
}

export class ActionMenuUI {
  constructor(scene) {
    this.scene = scene;
  }

  create() {
    const scene = this.scene;
    const actionMenu = document.createElement("div");
    actionMenu.className = "action-menu";
    const systemMenu = document.createElement("div");
    systemMenu.className = "system-menu";
    scene.actionMenu = actionMenu;
    scene.systemMenu = systemMenu;

    const mainButton = createDomButton("action-main", this.icon("menu"), () => {
      actionMenu.classList.toggle("open");
      systemMenu.classList.remove("open");
    });
    mainButton.title = "Menu";
    const craftButton = this.createAction("action-item", "craft", "Uret", () => scene.openCraftModal("gear"));
    const inventoryButton = this.createAction("action-item", "inventory", "Envanter", () => scene.openInventoryModal());
    const discoveryButton = this.createAction("action-item", "map", "Harita", () => scene.openDiscoveryModal());
    const raftButton = this.createAction("action-item", "plank", "Sal", () => scene.openRaftEditModal());
    const fishButton = this.createAction("action-item", "fishing", "Balik Tut", () => scene.openFishingModal());
    scene.diveButton = this.createAction("action-item", "dive", "Dalis Yap", () => {
      if (!scene.isAnchored) {
        scene.toast("Dalis icin once capa at", scene.playerRoot.x, scene.playerRoot.y - 70, "#ffcc93");
        return;
      }
      scene.openDiveModal();
    });
    [craftButton, inventoryButton, discoveryButton, raftButton, fishButton, scene.diveButton].forEach((button) => {
      button.addEventListener("click", () => actionMenu.classList.remove("open"));
    });
    actionMenu.append(mainButton, craftButton, inventoryButton, discoveryButton, raftButton, fishButton, scene.diveButton);

    const systemRingButton = this.createAction("action-item", "system", "Sistem", () => {
      actionMenu.classList.remove("open", "craft-open");
      systemMenu.classList.toggle("open");
    });
    actionMenu.append(systemRingButton);
    [
      ["raft", "plank", "Sal Uretimi"],
      ["module", "grill", "Modul Uretimi"],
      ["gear", "craft", "Ekipman Uretimi"],
      ["food", "fishing", "Yiyecek Uretimi"],
      ["all", "inventory", "Tum Tarifler"]
    ].forEach(([category, icon, title]) => {
      actionMenu.append(this.createAction("action-subitem", icon, title, () => scene.openCraftModal(category)));
    });

    const systemButton = createDomButton("system-main", this.icon("system"), () => {
      systemMenu.classList.toggle("open");
      actionMenu.classList.remove("open");
    });
    const saveButton = createDomButton("system-item", this.icon("save"), () => {
      systemMenu.classList.remove("open");
      scene.saveGame();
    });
    saveButton.title = "Kaydet";
    const loadButton = createDomButton("system-item", this.icon("loadGame"), () => {
      systemMenu.classList.remove("open");
      scene.loadGame();
    });
    loadButton.title = "Yukle";
    const fullscreenButton = createDomButton("system-item", this.icon("fullscreen"), () => {
      systemMenu.classList.remove("open");
      scene.toggleFullscreen();
    });
    fullscreenButton.title = "Tam ekran";
    const backButton = createDomButton("system-item", this.icon("back"), () => {
      systemMenu.classList.remove("open");
      actionMenu.classList.add("open");
    });
    backButton.title = "Geri";
    systemMenu.append(systemButton, saveButton, loadButton, fullscreenButton, backButton);

    scene.entryButton = createDomButton("entry-action", this.icon("enter"), () => scene.handleEntryAction());
    scene.contextButton = createDomButton("context-action", this.icon("anchorDown"), () => scene.handleContextAction());
    scene.quickDiveButton = createDomButton("quick-dive", this.icon("dive"), () => scene.openDiveModal());
    scene.quickDiveButton.title = "Dalis Yap";
    scene.quickAttackButton = createDomButton("quick-attack", this.icon("attack"), () => scene.tryAttackShark());
    scene.quickRepairButton = createDomButton("quick-repair", this.icon("repair"), () => scene.tryQuickRepair());
  }

  createAction(className, icon, title, onClick) {
    const button = createDomButton(className, this.icon(icon), () => {
      this.scene.actionMenu.classList.remove("open", "craft-open");
      this.scene.systemMenu?.classList.remove("open");
      onClick();
    });
    button.title = title;
    return button;
  }

  icon(name) {
    return iconMarkup(name, "button-icon");
  }
}
