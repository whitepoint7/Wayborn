import Phaser from "phaser";
import {
  CHUNK_SIZE,
  DANGEROUS_CHUNK_DISTANCE,
  HARSH_CHUNK_DISTANCE,
  MAX_CHUNK_DISTANCE,
  SAFE_CHUNK_DISTANCE
} from "../data/config.js";
import { DIVE_SITES } from "../data/diving.js";
import { STATIC_CITIES, STATIC_ISLANDS, STATIC_PORTS } from "../data/world.js";
import { createSeededRandom, hashSeed } from "./seeded-random.js";

export class WorldSystem {
  constructor(scene, { worldSize }) {
    this.scene = scene;
    this.worldSize = worldSize;
    this.generatedChunks = new Set();
    this.lastRiskBand = "safe";
  }

  createObjects() {
    const scene = this.scene;
    STATIC_ISLANDS.forEach((location) => scene.spawnIsland(location));
    STATIC_PORTS.forEach((location) => scene.spawnPort(location));
    STATIC_CITIES.forEach((location) => scene.spawnCity(location));
    this.ensureChunksAroundPlayer(2);
    for (let i = 0; i < 2; i += 1) scene.spawnShark();
    scene.crewSystem.spawnSurvivor(true);
  }

  updateChunks() {
    this.ensureChunksAroundPlayer(1);
    this.checkRiskBand();
  }

  getChunkCoord(x, y) {
    return {
      x: Math.floor((x + this.worldSize / 2) / CHUNK_SIZE) - MAX_CHUNK_DISTANCE,
      y: Math.floor((y + this.worldSize / 2) / CHUNK_SIZE) - MAX_CHUNK_DISTANCE
    };
  }

  getChunkDistance(x = this.scene.playerRoot.x, y = this.scene.playerRoot.y) {
    const coord = this.getChunkCoord(x, y);
    return Math.max(Math.abs(coord.x), Math.abs(coord.y));
  }

  getRiskProfile(x = this.scene.playerRoot.x, y = this.scene.playerRoot.y) {
    const distance = this.getChunkDistance(x, y);
    if (distance >= MAX_CHUNK_DISTANCE) {
      return { band: "edge", distance, multiplier: 3, rareBonus: 2.8, label: "Sinir Sulari" };
    }
    if (distance >= DANGEROUS_CHUNK_DISTANCE) {
      return { band: "danger", distance, multiplier: 3, rareBonus: 2.2, label: "Tehlikeli Sular" };
    }
    if (distance >= HARSH_CHUNK_DISTANCE) {
      return { band: "harsh", distance, multiplier: 2, rareBonus: 1.65, label: "Cetin Sular" };
    }
    return { band: "safe", distance, multiplier: 1, rareBonus: 1, label: distance > SAFE_CHUNK_DISTANCE ? "Acik Deniz" : "Guvenli Sular" };
  }

  checkRiskBand() {
    const scene = this.scene;
    const profile = this.getRiskProfile();
    if (profile.band === this.lastRiskBand) return;
    this.lastRiskBand = profile.band;
    if (profile.band === "harsh") {
      scene.logEvent("Cetin sulara girdin. Zararlar ve tuketim 2x, nadir ganimet sansi daha yuksek.", "warn");
    } else if (profile.band === "danger") {
      scene.logEvent("Tehlikeli sular. Buyuk avcilar ve nadir kaynaklar burada.", "danger");
    } else if (profile.band === "edge") {
      scene.logEvent("Buradan sadece oluler ve tanrilar gecer. Daha ileri gidemezsin.", "danger");
    } else {
      scene.logEvent("Daha sakin sulara dondun.", "good");
    }
  }

  ensureChunksAroundPlayer(radius = 1) {
    const center = this.getChunkCoord(this.scene.playerRoot.x, this.scene.playerRoot.y);
    for (let cy = center.y - radius; cy <= center.y + radius; cy += 1) {
      for (let cx = center.x - radius; cx <= center.x + radius; cx += 1) {
        if (Math.max(Math.abs(cx), Math.abs(cy)) >= MAX_CHUNK_DISTANCE) continue;
        this.generateChunk(cx, cy);
      }
    }
  }

  generateChunk(cx, cy) {
    const key = `${cx},${cy}`;
    if (this.generatedChunks.has(key)) return;
    this.generatedChunks.add(key);
    const scene = this.scene;
    const rng = createSeededRandom(hashSeed(scene.worldSeed, "chunk", cx, cy));
    const centerX = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
    const centerY = cy * CHUNK_SIZE + CHUNK_SIZE / 2;
    const profile = this.getRiskProfile(centerX, centerY);
    const driftCount = profile.band === "safe" ? 5 : profile.band === "harsh" ? 7 : 9;
    for (let i = 0; i < driftCount; i += 1) scene.spawnDriftItemInArea(centerX, centerY, CHUNK_SIZE * 0.48, profile, rng);

    const reefChance = profile.band === "safe" ? 22 : profile.band === "harsh" ? 38 : 54;
    const deepChance = profile.band === "safe" ? 8 : profile.band === "harsh" ? 18 : 34;
    const fishChance = profile.band === "safe" ? 20 : profile.band === "harsh" ? 30 : 42;
    if (rng.chance(reefChance)) scene.spawnDiveZone("reef", centerX, centerY, CHUNK_SIZE * 0.44, rng);
    if (rng.chance(deepChance)) scene.spawnDiveZone("deep", centerX, centerY, CHUNK_SIZE * 0.44, rng);
    if (rng.chance(fishChance)) scene.spawnFishSchool(centerX, centerY, CHUNK_SIZE * 0.42, rng);
    if (profile.band !== "safe" && rng.chance(profile.band === "danger" ? 42 : 20)) scene.spawnShark(centerX, centerY, CHUNK_SIZE * 0.46, profile, rng);
  }

  checkNearbyLocations() {
    const scene = this.scene;
    if (scene.isGameOver) return;
    const lookoutRange = scene.getLookoutRange();
    this.checkNearbyIsland(lookoutRange);
    this.checkNearbyPort(lookoutRange);
    this.checkNearbyCity(lookoutRange);
    this.checkDiveZoneDiscovery(lookoutRange);
    scene.crewSystem.checkNearby();
  }

  checkNearbyIsland(lookoutRange) {
    const scene = this.scene;
    let closest = null;
    let closestDistance = Infinity;
    scene.islands.getChildren().forEach((island) => {
      const distance = Phaser.Math.Distance.Between(island.x, island.y, scene.playerRoot.x, scene.playerRoot.y);
      if (lookoutRange > 0 && distance < lookoutRange) {
        scene.discoverLocation("island", island.x, island.y, island.meta.name);
      }
      const interactionRadius = (island.meta.collisionRadius ?? island.meta.radius) + scene.raftTileSize * 13;
      if (distance < interactionRadius && distance < closestDistance) {
        closest = island;
        closestDistance = distance;
      }
    });
    if (closest !== scene.nearIsland) {
      scene.nearIsland = closest;
      scene.updateActionLabels();
      if (closest) {
        scene.discoverLocation("island", closest.x, closest.y, closest.meta.name);
        scene.toast("Ada yakininda", scene.playerRoot.x, scene.playerRoot.y - 70, "#fff0aa");
      }
    }
  }

  checkNearbyPort(lookoutRange) {
    const scene = this.scene;
    let closestPort = null;
    let closestPortDistance = Infinity;
    scene.ports.getChildren().forEach((port) => {
      const distance = Phaser.Math.Distance.Between(port.x, port.y, scene.playerRoot.x, scene.playerRoot.y);
      if (lookoutRange > 0 && distance < lookoutRange + 120) {
        scene.discoverLocation("port", port.x, port.y, port.meta?.name ?? "Kucuk Liman");
      }
      if (distance < port.meta.radius + 28 && distance < closestPortDistance) {
        closestPort = port;
        closestPortDistance = distance;
      }
    });
    if (closestPort !== scene.nearPort) {
      scene.nearPort = closestPort;
      scene.updateActionLabels();
      if (closestPort) {
        scene.discoverLocation("port", closestPort.x, closestPort.y, closestPort.meta?.name ?? "Kucuk Liman");
        scene.toast("Liman yakininda", scene.playerRoot.x, scene.playerRoot.y - 70, "#d6f7ff");
      }
    }
  }

  checkNearbyCity(lookoutRange) {
    const scene = this.scene;
    let closest = null;
    let closestDistance = Infinity;
    scene.cities.getChildren().forEach((city) => {
      const distance = Phaser.Math.Distance.Between(city.x, city.y, scene.playerRoot.x, scene.playerRoot.y);
      if (lookoutRange > 0 && distance < lookoutRange + 180) {
        scene.discoverLocation("city", city.x, city.y, city.meta.name);
      }
      if (distance < city.meta.radius + 34 && distance < closestDistance) {
        closest = city;
        closestDistance = distance;
      }
    });
    if (closest !== scene.nearCity) {
      scene.nearCity = closest;
      scene.updateActionLabels();
      if (closest) {
        scene.discoverLocation("city", closest.x, closest.y, closest.meta.name);
        scene.toast("Sehir yakininda", scene.playerRoot.x, scene.playerRoot.y - 70, "#ffd18c");
      }
    }
  }

  checkDiveZoneDiscovery(lookoutRange) {
    const scene = this.scene;
    scene.diveZones.getChildren().forEach((zone) => {
      const distance = Phaser.Math.Distance.Between(zone.x, zone.y, scene.playerRoot.x, scene.playerRoot.y);
      if (distance < zone.meta.radius + 120 || (lookoutRange > 0 && distance < lookoutRange)) {
        scene.discoverLocation(zone.meta.type === "deep" ? "deep" : "reef", zone.x, zone.y, DIVE_SITES[zone.meta.type]?.label);
      }
    });
  }
}
