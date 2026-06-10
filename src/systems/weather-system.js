import Phaser from "phaser";
import { SEA_STATES, WEATHER_STATES } from "../data/environment.js";

const SAFE_START_DAYS = 3;

export class WeatherSystem {
  constructor(scene) {
    this.scene = scene;
  }

  changeBeat() {
    const scene = this.scene;
    if (scene.isGameOver || !scene.windEnabled) return;
    const weather = WEATHER_STATES[scene.weatherState] ?? WEATHER_STATES.sunny;
    scene.wind.rotate(Phaser.Math.FloatBetween(-0.07, 0.07));
    scene.windPower = Phaser.Math.Clamp(scene.windPower + Phaser.Math.FloatBetween(-0.025, 0.03) + weather.windBias * 0.25, 0.16, 0.52);
    if (Math.abs(scene.windPower - scene.lastWindLogPower) > 0.12) {
      scene.lastWindLogPower = scene.windPower;
      scene.logEvent(scene.windPower > 0.34 ? "Ruzgar gucleniyor; rotani buna gore ayarla." : "Ruzgar sakinledi.", scene.windPower > 0.34 ? "warn" : "info");
    }
  }

  rollWeatherState() {
    this.beginDay(this.scene.worldDay, true);
  }

  beginDay(day, force = false) {
    const scene = this.scene;
    if (day <= SAFE_START_DAYS) {
      scene.weatherPlan = {
        type: "sunny",
        remainingDays: SAFE_START_DAYS - day + 1,
        breakStart: 1,
        breakLength: 0,
        day
      };
      scene.weatherState = "sunny";
      scene.seaState = "calm";
      return;
    }
    if (!force && scene.weatherPlan?.remainingDays > 1) {
      scene.weatherPlan.remainingDays -= 1;
      return;
    }
    const roll = Phaser.Math.Between(1, 100);
    const type = roll <= 34 ? "sunny" : roll <= 62 ? "cloudy" : roll <= 88 ? "rain" : "storm";
    scene.weatherPlan = {
      type,
      remainingDays: type === "rain" ? Phaser.Math.Between(2, 3) : type === "cloudy" ? Phaser.Math.Between(1, 3) : Phaser.Math.Between(1, 2),
      breakStart: Phaser.Math.FloatBetween(0.46, 0.68),
      breakLength: Phaser.Math.FloatBetween(0.08, 0.18),
      day
    };
    scene.logEvent(`Yeni gunun hava tahmini: ${WEATHER_STATES[type].label}.`, type === "storm" ? "warn" : "info");
  }

  updateForecast(dayProgress) {
    const scene = this.scene;
    if (scene.worldDay <= SAFE_START_DAYS) {
      if (!scene.weatherPlan || scene.weatherPlan.day !== scene.worldDay || scene.weatherPlan.type !== "sunny") {
        this.beginDay(scene.worldDay, true);
      }
      scene.weatherState = "sunny";
      scene.seaState = "calm";
      return;
    }
    if (!scene.weatherPlan) this.beginDay(scene.worldDay);
    const plan = scene.weatherPlan;
    const inBreak = dayProgress >= plan.breakStart && dayProgress <= plan.breakStart + plan.breakLength;
    let nextWeather = plan.type;
    if (inBreak && plan.type === "rain") nextWeather = "cloudy";
    if (inBreak && plan.type === "cloudy") nextWeather = "sunny";
    if (inBreak && plan.type === "storm") nextWeather = "rain";
    const nextSea = nextWeather === "storm"
      ? "rough"
      : nextWeather === "rain" || scene.windPower > 0.4
        ? "choppy"
        : scene.windPower > 0.34 ? "choppy" : "calm";

    const changed = nextWeather !== scene.weatherState || nextSea !== scene.seaState;
    scene.weatherState = nextWeather;
    scene.seaState = nextSea;
    const isSevereWeather = nextWeather === "storm" || nextSea === "rough";
    if (changed && isSevereWeather) {
      const message = nextWeather === "storm"
        ? `Firtina yaklasiyor, deniz ${scene.getSeaLabel()}.`
        : `Deniz sertlesti: ${scene.getSeaLabel()}.`;
      if (message !== scene.lastWeatherLog) {
        scene.lastWeatherLog = message;
        scene.logEvent(message, "warn");
      }
    }
  }

  passiveSurvivalTick() {
    const scene = this.scene;
    if (scene.isGameOver) return;
    const weather = WEATHER_STATES[scene.weatherState] ?? WEATHER_STATES.sunny;
    const sea = SEA_STATES[scene.seaState] ?? SEA_STATES.calm;
    const nightThirstRelief = scene.isNight ? 0.68 : 1;
    const risk = scene.getRiskMultiplier();
    scene.stats.thirst = Math.max(0, scene.stats.thirst - 0.72 * nightThirstRelief * risk);
    scene.stats.hunger = Math.max(0, scene.stats.hunger - 0.22 * risk);
    if (scene.hasWaterCollector) {
      scene.waterReserve = Math.min(scene.maxWaterReserve, scene.waterReserve + 1 + weather.waterBonus);
    }
    if (scene.hasWaterDist && scene.isAnchored) {
      scene.waterDistTimer = (scene.waterDistTimer ?? 0) + 1;
      if (scene.waterDistTimer >= 3) {
        scene.waterDistTimer = 0;
        scene.waterReserve = Math.min(scene.maxWaterReserve, scene.waterReserve + 1);
        scene.logEvent("Su damitici temiz su uretti.", "good");
      }
    }
    if ((scene.hasWaterCollector || scene.hasWaterDist) && scene.waterReserve > 0) {
      if (scene.stats.thirst < 72 && scene.waterReserve > 0) {
        scene.waterReserve -= 1;
        scene.stats.thirst = Math.min(100, scene.stats.thirst + 14);
        scene.logEvent("Depodan temiz su icildi.", "good");
      }
    }
    if (scene.stats.thirst < 48) scene.drinkFromFlask();
    this.resolveRaftStress(weather, sea);
    if (scene.stats.hunger < 34 && (scene.inventory.cookedSharkMeat ?? 0) > 0) {
      scene.inventory.cookedSharkMeat -= 1;
      scene.stats.hunger = Math.min(100, scene.stats.hunger + 72);
      scene.logEvent("Pismis kopek baligi eti yenildi.", "good");
    } else if (scene.stats.hunger < 58 && scene.inventory.cookedFish > 0) {
      scene.inventory.cookedFish -= 1;
      scene.stats.hunger = Math.min(100, scene.stats.hunger + 24);
      scene.logEvent("Pismis balik yenildi.", "good");
    } else if (scene.stats.hunger < 58 && scene.inventory.cookedMeat > 0) {
      scene.inventory.cookedMeat -= 1;
      scene.stats.hunger = Math.min(100, scene.stats.hunger + 22);
      scene.logEvent("Pismis et yenildi.", "good");
    } else if (scene.stats.hunger < 42 && scene.inventory.fruit > 0) {
      scene.inventory.fruit -= 1;
      scene.stats.hunger = Math.min(100, scene.stats.hunger + 16);
      scene.logEvent("Meyve yenildi.", "good");
    } else if (scene.stats.hunger < 36 && scene.inventory.food > 0) {
      scene.inventory.food -= 1;
      scene.stats.hunger = Math.min(100, scene.stats.hunger + 14);
      scene.logEvent("Yiyecek yenildi.", "good");
    }
    if (scene.stats.thirst < 25 && !scene.needWarnings.thirst) {
      scene.needWarnings.thirst = true;
      scene.logEvent("Susuzluk kritik seviyeye yaklasiyor.", "warn");
    }
    if (scene.stats.hunger < 25 && !scene.needWarnings.hunger) {
      scene.needWarnings.hunger = true;
      scene.logEvent("Aclik kritik seviyeye yaklasiyor.", "warn");
    }
    if (scene.stats.thirst >= 35) scene.needWarnings.thirst = false;
    if (scene.stats.hunger >= 35) scene.needWarnings.hunger = false;
    if (scene.stats.thirst <= 0 || scene.stats.hunger <= 0) {
      scene.stats.hp = Math.max(0, scene.stats.hp - 3 * risk);
      scene.checkGameOver();
    }
  }

  resolveRaftStress(weather, sea) {
    const scene = this.scene;
    if (scene.worldDay <= SAFE_START_DAYS) return;
    if (scene.isAnchored && sea.roughness < 2) return;
    const loadRatio = scene.getRaftLoadRatio();
    const overloadRisk = loadRatio > 1 ? Math.round((loadRatio - 1) * 22) : 0;
    const integrityRisk = scene.raftIntegrity < 45 ? 8 : 0;
    const anchorRelief = scene.isAnchored ? 0.55 : 1;
    const risk = Math.round((weather.stormRisk + sea.roughness * 5 + overloadRisk + integrityRisk) * anchorRelief);
    if (risk <= 0 || Phaser.Math.Between(1, 100) > risk) return;
    const riskMultiplier = scene.getRiskMultiplier();
    const damage = Math.round((sea.roughness >= 2 ? Phaser.Math.Between(3, 7) : Phaser.Math.Between(2, 4)) * riskMultiplier);
    scene.raftIntegrity = Math.max(0, scene.raftIntegrity - damage);
    if (scene.hasSail && scene.sailHp > 0 && (weather.stormRisk > 0 || sea.roughness >= 2) && Phaser.Math.Between(1, 100) <= 38) {
      scene.sailHp = Math.max(0, scene.sailHp - 1);
      if (scene.sailHp <= 0) {
        scene.hasSail = false;
        scene.logEvent("Firtina yelkeni parcaladi.", "danger");
      } else {
        scene.logEvent("Yelken yirtildi. Ruzgar verimi dustu.", "warn");
      }
      scene.drawSail();
    }
    const damagedTile = scene.raftTiles
      .filter((tile) => !scene.isCenterTile(tile))
      .sort((a, b) => (a.hp ?? scene.getMaxTileHp(a)) - (b.hp ?? scene.getMaxTileHp(b)))[0];
    if (damagedTile && Phaser.Math.Between(1, 100) <= 45) {
      damagedTile.hp = Math.max(1, (damagedTile.hp ?? scene.getMaxTileHp(damagedTile)) - 1);
      scene.drawRaft();
    }
    scene.logEvent("Kotu hava sali zorluyor. Capa ve yuk durumunu kontrol et.", "warn");
    scene.checkGameOver();
  }
}
