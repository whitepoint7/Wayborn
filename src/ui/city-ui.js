import { createEmptyRow, createSmallAction } from "./dom-helpers.js";

export class CityUI {
  constructor(scene) {
    this.scene = scene;
    this.modal = null;
  }

  create() {
    const scene = this.scene;
    this.modal = document.createElement("div");
    this.modal.className = "craft-modal immersive-modal city-modal";
    this.modal.innerHTML = `
      <div class="craft-panel inventory-panel">
        <div class="craft-head">
          <strong>Sehir</strong>
          <button class="craft-close city-close" type="button">X</button>
        </div>
        <div class="inventory-summary city-summary"></div>
        <div class="craft-list city-actions">
          <button class="craft-recipe city-market" type="button"><span><span class="recipe-name">Carsi</span><span class="recipe-cost">Bolgesel ticaret ve erzak</span></span><span class="recipe-state">Gir</span></button>
          <button class="craft-recipe city-shipyard" type="button"><span><span class="recipe-name">Tersane</span><span class="recipe-cost">Sali tamamen onar</span></span><span class="recipe-state">24 altin</span></button>
          <button class="craft-recipe city-hall" type="button"><span><span class="recipe-name">Belediye</span><span class="recipe-cost">Kontratlari ve resmi isleri gor</span></span><span class="recipe-state">Gir</span></button>
        </div>
        <div class="trade-services"><div class="recipe-name">Taverna</div><div class="inventory-list city-tavern-list"></div></div>
      </div>
    `;
    this.modal.querySelector(".city-close").addEventListener("click", () => scene.closeCityModal());
    this.modal.querySelector(".city-market").addEventListener("click", () => scene.openCityTrade());
    this.modal.querySelector(".city-hall").addEventListener("click", () => scene.openCityTrade());
    this.modal.querySelector(".city-shipyard").addEventListener("click", () => scene.useCityShipyard());
    return this.modal;
  }

  render() {
    if (!this.modal || !this.scene.currentCity) return;
    const scene = this.scene;
    const city = scene.currentCity;
    const profile = scene.tradeSystem.getMarketProfile();
    this.modal.querySelector(".craft-head strong").textContent = city.meta.name;
    this.modal.querySelector(".city-summary").textContent =
      `${profile.label}   Altin ${scene.gold}   Tayfa ${scene.getCrewCount()}/${scene.getCrewCapacity()}`;
    const shipyard = this.modal.querySelector(".city-shipyard");
    shipyard.disabled = scene.gold < 24 || !scene.hasDamagedRaft();
    const list = this.modal.querySelector(".city-tavern-list");
    list.innerHTML = "";
    const candidates = city.meta.tavernCandidates ?? [];
    if (!candidates.length) {
      list.append(createEmptyRow("Tavernada uygun denizci kalmadi"));
      return;
    }
    candidates.forEach((candidate) => {
      const row = document.createElement("div");
      row.className = "inventory-row";
      const label = document.createElement("span");
      label.innerHTML = `<strong>${candidate.name}</strong><small>${candidate.roleLabel} / ${candidate.price} altin</small>`;
      const actions = document.createElement("div");
      actions.className = "inventory-actions";
      const recruit = createSmallAction("Ise Al", () => scene.recruitCityCandidate(candidate.id));
      recruit.disabled = scene.gold < candidate.price || scene.getCrewCount() >= scene.getCrewCapacity();
      actions.append(recruit);
      row.append(label, actions);
      list.append(row);
    });
  }
}
