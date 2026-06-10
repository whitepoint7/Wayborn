import Phaser from "phaser";
import { DIVE_SITES } from "../data/diving.js";

export class DivingSystem {
  constructor(scene) {
    this.scene = scene;
  }

  canStartNow() {
    const scene = this.scene;
    const now = scene.time.now;
    if (now < scene.diveCooldownUntil) {
      const seconds = Math.ceil((scene.diveCooldownUntil - now) / 1000);
      scene.toast(`Cigerlerin yaniyor. ${seconds}s mola ver.`, scene.playerRoot.x, scene.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    return true;
  }

  getAreaKey(siteKey) {
    const scene = this.scene;
    const gridX = Math.round(scene.playerRoot.x / 180);
    const gridY = Math.round(scene.playerRoot.y / 180);
    return `${siteKey}:${gridX}:${gridY}`;
  }

  registerPressure(areaKey) {
    const scene = this.scene;
    const previous = areaKey === scene.lastDiveAreaKey ? (scene.diveAreaPressure[areaKey] ?? 0) : 0;
    const pressure = Phaser.Math.Clamp(previous + 1, 1, 6);
    scene.lastDiveAreaKey = areaKey;
    scene.diveAreaPressure[areaKey] = pressure;
    if (pressure >= 3) {
      scene.logEvent("Ayni bolgede tekrar dalmak etraftaki canlilari huzursuz ediyor.", "warn");
    }
    if (pressure >= 4 && Phaser.Math.Between(1, 100) <= 38 + pressure * 8) {
      scene.attractDiveThreat();
    }
    return pressure;
  }

  resolveAftermath(result) {
    const scene = this.scene;
    const pressure = result.pressure ?? 1;
    const duration = result.duration ?? 0;
    const emptyFastDive = !result.gainedAny && duration < 14;
    scene.diveFatigue = Phaser.Math.Clamp(scene.diveFatigue + 12 + pressure * 4 + (emptyFastDive ? 12 : 0), 0, 100);
    if (pressure >= 3 || emptyFastDive) {
      scene.stats.morale = Math.max(0, scene.stats.morale - 1);
    }
    if (pressure >= 4 && Phaser.Math.Between(1, 100) <= 24 + pressure * 8) {
      scene.attractDiveThreat();
    }
    if (scene.diveFatigue >= 72 || pressure >= 5) {
      const cooldown = Phaser.Math.Between(18000, 28000) + pressure * 2500;
      scene.diveCooldownUntil = scene.time.now + cooldown;
      scene.diveFatigue = Math.max(34, scene.diveFatigue - 42);
      scene.logEvent("Cigerlerin neredeyse patlayacak. Dalis icin biraz mola ver.", "warn");
    }
  }

  handleOxygenFailure(site) {
    const scene = this.scene;
    const luckyEscape = Phaser.Math.Between(1, 100) <= 12;
    const damage = luckyEscape ? 32 : 76;
    scene.stats.hp = Math.max(0, scene.stats.hp - damage);
    scene.stats.thirst = Math.max(0, scene.stats.thirst - 8);
    scene.stats.morale = Math.max(0, scene.stats.morale - (luckyEscape ? 5 : 12));
    const message = luckyEscape
      ? "Oksijen bitti, son anda yuzeye ciktin. Canin agir azaldi."
      : `${site.label} dalisinda oksijensiz kaldin. Bogulma tehlikesi canini cok azaltti.`;
    scene.notify(message, scene.playerRoot.x, scene.playerRoot.y - 70, "#ff9c87", "danger");
    scene.closeDiveModal();
    scene.updateHud();
    scene.checkGameOver();
  }

  canEnterSite(siteKey) {
    const scene = this.scene;
    const site = DIVE_SITES[siteKey];
    if (!site) return false;
    if (site.minGear === "mask") return scene.hasDiveMask || scene.hasDiveTank;
    if (site.minGear === "tank") return scene.hasDiveTank;
    return true;
  }

  getCurrentSite() {
    const scene = this.scene;
    const zone = scene.getCurrentDiveZone();
    if (zone) return zone.meta.type;
    if (scene.nearIsland) return "shallow";
    if (scene.isNearIslandShallows()) return "shallow";
    return "open";
  }

  getOxygen(siteKey = "shallow") {
    const scene = this.scene;
    const site = DIVE_SITES[siteKey] ?? DIVE_SITES.shallow;
    let oxygen = site.oxygen;
    if (scene.hasDiveMask) oxygen += 10;
    if (scene.hasDiveTank) oxygen += 25;
    return oxygen;
  }

  resolveRisk(site) {
    const scene = this.scene;
    let chance = site.risk;
    if (scene.getNearestThreat(320)) chance += 12;
    if (scene.hasHarpoon) chance = Math.max(4, chance - 10);
    if (Phaser.Math.Between(1, 100) > chance) return "Oksijeni izle.";

    const damage = scene.hasHarpoon ? 4 : 8;
    scene.stats.hp = Math.max(0, scene.stats.hp - damage);
    scene.checkGameOver();
    if (site === DIVE_SITES.shallow) return "Deniz kestanesi ve canli temasi canini yakti.";
    if (site === DIVE_SITES.reef) return "Keskin mercan ve akinti seni zorladi.";
    if (site === DIVE_SITES.deep) return "Derinlik, karanlik ve basinc seni hirpaladi.";
    return scene.hasHarpoon ? "Zipkinle tehdidi savusturdun ama yoruldun." : "Acik suda bir tehdit seni siyrip gecti.";
  }
}

export { DIVE_SITES };
