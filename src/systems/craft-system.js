import { CRAFTS } from "../data/crafts.js";

const MODULE_CRAFT_NAMES = ["Su Toplayici", "Basit Ocak", "Yengec Kafesi", "Kucuk Sandik", "Basit Yatak", "Basit Direk", "Basit Forge", "Su Damitici", "Basit Yelken"];
const RAFT_CRAFT_NAMES = ["Sal Parcasi", "Baglanti Kirisi", "Toplama Agi"];
const FOOD_CRAFT_NAMES = ["Balik Pisir", "Et Pisir", "Kopek Baligi Eti Pisir", "Kabuklu Pisir", "Balik Yemi"];
const RAFT_BUILD_NAMES = [
  "Sal Parcasi",
  "Baglanti Kirisi",
  "Toplama Agi",
  "Su Toplayici",
  "Basit Ocak",
  "Yengec Kafesi",
  "Kucuk Sandik",
  "Basit Yatak",
  "Basit Direk",
  "Basit Forge",
  "Su Damitici",
  "Basit Yelken"
];

const RAFT_BUILD_ICONS = {
  "Sal Parcasi": "plank",
  "Baglanti Kirisi": "beam",
  "Toplama Agi": "net",
  "Su Toplayici": "waterCollector",
  "Basit Ocak": "grill",
  "Yengec Kafesi": "crabTrap",
  "Kucuk Sandik": "chest",
  "Basit Yatak": "bed",
  "Basit Direk": "mast",
  "Basit Forge": "forge",
  "Su Damitici": "waterDist",
  "Basit Yelken": "sail"
};

export class CraftSystem {
  constructor(scene) {
    this.scene = scene;
  }

  getVisibleCrafts(filter = "all") {
    return CRAFTS.filter((craft) => !craft.hidden && (!craft.unlockWhen || craft.unlockWhen(this.scene)) && this.isInFilter(craft, filter));
  }

  getRaftBuildCrafts(layer = null) {
    return CRAFTS.filter((craft) => RAFT_BUILD_NAMES.includes(craft.name) && (!layer || this.getRaftBuildLayer(craft.name) === layer));
  }

  getRaftBuildLayer(name) {
    if (name === "Sal Parcasi") return "raft";
    if (name === "Baglanti Kirisi" || name === "Toplama Agi") return "lower";
    return "module";
  }

  getRaftBuildType(name) {
    return {
      "Sal Parcasi": "raft",
      "Baglanti Kirisi": "beam",
      "Toplama Agi": "net",
      "Su Toplayici": "waterCollector",
      "Basit Ocak": "grill",
      "Yengec Kafesi": "crabTrap",
      "Kucuk Sandik": "chest",
      "Basit Yatak": "bed",
      "Basit Direk": "mast",
      "Basit Forge": "forge",
      "Su Damitici": "waterDist",
      "Basit Yelken": "sail"
    }[name] ?? null;
  }

  isInFilter(craft, filter = "all") {
    if (filter === "all") return true;
    const name = craft.name;
    if (filter === "module") return MODULE_CRAFT_NAMES.includes(name);
    if (filter === "raft") return RAFT_CRAFT_NAMES.includes(name);
    if (filter === "food") return FOOD_CRAFT_NAMES.includes(name);
    if (filter === "gear") return !MODULE_CRAFT_NAMES.includes(name) && !RAFT_CRAFT_NAMES.includes(name);
    return true;
  }

  getRaftBuildIcon(name) {
    return RAFT_BUILD_ICONS[name] ?? "?";
  }
}

export { CRAFTS };
