import Phaser from "phaser";

export class ThreatSystem {
  constructor(scene, { worldSize }) {
    this.scene = scene;
    this.worldSize = worldSize;
  }

  update(dt) {
    const scene = this.scene;
    if (scene.isGameOver || scene.stats.hp <= 0) return;
    scene.threats.getChildren().forEach((shark) => this.updateShark(shark, dt));
  }

  updateShark(shark, dt) {
    const scene = this.scene;
    shark.meta.retreatTime = Math.max(0, shark.meta.retreatTime - dt);
    if (shark.meta.retreatTime > 0) {
      this.moveAway(shark, dt);
      return;
    }
    if (scene.isOnIsland) {
      shark.meta.warned = false;
      shark.meta.biteCooldown = Math.max(0, shark.meta.biteCooldown - dt);
      this.moveIdle(shark, dt);
      return;
    }

    const dist = Phaser.Math.Distance.Between(shark.x, shark.y, scene.playerRoot.x, scene.playerRoot.y);
    const detectionRange = scene.isNight ? 390 : scene.weatherState === "storm" ? 500 : 720;
    if (dist < detectionRange * 0.5 && !shark.meta.warned) {
      shark.meta.warned = true;
      scene.logEvent("Kopek baligi takipte. Kara parcasina ya da capaya hazirlan.", "warn");
    }
    if (dist > detectionRange + 80) shark.meta.warned = false;
    if (dist < detectionRange) {
      const angle = Phaser.Math.Angle.Between(shark.x, shark.y, scene.playerRoot.x, scene.playerRoot.y);
      shark.x += Math.cos(angle) * shark.meta.speed * dt;
      shark.y += Math.sin(angle) * shark.meta.speed * dt;
      shark.rotation = angle + Math.PI / 2;
      scene.resolveIslandCollisionForThreat(shark);
    }

    shark.meta.biteCooldown = Math.max(0, shark.meta.biteCooldown - dt);
    if (dist < 58 && shark.meta.biteCooldown <= 0) {
      shark.meta.biteCooldown = 130;
      this.resolveBite(shark);
    }
  }

  resolveBite(shark) {
    const scene = this.scene;
    const netHit = this.damageRaftNet();
    const raftHit = netHit ? { protectedPlayer: true, message: "Kopek baligi agi parcaladi!" } : this.damageRaftFromShark(shark);
    if (!raftHit.protectedPlayer) {
      scene.stats.hp = Math.max(0, scene.stats.hp - Math.round(8 * scene.getRiskMultiplier()));
    }
    scene.notify(raftHit.message, scene.playerRoot.x, scene.playerRoot.y - 42, "#ff9c87", "danger");
    if (scene.raftIntegrity < 35) scene.logEvent("Sal govdesi agir hasarli. Tamir et.", "danger");
    scene.checkGameOver();
  }

  getNearby(maxDistance = 900) {
    const scene = this.scene;
    return scene.threats.getChildren().filter((shark) => {
      const dist = Phaser.Math.Distance.Between(shark.x, shark.y, scene.playerRoot.x, scene.playerRoot.y);
      return dist <= maxDistance;
    });
  }

  getNearest(maxDistance = 220) {
    const scene = this.scene;
    let nearest = null;
    let nearestDistance = maxDistance;
    scene.threats.getChildren().forEach((shark) => {
      if (shark.meta.retreatTime > 0) return;
      const distance = Phaser.Math.Distance.Between(shark.x, shark.y, scene.playerRoot.x, scene.playerRoot.y);
      if (distance <= nearestDistance) {
        nearest = shark;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  scatter(sharks = this.getNearby(900)) {
    let count = 0;
    sharks.forEach((shark) => {
      count += 1;
      this.forceRetreat(shark);
      shark.meta.retreatTime = 360;
    });
    return count;
  }

  moveAway(shark, dt) {
    const scene = this.scene;
    const angle = Phaser.Math.Angle.Between(scene.playerRoot.x, scene.playerRoot.y, shark.x, shark.y);
    shark.x = Phaser.Math.Clamp(shark.x + Math.cos(angle) * shark.meta.speed * 1.5 * dt, -this.worldSize / 2, this.worldSize / 2);
    shark.y = Phaser.Math.Clamp(shark.y + Math.sin(angle) * shark.meta.speed * 1.5 * dt, -this.worldSize / 2, this.worldSize / 2);
    shark.rotation = angle + Math.PI / 2;
    scene.resolveIslandCollisionForThreat(shark);
  }

  moveIdle(shark, dt) {
    const scene = this.scene;
    let angle = shark.meta.wanderAngle;
    if (scene.currentIsland) {
      const fromIsland = Phaser.Math.Angle.Between(scene.currentIsland.x, scene.currentIsland.y, shark.x, shark.y);
      angle = fromIsland + Math.PI / 2;
      const distance = Phaser.Math.Distance.Between(shark.x, shark.y, scene.currentIsland.x, scene.currentIsland.y);
      if (distance < scene.currentIsland.meta.radius + 120) {
        angle = fromIsland;
      }
    } else {
      shark.meta.wanderAngle += Phaser.Math.FloatBetween(-0.015, 0.015) * dt;
      angle = shark.meta.wanderAngle;
    }
    shark.x = Phaser.Math.Clamp(shark.x + Math.cos(angle) * shark.meta.speed * 0.55 * dt, -this.worldSize / 2, this.worldSize / 2);
    shark.y = Phaser.Math.Clamp(shark.y + Math.sin(angle) * shark.meta.speed * 0.55 * dt, -this.worldSize / 2, this.worldSize / 2);
    shark.rotation = angle + Math.PI / 2;
    scene.resolveIslandCollisionForThreat(shark);
  }

  tryAttack() {
    const scene = this.scene;
    if (scene.isGameOver || scene.isOnIsland) return false;
    if (!scene.hasHarpoon) {
      scene.toast("Saldirmak icin Basit Zipkin gerekli", scene.playerRoot.x, scene.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    const shark = this.getNearest(240);
    if (!shark) {
      scene.toast("Kopek baligi menzilde degil", scene.playerRoot.x, scene.playerRoot.y - 70, "#ffcc93");
      return false;
    }
    scene.recordQuestAction("sharkAttacked");

    const roll = Phaser.Math.Between(1, 100);
    if (roll <= 12) {
      const x = shark.x;
      const y = shark.y;
      shark.destroy();
      scene.spawnLootItem("sharkMeat", x - 12, y, 0xb65b54);
      scene.spawnLootItem("sharkBone", x + 12, y, 0xe8dfc5);
      scene.notify("Kopek baligi avlandi. Et ve kemik suya dustu.", scene.playerRoot.x, scene.playerRoot.y - 70, "#bff4c7", "good");
    } else if (roll <= 47) {
      this.forceRetreat(shark);
      scene.notify("Zipkin isabet etti. Kopek baligi uzaklasti.", scene.playerRoot.x, scene.playerRoot.y - 70, "#bff4c7", "good");
    } else if (roll <= 76) {
      shark.meta.biteCooldown = Math.max(shark.meta.biteCooldown, 50);
      scene.notify("Zipkin isabet etmedi. Tehdit hala yakin.", scene.playerRoot.x, scene.playerRoot.y - 70, "#fff0aa", "warn");
    } else {
      scene.hasHarpoon = false;
      shark.meta.biteCooldown = Math.max(shark.meta.biteCooldown, 70);
      scene.notify("Zipkin kirildi! Yeniden uretmen gerekiyor.", scene.playerRoot.x, scene.playerRoot.y - 70, "#ff9c87", "danger");
    }
    scene.updateQuickAttackButton();
    return true;
  }

  forceRetreat(shark) {
    const scene = this.scene;
    const angle = Phaser.Math.Angle.Between(scene.playerRoot.x, scene.playerRoot.y, shark.x, shark.y) + Phaser.Math.FloatBetween(-0.35, 0.35);
    const distance = Phaser.Math.Between(820, 1050);
    shark.x = Phaser.Math.Clamp(scene.playerRoot.x + Math.cos(angle) * distance, -this.worldSize / 2, this.worldSize / 2);
    shark.y = Phaser.Math.Clamp(scene.playerRoot.y + Math.sin(angle) * distance, -this.worldSize / 2, this.worldSize / 2);
    shark.rotation = angle + Math.PI / 2;
    shark.meta.biteCooldown = 240;
    shark.meta.retreatTime = 300;
    shark.meta.warned = false;
  }

  getShieldTile(threat) {
    const scene = this.scene;
    const threatDir = new Phaser.Math.Vector2(threat.x - scene.playerRoot.x, threat.y - scene.playerRoot.y);
    if (threatDir.length() < 1) return null;
    threatDir.normalize();

    let bestTile = null;
    let bestDot = 0.82;
    scene.raftTiles.forEach((tile) => {
      if (scene.isCenterTile(tile)) return;
      if (Math.abs(tile.x) > 1 || Math.abs(tile.y) > 1) return;
      const point = scene.getRaftTileWorldPosition(tile);
      const tileDir = new Phaser.Math.Vector2(point.x - scene.playerRoot.x, point.y - scene.playerRoot.y);
      if (tileDir.length() < 1) return;
      tileDir.normalize();
      const dot = tileDir.dot(threatDir);
      if (dot > bestDot) {
        bestDot = dot;
        bestTile = tile;
      }
    });
    return bestTile;
  }

  damageRaftFromShark(shark) {
    const scene = this.scene;
    const shieldTile = this.getShieldTile(shark);
    if (shieldTile) {
      shieldTile.hp = (shieldTile.hp ?? scene.getMaxTileHp(shieldTile)) - 1;
      scene.raftIntegrity = Math.max(0, scene.raftIntegrity - Math.round(5 * scene.getRiskMultiplier()));
      if (shieldTile.hp <= 0) {
        scene.breakRaftTile(shieldTile);
        return { protectedPlayer: true, message: "Kopek baligi sal parcasini kirdi!" };
      }
      scene.drawRaft();
      return { protectedPlayer: true, message: "Kopek baligi sal parcasina hasar verdi." };
    }
    scene.raftIntegrity = Math.max(0, scene.raftIntegrity - Math.round(7 * scene.getRiskMultiplier()));
    return { protectedPlayer: false, message: "Kopek baligi sana ulasti! En yakin kara parcasina kac." };
  }

  damageRaftNet() {
    const scene = this.scene;
    const nets = scene.raftTiles.filter((tile) => tile.netHp > 0);
    if (nets.length <= 0 || Phaser.Math.Between(1, 100) > 65) return false;
    const tile = nets[Phaser.Math.Between(0, nets.length - 1)];
    tile.netHp -= 1;
    if (tile.netHp <= 0) {
      delete tile.netHp;
      scene.logEvent("Bir toplama agi koptu.", "warn");
    } else {
      scene.logEvent("Bir toplama agi hasar aldi.", "warn");
    }
    scene.drawRaft();
    return true;
  }
}
