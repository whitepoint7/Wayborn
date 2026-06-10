import { BAIT_PRICE, MARKET_SPECIALTIES, PORT_MARKETS, PORT_SERVICES, RARE_TRADE_KEYS, TRADE_GOODS } from "../data/trade.js";

export class TradeSystem {
  constructor(scene, { itemLabels, inventoryKeys }) {
    this.scene = scene;
    this.itemLabels = itemLabels;
    this.inventoryKeys = inventoryKeys;
  }

  getMarketProfile() {
    const band = this.scene.currentPort?.meta?.marketBand;
    if (band === "danger" || band === "edge") return PORT_MARKETS.danger;
    if (band === "harsh") return PORT_MARKETS.harsh;
    return PORT_MARKETS.safe;
  }

  getBuyGoods() {
    const profile = this.getMarketProfile();
    const specialty = this.getMarketSpecialty();
    return [...new Set([...profile.buyKeys, ...(specialty.extraBuyKeys ?? [])])]
      .filter((key) => TRADE_GOODS.buy[key])
      .map((key) => ({ key, price: this.getBuyPrice(key) }));
  }

  getBuyPrice(key) {
    const base = TRADE_GOODS.buy[key];
    if (!base) return 0;
    const specialty = this.getMarketSpecialty();
    const specialtyMultiplier = specialty.buyDiscountKeys?.includes(key) ? 0.82 : 1;
    return Math.max(1, Math.round(base * this.getMarketProfile().buyMultiplier * specialtyMultiplier));
  }

  getSellPrice(key) {
    const base = TRADE_GOODS.sell[key];
    if (!base) return 0;
    const profile = this.getMarketProfile();
    const multiplier = RARE_TRADE_KEYS.includes(key) ? profile.rareSellMultiplier : profile.sellMultiplier;
    return Math.max(1, Math.round(base * multiplier));
  }

  getMarketSpecialty() {
    return MARKET_SPECIALTIES[this.scene.currentPort?.meta?.marketType] ?? MARKET_SPECIALTIES.salvage;
  }

  getMarketLabel() {
    return `${this.getMarketProfile().label} / ${this.getMarketSpecialty().label}`;
  }

  getServices() {
    const scene = this.scene;
    return [
      {
        key: "heal",
        ...PORT_SERVICES.heal,
        disabled: scene.stats.hp >= 100,
        action: () => scene.buyPortHeal()
      },
      {
        key: "repair",
        ...PORT_SERVICES.repair,
        disabled: !this.hasDamagedRaft(),
        action: () => scene.buyPortRepair()
      },
      {
        key: "supplies",
        ...PORT_SERVICES.supplies,
        disabled: scene.stats.thirst >= 95 && scene.stats.hunger >= 95,
        action: () => scene.buyPortSupplies()
      },
      {
        key: "waterFill",
        ...PORT_SERVICES.waterFill,
        disabled: !scene.hasFlask || scene.flaskWater >= scene.maxFlaskWater,
        action: () => scene.buyPortWaterFill()
      }
    ];
  }

  sellItem(key) {
    const scene = this.scene;
    const price = this.getSellPrice(key);
    if (!price || (scene.inventory[key] ?? 0) <= 0) return false;
    scene.inventory[key] -= 1;
    scene.gold += price;
    if (key === "fish" || key === "cookedFish") scene.markQuestFlag("soldFish");
    scene.recordQuestAction("soldItem");
    scene.toast(`${this.itemLabels[key]} satildi +${price} altin`, scene.playerRoot.x, scene.playerRoot.y - 70, "#ffd18c");
    return true;
  }

  buyItem(key) {
    const scene = this.scene;
    const price = this.getBuyPrice(key);
    if (!price || scene.gold < price || !scene.canStore(1)) return false;
    scene.gold -= price;
    scene.inventory[key] = (scene.inventory[key] ?? 0) + 1;
    scene.recordQuestAction("boughtItem");
    scene.toast(`${this.itemLabels[key]} alindi`, scene.playerRoot.x, scene.playerRoot.y - 70, "#d6f7ff");
    return true;
  }

  buyBait() {
    const scene = this.scene;
    if (scene.gold < BAIT_PRICE) return false;
    scene.gold -= BAIT_PRICE;
    scene.fishingBait += 1;
    scene.toast("Balik yemi alindi", scene.playerRoot.x, scene.playerRoot.y - 70, "#d6f7ff");
    return true;
  }

  buyHeal() {
    const scene = this.scene;
    const { price } = PORT_SERVICES.heal;
    if (scene.gold < price || scene.stats.hp >= 100) return false;
    scene.gold -= price;
    scene.stats.hp = Math.min(100, scene.stats.hp + 35);
    scene.notify("Liman hekimi yaralarini sardi.", scene.playerRoot.x, scene.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  buyRepair() {
    const scene = this.scene;
    const { price } = PORT_SERVICES.repair;
    if (scene.gold < price || !this.hasDamagedRaft()) return false;
    scene.gold -= price;
    scene.raftIntegrity = Math.min(100, scene.raftIntegrity + 40);
    scene.raftTiles.forEach((tile) => {
      tile.hp = scene.getMaxTileHp(tile);
      if (tile.netHp > 0) tile.netHp = 2;
    });
    scene.drawRaft();
    scene.notify("Liman ustalari sali onardi.", scene.playerRoot.x, scene.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  buySupplies() {
    const scene = this.scene;
    const { price } = PORT_SERVICES.supplies;
    if (scene.gold < price || (scene.stats.thirst >= 95 && scene.stats.hunger >= 95)) return false;
    scene.gold -= price;
    scene.stats.thirst = Math.min(100, scene.stats.thirst + 25);
    scene.stats.hunger = Math.min(100, scene.stats.hunger + 18);
    scene.waterReserve = Math.min(scene.maxWaterReserve, scene.waterReserve + 1);
    scene.notify("Liman ikmali yapildi.", scene.playerRoot.x, scene.playerRoot.y - 70, "#bff4c7", "good");
    return true;
  }

  buyWaterFill() {
    const scene = this.scene;
    const { price } = PORT_SERVICES.waterFill;
    if (scene.gold < price || !scene.hasFlask || scene.flaskWater >= scene.maxFlaskWater) return false;
    scene.gold -= price;
    scene.fillFlask("Limanda matara dolduruldu");
    return true;
  }

  applyContractReward(reward) {
    const scene = this.scene;
    if (reward.gold) scene.gold += reward.gold;
    if (reward.morale) scene.stats.morale = Math.min(100, scene.stats.morale + reward.morale);
    if (reward.bait) scene.fishingBait += reward.bait;
    this.inventoryKeys.forEach((key) => {
      if (!reward[key]) return;
      if (scene.canStore(reward[key])) {
        scene.inventory[key] = (scene.inventory[key] ?? 0) + reward[key];
      } else if (scene.canStoreInChest(reward[key])) {
        scene.storage[key] = (scene.storage[key] ?? 0) + reward[key];
        scene.notify(`${this.itemLabels[key]} odulu sandiga aktarildi.`, scene.playerRoot.x, scene.playerRoot.y - 92, "#d6f7ff", "info");
      } else {
        scene.notify(`${this.itemLabels[key]} odulu icin yer yok.`, scene.playerRoot.x, scene.playerRoot.y - 92, "#ffcc93", "warn");
      }
    });
  }

  hasDamagedRaft() {
    const scene = this.scene;
    return scene.raftIntegrity < 100 ||
      scene.raftTiles.some((tile) => (tile.hp ?? scene.getMaxTileHp(tile)) < scene.getMaxTileHp(tile) || (tile.netHp > 0 && tile.netHp < 2));
  }
}

export { BAIT_PRICE, PORT_SERVICES, TRADE_GOODS };
