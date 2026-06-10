import { iconMarkup } from "./icon-library.js";

export class HudUI {
  constructor(scene) {
    this.scene = scene;
    this.hudBar = null;
    this.detailBar = null;
    this.questPopover = null;
    this.eventLog = null;
  }

  create() {
    const scene = this.scene;
    this.hudBar = document.createElement("div");
    this.hudBar.className = "hud-bar";
    this.hudBar.innerHTML = `
      <div class="hud-group hud-vitals">
        ${this.createChipMarkup("hp", "hp", "Can")}
        ${this.createChipMarkup("thirst", "thirst", "Su")}
        ${this.createChipMarkup("hunger", "hunger", "Aclik")}
        ${this.createChipMarkup("morale", "morale", "Moral")}
      </div>
      <div class="hud-group hud-ship">
        ${this.createChipMarkup("raft", "raft", "Sal")}
        ${this.createChipMarkup("crew", "crew", "Tayfa")}
        ${this.createChipMarkup("load", "load", "Yuk")}
        ${this.createChipMarkup("water", "water", "Su deposu")}
      </div>
      <div class="hud-group hud-status">
        ${this.createChipMarkup("seed", "seed", "Dunya seed")}
        ${this.createChipMarkup("time", "time", "Gun ve saat")}
        ${this.createChipMarkup("speed", "speed", "Hiz")}
        ${this.createChipMarkup("weather", "weatherSunny", "Hava")}
        ${this.createChipMarkup("sea", "seaCalm", "Deniz")}
      </div>
    `;

    this.detailBar = document.createElement("div");
    this.detailBar.className = "hud-detail-bar";
    this.detailBar.innerHTML = `
      <button class="hud-detail-cell hud-quest-cell" type="button" data-hud="quest">Gorev yok</button>
      <button class="hud-detail-cell hud-notice-cell is-empty" type="button" data-hud="notice">Bildirim yok</button>
    `;

    this.questPopover = document.createElement("div");
    this.questPopover.className = "hud-popover hud-quest-popover";
    this.eventLog = document.createElement("div");
    this.eventLog.className = "event-log";

    this.detailBar.querySelector(".hud-quest-cell").addEventListener("click", (event) => {
      event.stopPropagation();
      if (scene.isHudClickBlocked?.()) return;
      this.eventLog.classList.remove("open");
      this.questPopover.classList.toggle("open");
    });
    this.detailBar.querySelector(".hud-notice-cell").addEventListener("click", (event) => {
      event.stopPropagation();
      if (scene.isHudClickBlocked?.()) return;
      this.questPopover.classList.remove("open");
      this.eventLog.classList.toggle("open");
    });
    this.hudBar.querySelector(".hud-crew").addEventListener("click", (event) => {
      event.stopPropagation();
      if (scene.isHudClickBlocked?.()) return;
      scene.openCrewModal();
    });
    document.addEventListener("click", () => {
      this.questPopover?.classList.remove("open");
      this.eventLog?.classList.remove("open");
    });

    scene.hudBar = this.hudBar;
    scene.hudDetailBar = this.detailBar;
    scene.hudQuestPopover = this.questPopover;
    scene.eventLog = this.eventLog;
    return {
      hudBar: this.hudBar,
      detailBar: this.detailBar,
      questPopover: this.questPopover,
      eventLog: this.eventLog
    };
  }

  createChipMarkup(key, icon, title) {
    return `<span class="hud-chip hud-${key}" title="${title}">${iconMarkup(icon, "hud-icon")}<span class="hud-value" data-hud="${key}">0</span></span>`;
  }

  logEvent(message, type = "info") {
    const scene = this.scene;
    if (!this.eventLog) return;
    scene.eventEntries.unshift({ message, type });
    scene.eventEntries = scene.eventEntries.slice(0, 5);
    this.renderEventLog();
  }

  renderEventLog() {
    const scene = this.scene;
    if (!this.eventLog) return;
    const latest = scene.eventEntries[0];
    const noticeNode = this.detailBar?.querySelector('[data-hud="notice"]');
    if (noticeNode) {
      noticeNode.textContent = latest?.message ?? "Bildirim yok";
      noticeNode.className = `hud-detail-cell hud-notice-cell ${latest?.type ?? "is-empty"}`;
      noticeNode.classList.toggle("is-empty", !latest);
    }

    this.eventLog.innerHTML = "";
    if (!scene.eventEntries.length) {
      const line = document.createElement("div");
      line.className = "event-line empty";
      line.textContent = "Bildirim gecmisi bos.";
      this.eventLog.append(line);
      return;
    }

    scene.eventEntries.forEach((entry) => {
      const line = document.createElement("div");
      line.className = `event-line ${entry.type}`;
      line.textContent = entry.message;
      this.eventLog.append(line);
    });
  }

  update() {
    const scene = this.scene;
    if (!this.hudBar) return;
    const stats = scene.stats;
    const values = {
      hp: Math.round(stats.hp),
      thirst: Math.round(stats.thirst),
      hunger: Math.round(stats.hunger),
      morale: Math.round(stats.morale),
      raft: `${scene.raftTiles.length}/${scene.getRaftTileLimit()}`,
      crew: `${scene.getCrewCount()}/${scene.getCrewCapacity()}`,
      load: `${scene.getInventoryLoad()}/${scene.getCarryCapacity()}`,
      water: `${scene.waterReserve}/${scene.maxWaterReserve}`,
      seed: scene.worldSeedCode ?? "-",
      time: `${scene.worldDay}.${scene.timeSystem.getTimeLabel()}`,
      speed: scene.getSpeedLabel(),
      weather: "",
      sea: ""
    };

    Object.entries(values).forEach(([key, value]) => {
      const node = this.hudBar.querySelector(`[data-hud="${key}"]`);
      if (node) node.textContent = value;
    });
    const weatherIcon = this.hudBar.querySelector(".hud-weather .game-icon-asset");
    const seaIcon = this.hudBar.querySelector(".hud-sea .game-icon-asset");
    if (weatherIcon) {
      weatherIcon.src = `/assets/ui/hud/weather-${scene.weatherState}.png`;
      weatherIcon.className = `game-icon game-icon-asset icon-weather-${scene.weatherState} hud-icon`;
    }
    if (seaIcon) {
      seaIcon.src = `/assets/ui/hud/sea-${scene.seaState}.png`;
      seaIcon.className = `game-icon game-icon-asset icon-sea-${scene.seaState} hud-icon`;
    }
    const weatherChip = this.hudBar.querySelector(".hud-weather");
    const seaChip = this.hudBar.querySelector(".hud-sea");
    if (weatherChip) weatherChip.title = `Hava: ${scene.getWeatherLabel()}`;
    if (seaChip) seaChip.title = `Deniz: ${scene.getSeaLabel()}`;
    const waterChip = this.hudBar.querySelector(".hud-water");
    if (waterChip) {
      waterChip.title = scene.hasFlask
        ? `Su deposu ${scene.waterReserve}/${scene.maxWaterReserve} / Matara ${scene.flaskWater}/${scene.maxFlaskWater}`
        : `Su deposu ${scene.waterReserve}/${scene.maxWaterReserve}`;
    }

    const dangerKeys = {
      hp: stats.hp <= 30,
      thirst: stats.thirst <= 25,
      hunger: stats.hunger <= 25,
      load: scene.getInventoryLoad() >= scene.getCarryCapacity(),
      water: scene.waterReserve <= 1
    };
    Object.entries(dangerKeys).forEach(([key, active]) => {
      const node = this.hudBar.querySelector(`[data-hud="${key}"]`)?.closest(".hud-chip");
      node?.classList.toggle("is-danger", active);
    });

    const quest = scene.getActiveQuest();
    const questNode = this.detailBar?.querySelector('[data-hud="quest"]');
    if (questNode) {
      questNode.textContent = quest ? `${quest.title}: ${quest.detail}` : "Yeni kontrat limanlarda";
      questNode.classList.toggle("is-empty", !quest);
    }
    if (this.questPopover) {
      this.questPopover.innerHTML = quest
        ? this.createQuestPopoverMarkup(quest)
        : `<strong>Gorev yok</strong><span>Yeni kontratlar limanlarda acilacak.</span>`;
    }
  }

  createQuestPopoverMarkup(quest) {
    const requirements = this.scene.questSystem.getRequirements(quest);
    const progress = requirements.map(({ label, current, required }) => {
      const amount = Math.min(required, Math.max(0, current));
      const complete = amount >= required;
      return `<li class="${complete ? "complete" : ""}"><span>${label}</span><b>${amount}/${required}</b></li>`;
    }).join("");
    return `
      <strong>${quest.title}</strong>
      <span class="quest-description">${quest.description ?? quest.detail}</span>
      ${progress ? `<ul class="quest-requirements">${progress}</ul>` : ""}
    `;
  }
}
