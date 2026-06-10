import { createEmptyRow, createSmallAction } from "./dom-helpers.js";

export class DiscoveryUI {
  constructor(scene) {
    this.scene = scene;
    this.modal = null;
    this.filter = "all";
    this.filters = [
      ["all", "Tum"],
      ["island", "Adalar"],
      ["port", "Limanlar"],
      ["city", "Sehirler"],
      ["reef", "Resifler"],
      ["deep", "Derin"]
    ];
  }

  create() {
    this.modal = document.createElement("div");
    this.modal.className = "craft-modal immersive-modal";
    this.modal.innerHTML = `
      <div class="craft-panel inventory-panel">
        <div class="craft-head">
          <strong>Harita</strong>
          <button class="craft-close discovery-close" type="button">X</button>
        </div>
        <div class="inventory-summary discovery-summary"></div>
        <div class="discovery-filter-tabs"></div>
        <div class="world-map">
          <div class="world-map-grid"></div>
          <div class="world-map-markers"></div>
          <div class="world-map-player" title="Mevcut konum"></div>
        </div>
        <div class="inventory-list discovery-list"></div>
        <div class="modal-actions discovery-actions">
          <button class="modal-action discovery-clear" type="button">Takibi Birak</button>
        </div>
      </div>
    `;
    this.modal.querySelector(".discovery-close").addEventListener("click", () => this.scene.closeDiscoveryModal());
    this.modal.querySelector(".discovery-clear").addEventListener("click", () => this.scene.clearDiscoveryFollow());
    const tabs = this.modal.querySelector(".discovery-filter-tabs");
    this.filters.forEach(([key, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "inventory-action discovery-filter";
      button.dataset.filter = key;
      button.textContent = label;
      button.addEventListener("click", () => {
        this.filter = key;
        this.render();
      });
      tabs.append(button);
    });
    return this.modal;
  }

  render() {
    if (!this.modal) return;
    const scene = this.scene;
    const summary = this.modal.querySelector(".discovery-summary");
    const list = this.modal.querySelector(".discovery-list");
    const markers = this.modal.querySelector(".world-map-markers");
    const player = this.modal.querySelector(".world-map-player");
    const clearButton = this.modal.querySelector(".discovery-clear");
    const mapUnlocked = Boolean(scene.hasCompass && scene.hasSpyglass);
    const counts = mapUnlocked ? scene.getDiscoveryCounts() : { island: 0, port: 0, city: 0, reef: 0, deep: 0 };
    this.modal.querySelectorAll(".discovery-filter").forEach((button) => {
      const key = button.dataset.filter;
      button.classList.toggle("active", key === this.filter);
      const count = !mapUnlocked ? 0 : key === "all" ? scene.discoveries.length : counts[key] ?? 0;
      const label = this.filters.find(([filterKey]) => filterKey === key)?.[1] ?? key;
      button.textContent = `${label} ${count}`;
    });
    const visibleEntries = mapUnlocked ? this.getVisibleEntries(scene) : [];
    const filterLabel = this.filters.find(([key]) => key === this.filter)?.[1] ?? "Tum";
    summary.textContent = mapUnlocked
      ? `Seed ${scene.worldSeedCode ?? "-"}   ${filterLabel}: ${visibleEntries.length}   Toplam: ${scene.discoveries.length}`
      : "Harita kaydi icin Pusula ve Durbun gerekli";
    list.innerHTML = "";
    markers.innerHTML = "";
    clearButton.disabled = !scene.followedDiscoveryId;
    const toPercent = (value) => `${((value + this.scene.discoverySystem.worldSize / 2) / this.scene.discoverySystem.worldSize) * 100}%`;
    player.style.left = toPercent(scene.playerRoot.x);
    player.style.top = toPercent(scene.playerRoot.y);

    if (!mapUnlocked) {
      list.append(createEmptyRow("Pusula ve Durbun olmadan POI kayitlari gorunmez"));
      return;
    }

    if (!scene.discoveries.length) {
      list.append(createEmptyRow("Henuz kayda deger bir yer kesfedilmedi"));
      return;
    }

    if (!visibleEntries.length) {
      list.append(createEmptyRow("Bu filtrede kesif yok"));
      return;
    }

    visibleEntries.forEach((entry) => {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = `world-map-marker is-${entry.type}${entry.id === scene.followedDiscoveryId ? " is-active" : ""}`;
      marker.style.left = toPercent(entry.x);
      marker.style.top = toPercent(entry.y);
      marker.title = entry.name;
      marker.addEventListener("click", () => scene.followDiscovery(entry.id));
      markers.append(marker);

      const row = document.createElement("div");
      row.className = `discovery-card is-${entry.type}${entry.id === scene.followedDiscoveryId ? " is-active" : ""}`;
      const label = document.createElement("span");
      const active = entry.id === scene.followedDiscoveryId ? "Takip ediliyor" : scene.getTargetDistanceLabel(scene.getDistanceToPoint(entry));
      label.innerHTML = `<strong>${entry.name}</strong><small>${scene.getDiscoveryTypeLabel(entry.type)}</small><small>${active}</small>`;
      const actions = document.createElement("div");
      actions.className = "inventory-actions";
      const follow = createSmallAction(entry.id === scene.followedDiscoveryId ? "Aktif" : "Takip Et", () => scene.followDiscovery(entry.id));
      follow.disabled = !scene.hasCompass || entry.id === scene.followedDiscoveryId;
      actions.append(follow);
      row.append(label, actions);
      list.append(row);
    });
  }

  getVisibleEntries(scene) {
    const entries = this.filter === "all"
      ? scene.discoveries
      : scene.discoveries.filter((entry) => entry.type === this.filter);
    return [...entries].sort((a, b) => scene.getDistanceToPoint(a) - scene.getDistanceToPoint(b));
  }
}
