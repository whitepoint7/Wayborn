export class GameplayModalsUI {
  constructor(scene) {
    this.scene = scene;
  }

  createGameOver() {
    const modal = document.createElement("div");
    modal.className = "gameover-dom";
    modal.innerHTML = `
      <div class="gameover-panel">
        <strong>Hayatta kalamadin</strong>
        <p>Sal dagildi, yolculuk burada bitti.</p>
        <button class="gameover-restart" type="button">Yeniden Basla</button>
      </div>
    `;
    modal.querySelector(".gameover-restart").addEventListener("click", () => window.location.reload());
    return modal;
  }

  createAlertModal() {
    const scene = this.scene;
    const modal = document.createElement("div");
    modal.className = "craft-modal";
    modal.innerHTML = `
      <div class="craft-panel alert-panel">
        <div class="craft-head"><strong>Uyari</strong></div>
        <div class="inventory-summary alert-message"></div>
        <div class="modal-actions">
          <button class="modal-action alert-ok" type="button">Tamam</button>
        </div>
      </div>
    `;
    modal.querySelector(".alert-ok").addEventListener("click", () => scene.closeAlertModal());
    return modal;
  }

  createIslandModal() {
    const scene = this.scene;
    const modal = document.createElement("div");
    modal.className = "craft-modal immersive-modal";
    modal.innerHTML = `
      <div class="craft-panel">
        <div class="craft-head">
          <strong>Ada Kesfi</strong>
          <button class="craft-close" type="button">X</button>
        </div>
        <div class="inventory-summary island-risk-summary"></div>
        <div class="craft-list">
                    ${this.createIslandAction("fruit", "Meyve Ara", "yenebilir meyve ve bitkiler", "Ara")}
          ${this.createIslandAction("stone", "Tas Topla", "sahil taslari ve kaya parcalari", "Topla")}
          ${this.createIslandAction("sand", "Kum Al", "cam ve damitim icin temiz kum", "Al")}
          ${this.createIslandAction("scrap", "Hurda Ara", "kaza parcasi ve eski kamp kalintilari", "Ara")}
          <button class="craft-recipe" type="button" disabled>
            <span><span class="recipe-name">Agac ve Maden</span><span class="recipe-cost">mini oyunda balta/kazma ile toplanir</span></span>
            <span class="recipe-state">Arazi</span>
          </button>
          <button class="craft-recipe island-rest" type="button">
            <span><span class="recipe-name">Adada Dinlen</span><span class="recipe-cost">guvenli ama zaman ve erzak harcar</span></span>
            <span class="recipe-state">Dinlen</span>
          </button>
          <button class="craft-recipe island-leave" type="button">
            <span><span class="recipe-name">Sala Don</span><span class="recipe-cost">kesfi bitir</span></span>
            <span class="recipe-state">Don</span>
          </button>
        </div>
      </div>
    `;
    modal.querySelector(".craft-close").addEventListener("click", () => scene.closeIslandModal());
    modal.querySelector(".island-leave").addEventListener("click", () => scene.closeIslandModal());
    modal.querySelector(".island-rest").addEventListener("click", () => scene.restOnIsland());
    modal.querySelectorAll(".island-action").forEach((button) => {
      button.addEventListener("click", () => scene.collectIslandResource(button.dataset.action));
    });
    return modal;
  }

  createIslandAction(action, name, cost, state) {
    return `
      <button class="craft-recipe island-action" type="button" data-action="${action}">
        <span><span class="recipe-name">${name}</span><span class="recipe-cost">${cost}</span></span>
        <span class="recipe-state">${state}</span>
      </button>
    `;
  }

  createFishingModal() {
    const scene = this.scene;
    const modal = document.createElement("div");
    modal.className = "craft-modal immersive-modal";
    modal.innerHTML = `
      <div class="craft-panel">
        <div class="craft-head"><strong>Balik Tut</strong><button class="craft-close" type="button">X</button></div>
        <span class="recipe-cost fishing-status">Balik oltaya yaklasti.</span>
        <div class="fishing-target">
          <div class="fish-visual"></div>
          <div><span class="recipe-name fishing-name">Balik</span><span class="recipe-cost fishing-value">Deger bilinmiyor</span></div>
        </div>
        <span class="recipe-cost fishing-gear">Ekipman</span>
        <div class="recipe-name fishing-distance">Yakinlik 0/100</div>
        <div class="fishing-track">
          <div class="fishing-progress-fill"></div><div class="fishing-catch-zone"></div><div class="fishing-marker"></div>
        </div>
        <div class="recipe-name">Misina Gerginligi</div>
        <div class="meter"><div class="meter-fill warn fishing-tension"></div></div>
        <div class="modal-actions">
          <button class="modal-action fishing-pull" type="button">Cek</button>
          <button class="modal-action fishing-release" type="button">Gevset</button>
        </div>
      </div>
    `;
    modal.querySelector(".craft-close").addEventListener("click", () => scene.closeFishingModal(false));
    modal.querySelector(".fishing-pull").addEventListener("click", () => scene.fishingPull());
    modal.querySelector(".fishing-release").addEventListener("click", () => scene.fishingRelease());
    return modal;
  }

  createFishingResultModal() {
    const scene = this.scene;
    const modal = this.createResultModal({
      title: "Balik Sonucu",
      statusClass: "fishing-result-status",
      listClass: "fishing-result-list",
      repeatClass: "fishing-result-repeat",
      repeatLabel: "Tekrar Dene",
      stopClass: "fishing-result-stop",
      stopLabel: "Balik Tutmayi Birak",
      closeClass: "fishing-result-close"
    });
    modal.querySelector(".fishing-result-close").addEventListener("click", () => scene.closeFishingResultModal());
    modal.querySelector(".fishing-result-repeat").addEventListener("click", () => {
      scene.closeFishingResultModal();
      scene.openFishingModal();
    });
    modal.querySelector(".fishing-result-stop").addEventListener("click", () => scene.closeFishingResultModal());
    return modal;
  }

  createDiveModal() {
    const scene = this.scene;
    const modal = document.createElement("div");
    modal.className = "craft-modal immersive-modal";
    modal.innerHTML = `
      <div class="craft-panel">
        <div class="craft-head"><strong>Dalis</strong><button class="craft-close" type="button">X</button></div>
        <span class="recipe-cost dive-status">Sig suda malzeme ara.</span>
        <div class="dive-zone-info"></div>
        <div class="recipe-name">Oksijen</div>
        <div class="meter"><div class="meter-fill dive-oxygen"></div></div>
        <div class="modal-actions">
          <button class="modal-action dive-scrap" type="button">Hurda Ara</button>
          <button class="modal-action dive-stone" type="button">Tas Topla</button>
          <button class="modal-action dive-coral" type="button">Mercan Topla</button>
          <button class="modal-action dive-exit" type="button">Yuzeye Cik</button>
        </div>
      </div>
    `;
    modal.querySelector(".craft-close").addEventListener("click", () => scene.closeDiveModal());
    modal.querySelector(".dive-exit").addEventListener("click", () => scene.closeDiveModal());
    modal.querySelector(".dive-scrap").addEventListener("click", () => scene.collectDiveResource("scrap"));
    modal.querySelector(".dive-stone").addEventListener("click", () => scene.collectDiveResource("stone"));
    modal.querySelector(".dive-coral").addEventListener("click", () => scene.collectDiveResource("coral"));
    return modal;
  }

  createDiveResultModal() {
    const scene = this.scene;
    const modal = this.createResultModal({
      title: "Dalis Sonucu",
      statusClass: "dive-result-status",
      listClass: "dive-result-list",
      repeatClass: "dive-result-repeat",
      repeatLabel: "Yeniden Dalis Yap",
      stopClass: "dive-result-return",
      stopLabel: "Sala Don",
      closeClass: "dive-result-close",
      status: "Yuzeye cikildi."
    });
    modal.querySelector(".dive-result-close").addEventListener("click", () => scene.returnFromDiveResult());
    modal.querySelector(".dive-result-repeat").addEventListener("click", () => scene.repeatDiveFromResult());
    modal.querySelector(".dive-result-return").addEventListener("click", () => scene.returnFromDiveResult());
    return modal;
  }

  createResultModal({ title, statusClass, listClass, repeatClass, repeatLabel, stopClass, stopLabel, closeClass, status = "Sonuc" }) {
    const modal = document.createElement("div");
    modal.className = "craft-modal immersive-modal";
    modal.innerHTML = `
      <div class="craft-panel">
        <div class="craft-head"><strong>${title}</strong><button class="craft-close ${closeClass}" type="button">X</button></div>
        <span class="recipe-cost ${statusClass}">${status}</span>
        <div class="inventory-list ${listClass}"></div>
        <div class="modal-actions result-actions">
          <button class="modal-action ${repeatClass}" type="button">${repeatLabel}</button>
          <button class="modal-action ${stopClass}" type="button">${stopLabel}</button>
        </div>
      </div>
    `;
    return modal;
  }

  renderResultList(container, gained, itemLabels) {
    if (!container) return;
    container.innerHTML = "";
    const entries = Object.entries(gained ?? {}).filter(([, amount]) => amount > 0);
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "inventory-row";
      empty.textContent = "Kayda deger bir sey yok.";
      container.append(empty);
      return;
    }
    entries.forEach(([key, amount]) => {
      const row = document.createElement("div");
      row.className = "inventory-row";
      row.innerHTML = `<span>${itemLabels[key] ?? key}</span><span>+${amount}</span>`;
      container.append(row);
    });
  }
}
