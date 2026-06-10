import Phaser from "phaser";

const DISCOVERY_TYPES = ["island", "port", "city", "reef", "deep"];

export class DiscoverySystem {
  constructor(scene, { worldSize }) {
    this.scene = scene;
    this.worldSize = worldSize;
  }

  discover(type, x, y, label = null) {
    const scene = this.scene;
    const existing = scene.discoveries.find((entry) =>
      entry.type === type && Phaser.Math.Distance.Between(entry.x, entry.y, x, y) < 140
    );
    if (existing) return existing;

    const count = scene.discoveries.filter((entry) => entry.type === type).length + 1;
    const baseName = label ?? this.getTypeLabel(type);
    const entry = {
      id: `${type}:${Math.round(x)}:${Math.round(y)}`,
      type,
      name: label ? baseName : `${baseName} ${count}`,
      x: Math.round(x),
      y: Math.round(y),
      foundAt: Date.now()
    };
    scene.discoveries.push(entry);
    scene.notify(`Kesfedildi: ${entry.name}`, scene.playerRoot.x, scene.playerRoot.y - 86, "#d6f7ff", "info");
    return entry;
  }

  normalize(discoveries) {
    if (!Array.isArray(discoveries)) return [];
    return discoveries
      .map((entry) => {
        if (!entry || !Number.isFinite(entry.x) || !Number.isFinite(entry.y)) return null;
        const type = DISCOVERY_TYPES.includes(entry.type) ? entry.type : "island";
        return {
          id: String(entry.id || `${type}:${Math.round(entry.x)}:${Math.round(entry.y)}`).slice(0, 80),
          type,
          name: String(entry.name || this.getTypeLabel(type)).slice(0, 40),
          x: Phaser.Math.Clamp(Math.round(entry.x), -this.worldSize / 2, this.worldSize / 2),
          y: Phaser.Math.Clamp(Math.round(entry.y), -this.worldSize / 2, this.worldSize / 2),
          foundAt: Math.max(0, Math.floor(entry.foundAt ?? 0))
        };
      })
      .filter(Boolean)
      .filter((entry, index, list) => list.findIndex((candidate) => candidate.id === entry.id) === index)
      .slice(0, 80);
  }

  getTypeLabel(type) {
    return {
      island: "Ada",
      port: "Liman",
      city: "Sehir",
      reef: "Resif",
      deep: "Derin Su"
    }[type] ?? "Kesif";
  }

  getCounts() {
    return this.scene.discoveries.reduce((counts, entry) => {
      counts[entry.type] = (counts[entry.type] ?? 0) + 1;
      return counts;
    }, { island: 0, port: 0, city: 0, reef: 0, deep: 0 });
  }

  getDistanceTo(point) {
    const scene = this.scene;
    return Phaser.Math.Distance.Between(scene.playerRoot.x, scene.playerRoot.y, point.x, point.y);
  }

  follow(id) {
    const scene = this.scene;
    if (!scene.hasCompass) {
      scene.showAlertModal("Bir hedefi takip etmek icin once Pusula yap.");
      return false;
    }
    if (!scene.discoveries.some((entry) => entry.id === id)) return false;
    scene.followedDiscoveryId = id;
    return true;
  }

  clearFollow() {
    this.scene.followedDiscoveryId = null;
  }

  getFollowedTarget() {
    const scene = this.scene;
    if (!scene.hasCompass || !scene.followedDiscoveryId) return null;
    const entry = scene.discoveries.find((candidate) => candidate.id === scene.followedDiscoveryId);
    if (!entry) return null;
    const distance = this.getDistanceTo(entry);
    if (distance <= 120) return null;
    return {
      x: entry.x,
      y: entry.y,
      name: entry.name,
      distance,
      label: this.getTypeLabel(entry.type)
    };
  }
}
