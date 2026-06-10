import { iconMarkup } from "./icon-library.js";

export class RaftEditorUI {
  constructor(scene, { itemLabels, moduleTypes }) {
    this.scene = scene;
    this.itemLabels = itemLabels;
    this.moduleTypes = moduleTypes;
    this.modal = null;
  }

  create() {
    const scene = this.scene;
    this.modal = document.createElement("div");
    this.modal.className = "craft-modal raft-edit-modal";
    this.modal.innerHTML = `
      <div class="craft-panel inventory-panel raft-panel">
        <div class="craft-head">
          <strong>Sal Duzenle</strong>
          <div class="inventory-summary raft-edit-summary"></div>
          <button class="craft-close raft-edit-close" type="button">X</button>
        </div>
        <div class="raft-editor">
          <div class="raft-layer-tabs">
            <button class="inventory-action raft-layer" type="button" data-layer="lower" title="Alt katman">${iconMarkup("lower")}</button>
            <button class="inventory-action raft-layer" type="button" data-layer="raft" title="Sal katmani">${iconMarkup("raftLayer")}</button>
            <button class="inventory-action raft-layer" type="button" data-layer="module" title="Ust katman">${iconMarkup("moduleLayer")}</button>
          </div>
          <div class="raft-build-list"></div>
          <div class="raft-edit-stage"><div class="raft-edit-grid"></div></div>
          <div class="modal-actions raft-mode-tabs">
            <button class="modal-action raft-mode" type="button" data-mode="move" title="Tasi">${iconMarkup("move")}</button>
            <button class="modal-action raft-mode" type="button" data-mode="delete" title="Sil">${iconMarkup("delete")}</button>
            <button class="modal-action raft-back" type="button" title="Geri">${iconMarkup("back")}</button>
          </div>
        </div>
      </div>
    `;
    this.modal.querySelector(".raft-edit-close").addEventListener("click", () => scene.closeRaftEditModal());
    this.modal.querySelector(".raft-back").addEventListener("click", () => scene.closeRaftEditModal());
    this.modal.querySelectorAll(".raft-layer").forEach((button) => {
      button.addEventListener("click", () => scene.setRaftEditLayer(button.dataset.layer));
    });
    this.modal.querySelectorAll(".raft-mode").forEach((button) => {
      button.addEventListener("click", () => scene.setRaftEditMode(button.dataset.mode));
    });
    return this.modal;
  }

  render() {
    const scene = this.scene;
    if (!this.modal) return;
    const summary = this.modal.querySelector(".raft-edit-summary");
    const grid = this.modal.querySelector(".raft-edit-grid");
    const selected = scene.raftEditSelection ? scene.getRaftTile(scene.raftEditSelection.x, scene.raftEditSelection.y) : null;
    const modeLabel = scene.raftEditMode === "move" ? "Tasi" : scene.raftEditMode === "delete" ? "Sil" : "Kur";
    summary.textContent = `${scene.getRaftEditLayerLabel()} / ${modeLabel}   Parca ${scene.raftTiles.length}/${scene.getMaxRaftCells()}   Yuk ${scene.getRaftLoad().toFixed(1)}/${scene.getRaftLoadCapacity().toFixed(1)} ${scene.getRaftBurdenLabel()}`;
    this.modal.querySelectorAll(".raft-layer").forEach((button) => {
      button.classList.toggle("active", button.dataset.layer === scene.raftEditLayer);
    });
    this.modal.querySelectorAll(".raft-mode").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === scene.raftEditMode);
    });
    this.renderBuildList();

    grid.innerHTML = "";
    const buildTargets = scene.selectedRaftBuildCraft && scene.raftEditMode === "build" ? scene.getRaftBuildTargetsForCraft(scene.selectedRaftBuildCraft) : [];
    const cells = scene.getRaftEditCells(selected, Array.isArray(buildTargets) ? buildTargets : []);
    const xs = cells.map((cell) => cell.x);
    const ys = cells.map((cell) => cell.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    grid.style.gridTemplateColumns = `repeat(${maxX - minX + 1}, var(--cell))`;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const tile = scene.getRaftTile(x, y);
        const canTarget = selected && scene.canRaftEditTarget(selected, { x, y });
        const canBuild = Array.isArray(buildTargets) && buildTargets.some((target) => target.x === x && target.y === y);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "raft-cell";
        button.classList.toggle("empty", !tile);
        button.classList.toggle("selected", selected?.x === x && selected?.y === y);
        button.classList.toggle("target", Boolean(canTarget || canBuild));
        button.classList.toggle("locked", Boolean(tile && scene.isStartingRaftTile(tile)));
        button.disabled = !tile && !canTarget && !canBuild;
        button.dataset.x = String(x);
        button.dataset.y = String(y);
        button.innerHTML = this.getCellHtml(tile, canTarget || canBuild);
        button.addEventListener("click", () => scene.handleRaftEditCell(x, y));
        grid.append(button);
      }
    }
  }

  renderBuildList() {
    const scene = this.scene;
    const list = this.modal?.querySelector(".raft-build-list");
    if (!list) return;
    list.innerHTML = "";
    scene.craftSystem.getRaftBuildCrafts().forEach((craft) => {
      const isCurrentLayer = scene.craftSystem.getRaftBuildLayer(craft.name) === scene.raftEditLayer;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "raft-build-recipe";
      button.classList.toggle("selected", scene.selectedRaftBuildCraft?.name === craft.name);
      button.classList.toggle("layer-disabled", !isCurrentLayer);
      button.disabled = !isCurrentLayer;
      button.title = `${craft.name}: ${this.getCompactCostText(craft.cost)}`;
      button.innerHTML = `<span class="raft-build-icon">${iconMarkup(scene.craftSystem.getRaftBuildIcon(craft.name))}</span>`;
      button.addEventListener("click", () => {
        scene.selectRaftBuildCraft(craft);
        this.render();
      });
      list.append(button);
    });
  }

  getCompactCostText(cost) {
    return Object.entries(cost)
      .map(([key, value]) => `${this.itemLabels[key] ?? key[0]} ${value}`)
      .join(" ");
  }

  getCellHtml(tile, canTarget) {
    const scene = this.scene;
    if (canTarget) return `<span class="raft-plus">${iconMarkup("build")}</span>`;
    if (!tile) return "";
    const moduleText = scene.raftEditLayer === "module" && tile.module ? `<span class="raft-module">${iconMarkup(tile.module)}</span>` : "";
    const netText = scene.raftEditLayer === "lower" && tile.netHp > 0 ? `<span class="raft-net">${iconMarkup("net")}</span>` : "";
    const beamText = scene.raftEditLayer === "lower" && tile.beamHp > 0 ? `<span class="raft-beam">${iconMarkup("beam")}</span>` : "";
    const centerText = scene.raftEditLayer === "raft" && scene.isCenterTile(tile) ? `<span class="raft-center">${iconMarkup("center")}</span>` : "";
    return `${netText}${beamText}${moduleText}${centerText}`;
  }
}
