import Phaser from "phaser";
import { SEA_STATES, WEATHER_STATES } from "../data/environment.js";
import { ITEM_LABELS } from "../data/items.js";
import { DIVE_RESOURCE_WEIGHTS } from "../data/loot.js";
import { DIVE_SITES } from "../systems/diving-system.js";

export class UnderwaterScene extends Phaser.Scene {
  constructor() {
    super("underwater");
    this.bounds = { width: 1900, height: 720 };
  }

  init(data) {
    this.parentScene = data.parentScene;
    this.siteKey = data.siteKey ?? "shallow";
    this.fromIsland = Boolean(data.fromIsland);
    this.maxOxygen = data.oxygen ?? 100;
    this.oxygen = this.maxOxygen;
    this.pressure = Phaser.Math.Clamp(Number(data.pressure ?? 1), 1, 6);
      this.weatherState = data.weatherState ?? "sunny";
      this.seaState = data.seaState ?? "calm";
      this.isNight = Boolean(data.isNight);
    this.startedAt = 0;
    this.gained = {};
    this.finished = false;
    this.hazardCooldown = 0;
    this.lastMineHitAt = -9999;
    this.touchJoystick = {
      active: false,
      pointerId: null,
      origin: new Phaser.Math.Vector2(),
      vector: new Phaser.Math.Vector2(),
      base: null,
      knob: null
    };
    this.mobileControlsEnabled = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  create() {
    this.site = DIVE_SITES[this.siteKey] ?? DIVE_SITES.shallow;
    this.startedAt = this.time.now;
    this.cameras.main.setBounds(0, 0, this.bounds.width, this.bounds.height);
    this.add.rectangle(this.bounds.width / 2, this.bounds.height / 2, this.bounds.width, this.bounds.height, 0x06374f).setDepth(-20);
    const murk = this.getDiveMurkFactor();
    this.add.rectangle(this.bounds.width / 2, 34, this.bounds.width, 68, 0x3aa6b7, 0.3).setDepth(-18);
    if (murk > 0) {
      this.add.rectangle(this.bounds.width / 2, this.bounds.height / 2, this.bounds.width, this.bounds.height, 0x03161f, murk).setDepth(18).setScrollFactor(0);
    }
    if (this.isNight) {
      this.nightShade = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x01090f, 0.42)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(19);
    }

    for (let i = 0; i < 42; i += 1) {
      const wave = this.add.ellipse(Phaser.Math.Between(30, this.bounds.width - 30), Phaser.Math.Between(50, this.bounds.height - 40), Phaser.Math.Between(24, 78), 7, 0x9fdddf, 0.12);
      wave.setRotation(Phaser.Math.FloatBetween(-0.25, 0.25));
    }

    this.createTerrain();

    this.exitZone = this.add.rectangle(92, 72, 132, 52, 0x83e6d9, 0.18).setStrokeStyle(2, 0xbef8ef, 0.78);
    this.add.text(38, 54, "Yuzey", { fontSize: "14px", color: "#eafff9", fontStyle: "700" });
    this.player = this.add.circle(110, 128, 12, 0xf0b36b).setStrokeStyle(2, 0x382017);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.resources = this.add.group();
    this.mines = this.add.group();
    this.hazards = this.add.group();
    this.spawnSeaweed();
    this.spawnDiveResources();
    this.spawnUnderwaterMines();

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up2: Phaser.Input.Keyboard.KeyCodes.UP,
      down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      exit: Phaser.Input.Keyboard.KeyCodes.E,
      action: Phaser.Input.Keyboard.KeyCodes.F
    });

    this.oxygenPanel = this.add.container(0, 0).setScrollFactor(0).setDepth(22);
    this.oxygenBack = this.add.rectangle(0, 0, 320, 18, 0x041219, 0.88).setStrokeStyle(1, 0xb1ebe0, 0.7);
    this.oxygenFill = this.add.rectangle(-158, 0, 316, 14, 0x91e6bf, 0.96).setOrigin(0, 0.5);
    this.oxygenText = this.add.text(0, -24, "", { fontSize: "14px", color: "#eafff9", fontStyle: "700" }).setOrigin(0.5);
    this.oxygenPanel.add([this.oxygenBack, this.oxygenFill, this.oxygenText]);
    this.infoText = this.add.text(0, 0, "", { fontSize: "12px", color: "#c6edf0" }).setScrollFactor(0).setDepth(20).setOrigin(0.5);
    this.exitButton = this.add.text(0, 0, "Yuzeye Cik", {
      fontSize: "18px",
      color: "#f3fbf7",
      backgroundColor: "#10414e",
      padding: { x: 26, y: 18 }
    }).setScrollFactor(0).setDepth(21).setInteractive({ useHandCursor: true });
    this.exitButton.on("pointerdown", () => this.finishDive(false));
    this.mineButton = this.add.text(0, 0, "K", {
      fontSize: "24px",
      color: "#f3fbf7",
      backgroundColor: "#10414e",
      padding: { x: 22, y: 16 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(22).setInteractive({ useHandCursor: true }).setVisible(false);
    this.mineButton.on("pointerdown", () => this.attackNearbyMine());
    if (this.mobileControlsEnabled) this.createTouchJoystick();
    this.layoutUi();
    this.scale.on("resize", () => this.layoutUi());
  }

  createTouchJoystick() {
    const joystick = this.touchJoystick;
    joystick.base = this.add.circle(94, 0, 54, 0x07151f, 0.48)
      .setStrokeStyle(3, 0xbfe9ef, 0.62)
      .setScrollFactor(0)
      .setDepth(25);
    joystick.knob = this.add.circle(94, 0, 22, 0x9fdddf, 0.9)
      .setStrokeStyle(2, 0xeafff9, 0.72)
      .setScrollFactor(0)
      .setDepth(26);

    this.input.on("pointerdown", (pointer) => {
      if (this.finished || pointer.x > this.scale.width * 0.45 || pointer.y < this.scale.height * 0.42) return;
      joystick.active = true;
      joystick.pointerId = pointer.id;
      joystick.origin.set(pointer.x, pointer.y);
      joystick.base.setPosition(pointer.x, pointer.y);
      joystick.knob.setPosition(pointer.x, pointer.y);
      pointer.event?.preventDefault();
    });
    this.input.on("pointermove", (pointer) => {
      if (!joystick.active || pointer.id !== joystick.pointerId) return;
      const dx = pointer.x - joystick.origin.x;
      const dy = pointer.y - joystick.origin.y;
      const distance = Math.min(52, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      joystick.vector.set(Math.cos(angle) * (distance / 52), Math.sin(angle) * (distance / 52));
      joystick.knob.setPosition(
        joystick.origin.x + Math.cos(angle) * distance,
        joystick.origin.y + Math.sin(angle) * distance
      );
      pointer.event?.preventDefault();
    });
    const release = (pointer) => {
      if (!joystick.active || (pointer && pointer.id !== joystick.pointerId)) return;
      joystick.active = false;
      joystick.pointerId = null;
      joystick.vector.set(0, 0);
      this.positionTouchJoystick();
    };
    this.input.on("pointerup", release);
    this.input.on("pointerupoutside", release);
  }

  positionTouchJoystick() {
    if (!this.touchJoystick?.base || this.touchJoystick.active) return;
    const y = this.scale.height - 82;
    this.touchJoystick.base.setPosition(94, y);
    this.touchJoystick.knob.setPosition(94, y);
  }

  layoutUi() {
    if (!this.exitButton) return;
    this.nightShade?.setSize(this.scale.width, this.scale.height);
    this.oxygenPanel.setPosition(this.scale.width / 2, 42);
    this.infoText.setPosition(this.scale.width / 2, 70);
    this.exitButton.setOrigin(0.5).setPosition(this.scale.width - 104, this.scale.height - 72);
    this.mineButton?.setPosition(this.scale.width - 210, this.scale.height - 72);
    this.positionTouchJoystick();
  }

  createTerrain() {
    const base = 610;
    const profile = [
      [0, base], [0.14, base], [0.21, base - 54], [0.36, base - 54],
      [0.44, base + 22], [0.58, base + 22], [0.66, base - 82],
      [0.8, base - 82], [0.88, base - 18], [1, base - 18]
    ];
    this.floorPoints = profile.map(([x, y]) => ({ x: Math.round(x * this.bounds.width), y }));
    this.flatFloorRanges = [
      [0.02, 0.13],
      [0.23, 0.35],
      [0.46, 0.57],
      [0.68, 0.79],
      [0.9, 0.98]
    ].map(([min, max]) => ({
      min: Math.round(min * this.bounds.width),
      max: Math.round(max * this.bounds.width)
    }));
    this.seaweedSpawnXs = [];

    const terrain = this.add.graphics().setDepth(-12);
    terrain.fillStyle(0x5c4939, 1);
    terrain.lineStyle(3, 0x9d8464, 0.82);
    terrain.beginPath();
    terrain.moveTo(0, this.bounds.height);
    this.floorPoints.forEach((point) => terrain.lineTo(point.x, point.y));
    terrain.lineTo(this.bounds.width, this.bounds.height);
    terrain.closePath();
    terrain.fillPath();
    terrain.strokePath();

  }

  spawnSeaweed() {
    const count = this.siteKey === "reef" ? 11 : 7;
    for (let i = 0; i < count; i += 1) {
      const x = this.getFlatFloorSpawnX(66);
      if (x === null) continue;
      const key = Phaser.Math.Between(0, 1) ? "underwater-seaweed-short" : "underwater-seaweed-long";
      const plant = this.add.image(x, this.getFloorY(x) + 8, key).setOrigin(0.5, 1).setDepth(-5);
      this.fitSpriteToMaxSize(plant, key.endsWith("long") ? 78 : 54);
      plant.setAlpha(0.82);
    }
  }

  getFlatFloorSpawnX(clearance = 64) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const range = this.flatFloorRanges[Phaser.Math.Between(0, this.flatFloorRanges.length - 1)];
      const x = Phaser.Math.Between(range.min + 18, range.max - 18);
      if (this.seaweedSpawnXs.some((usedX) => Math.abs(usedX - x) < clearance)) continue;
      this.seaweedSpawnXs.push(x);
      return x;
    }
    return null;
  }

  getDiveMurkFactor() {
    const sea = SEA_STATES[this.seaState] ?? SEA_STATES.calm;
    const weather = WEATHER_STATES[this.weatherState] ?? WEATHER_STATES.sunny;
    const weatherMurk = weather.stormRisk > 0 ? 0.24 : this.weatherState === "rain" ? 0.12 : this.weatherState === "cloudy" ? 0.06 : 0;
    const seaMurk = sea.roughness * 0.08;
    const pressureMurk = Math.max(0, this.pressure - 3) * 0.035;
      const nightMurk = this.isNight ? 0.2 : 0;
      return Phaser.Math.Clamp(weatherMurk + seaMurk + pressureMurk + nightMurk, 0, 0.58);
  }

  spawnDiveResources() {
    const resourceKeys = Object.keys(this.site.resources).filter((key) => !["scrap", "ore"].includes(key));
    const weatherCut = this.getDiveMurkFactor() > 0.22 ? 3 : this.getDiveMurkFactor() > 0 ? 1 : 0;
    const pressureCut = Math.max(0, this.pressure - 3);
    const total = Math.max(4, (this.siteKey === "shallow" ? 9 : this.siteKey === "reef" ? 12 : 10) - weatherCut - pressureCut);
    for (let i = 0; i < total; i += 1) {
      const key = this.rollVisibleDiveResource(resourceKeys);
      const point = this.getResourceSpawnPoint(i);
      const node = this.add.container(point.x, point.y);
      this.addDiveResourceVisual(node, key);
      const vein = this.add.rectangle(0, 8, 34, 4, 0x2b1f19, 0.35);
      node.addAt(vein, 0);
      node.meta = { key, collected: false, kind: "resource" };
      this.resources.add(node);
    }

  }

  spawnUnderwaterMines() {
    const ore = this.site.resources.ore;
    if (!ore) return;
    const count = Phaser.Math.Between(1, this.siteKey === "deep" ? 3 : 2);
    for (let i = 0; i < count; i += 1) {
      const x = this.getFlatFloorSpawnX(96);
      if (x === null) continue;
      const mine = this.add.container(x, this.getFloorY(x));
      const sprite = this.add.image(0, 0, "island-mine").setOrigin(0.5, 1);
      this.fitSpriteToMaxSize(sprite, 62);
      const label = this.add.text(0, -sprite.displayHeight - 8, "Maden damari", { fontSize: "10px", color: "#ffd18c", stroke: "#06202a", strokeThickness: 3 }).setOrigin(0.5);
      mine.add([sprite, label]);
      mine.meta = { collected: false, hp: 3, maxHp: 3 };
      this.mines.add(mine);
    }
  }

  rollVisibleDiveResource(resourceKeys) {
    const weights = DIVE_RESOURCE_WEIGHTS[this.siteKey] ?? {};
    const pool = resourceKeys.map((key) => ({ key, weight: weights[key] ?? 20 })).filter((entry) => entry.weight > 0);
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Phaser.Math.Between(1, total);
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) return entry.key;
    }
    return pool[0]?.key ?? resourceKeys[0];
  }

  addDiveResourceVisual(node, key) {
    const assetKey = this.textures.exists(`item-${key}`) ? `item-${key}` : null;
    if (assetKey) {
      const body = this.add.image(0, 0, assetKey);
      this.fitSpriteToMaxSize(body, 36);
      const labelText = ITEM_LABELS[key] ?? key;
      const label = this.add.text(0, -28, labelText, { fontSize: "10px", color: "#d8f1ff", stroke: "#06202a", strokeThickness: 3 }).setOrigin(0.5);
      node.add([body, label]);
      return;
    }

    if (key === "coral") {
      const base = this.add.circle(0, 7, 8, 0xff7fa6, 0.9).setStrokeStyle(2, 0x5c1430, 0.78);
      const branchA = this.add.rectangle(-7, -3, 6, 25, 0xff8fb3, 0.96).setRotation(-0.42).setStrokeStyle(1, 0x5c1430, 0.62);
      const branchB = this.add.rectangle(4, -6, 6, 31, 0xffb06d, 0.96).setRotation(0.18).setStrokeStyle(1, 0x5c1430, 0.62);
      const branchC = this.add.rectangle(13, 0, 5, 20, 0xff6f91, 0.94).setRotation(0.58).setStrokeStyle(1, 0x5c1430, 0.62);
      const tipA = this.add.circle(-12, -14, 4, 0xffd0df, 0.95);
      const tipB = this.add.circle(6, -22, 4, 0xffd18c, 0.95);
      const label = this.add.text(0, -34, "Mercan", { fontSize: "11px", color: "#ffd0df", stroke: "#06202a", strokeThickness: 3 }).setOrigin(0.5);
      node.add([base, branchA, branchB, branchC, tipA, tipB, label]);
      return;
    }

    const rareColors = { pearl: 0xf2e8d5, ancientRelic: 0xd49a52, deepCrystal: 0x62d7e8, sand: 0xd8c478 };
    const color = rareColors[key] ?? (key === "scrap" ? 0x9ba7ad : key === "ore" ? 0x6f7784 : 0x8a8174);
    const body = key === "stone"
      ? this.add.polygon(0, 0, [-14, 5, -5, -11, 13, -8, 16, 7, 1, 13], color, 0.94).setStrokeStyle(2, 0x092633, 0.8)
      : key === "ore"
        ? this.add.polygon(0, 0, [-13, 7, -8, -10, 9, -13, 16, 3, 7, 15], color, 0.94).setStrokeStyle(2, 0x092633, 0.8)
      : this.add.rectangle(0, 0, 30, 16, color, 0.94).setStrokeStyle(2, 0x092633, 0.8);
    const shine = this.add.circle(-6, -3, 3, 0xffffff, 0.28);
    const labelText = ITEM_LABELS[key] ?? key;
    const label = this.add.text(0, -24, labelText, { fontSize: "10px", color: "#d8f1ff", stroke: "#06202a", strokeThickness: 3 }).setOrigin(0.5);
    node.add([body, shine, label]);
  }

  fitSpriteToMaxSize(sprite, maxSize) {
    const width = Math.max(1, sprite.width ?? maxSize);
    const height = Math.max(1, sprite.height ?? maxSize);
    const scale = maxSize / Math.max(width, height);
    sprite.setDisplaySize(Math.round(width * scale), Math.round(height * scale));
  }

  spawnDiveHazards() {
    // Su alti tehlikeleri, yeni duzen oturduktan sonra tek tek geri eklenecek.
  }

  getResourceSpawnPoint(index) {
    const x = Phaser.Math.Between(230, this.bounds.width - 110);
    return { x, y: this.getFloorY(x) - 18 };
  }

  getFloorY(x) {
    if (!this.floorPoints?.length) return this.bounds.height - 60;
    for (let i = 0; i < this.floorPoints.length - 1; i += 1) {
      const a = this.floorPoints[i];
      const b = this.floorPoints[i + 1];
      if (x < a.x || x > b.x) continue;
      const t = (x - a.x) / (b.x - a.x);
      return Phaser.Math.Linear(a.y, b.y, t);
    }
    return this.floorPoints[this.floorPoints.length - 1].y;
  }

  clampPlayerToTerrain() {
    const radius = 13;
    const floorY = this.getFloorY(this.player.x) - radius;
    if (this.player.y > floorY) this.player.y = floorY;
  }

  update(_time, delta) {
    if (this.finished) return;
    const dt = delta / 1000;
    this.hazardCooldown = Math.max(0, this.hazardCooldown - delta);
    const input = this.getInputVector();
    const speedPenalty = (SEA_STATES[this.seaState]?.roughness ?? 0) * 10 + (this.weatherState === "storm" ? 14 : 0) + Math.max(0, this.pressure - 3) * 4;
    const speed = Math.max(88, (this.hasTank() ? 150 : 132) - speedPenalty);
    this.player.x = Phaser.Math.Clamp(this.player.x + input.x * speed * dt, 18, this.bounds.width - 18);
    this.player.y = Phaser.Math.Clamp(this.player.y + input.y * speed * dt, 38, this.bounds.height - 24);
    this.clampPlayerToTerrain();

    const depthFactor = Phaser.Math.Clamp((this.player.y - 80) / (this.getFloorY(this.player.x) - 100), 0, 1);
    this.oxygen -= dt * (1.4 + input.length() * 3.2 + depthFactor * 1.6);
    this.collectNearbyResources();
    this.updateMineAction();
    if (Phaser.Input.Keyboard.JustDown(this.keys.action)) this.attackNearbyMine();
    this.updateHudText();

    if (this.oxygen <= 0) {
      this.finishDive(true);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.exit) && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitZone.x, this.exitZone.y) < 90) {
      this.finishDive(false);
    }
  }

  getInputVector() {
    const v = new Phaser.Math.Vector2();
    if (this.keys.left.isDown || this.keys.left2.isDown) v.x -= 1;
    if (this.keys.right.isDown || this.keys.right2.isDown) v.x += 1;
    if (this.keys.up.isDown || this.keys.up2.isDown) v.y -= 1;
    if (this.keys.down.isDown || this.keys.down2.isDown) v.y += 1;
    if (this.mobileControlsEnabled && this.touchJoystick?.vector) v.add(this.touchJoystick.vector);
    if (v.length() > 1) v.normalize();
    return v;
  }

  collectNearbyResources() {
    this.resources.getChildren().forEach((node) => {
      if (node.meta.collected) return;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y) > 28) return;
      node.meta.collected = true;
      const target = this.site.resources[node.meta.key];
      this.oxygen -= Math.ceil((target?.oxygen ?? 20) * 0.35);
      const amount = target?.bonusChance && Phaser.Math.Between(1, 100) <= target.bonusChance ? 2 : 1;
      if (!this.parentScene.addInventoryItem(node.meta.key, amount)) {
        node.meta.collected = false;
        this.showDiveText("Envanter dolu", node.x, node.y, "#ffcc93");
        return;
      }
      this.gained[node.meta.key] = (this.gained[node.meta.key] ?? 0) + amount;
      if (this.siteKey === "shallow") this.parentScene.recordQuestAction("shallowResourceCollected");
      this.showDiveText(`${ITEM_LABELS[node.meta.key]} +${amount}`, node.x, node.y, "#c4f6ff");
      node.destroy();
    });
  }

  getNearbyMine(range = 52) {
    return this.mines.getChildren().find((mine) => !mine.meta.collected
      && Phaser.Math.Distance.Between(this.player.x, this.player.y, mine.x, mine.y) <= range);
  }

  updateMineAction() {
    const mine = this.getNearbyMine();
    this.mineButton?.setVisible(Boolean(mine));
  }

  attackNearbyMine() {
    const mine = this.getNearbyMine();
    if (!mine) return;
    if (!this.parentScene.hasPickaxe) {
      this.showDiveText("Basit Kazma gerekli", mine.x, mine.y - 50, "#ffcc93");
      return;
    }
    if (this.time.now - this.lastMineHitAt < 850) return;
    this.lastMineHitAt = this.time.now;
    this.oxygen -= 7;
    mine.meta.hp -= 1;
    this.showDiveText(`Maden ${mine.meta.hp}/${mine.meta.maxHp}`, mine.x, mine.y - 50, "#ffd18c");
    this.tweens.add({ targets: mine, angle: 3, duration: 80, yoyo: true });
    if (mine.meta.hp > 0) return;
    if (!this.parentScene.addInventoryItem("ore", 1)) {
      mine.meta.hp = 1;
      this.showDiveText("Envanter dolu", mine.x, mine.y - 50, "#ffcc93");
      return;
    }
    mine.meta.collected = true;
    this.gained.ore = (this.gained.ore ?? 0) + 1;
    this.parentScene.recordQuestAction("oreMined");
    if (Phaser.Math.Between(1, 100) <= 65 && this.parentScene.addInventoryItem("stone", 1)) {
      this.gained.stone = (this.gained.stone ?? 0) + 1;
    }
    this.showDiveText("Maden kazildi", mine.x, mine.y - 50, "#ffd18c");
    mine.destroy();
  }

  updateHudText() {
    const percent = Phaser.Math.Clamp((this.oxygen / this.maxOxygen) * 100, 0, 100);
    const pressureText = this.pressure >= 3 ? `  Baskı ${this.pressure}` : "";
    this.oxygenText.setText(`${this.site.label}  Oksijen %${Math.ceil(percent)}  Can ${Math.ceil(this.parentScene.stats.hp)}${pressureText}`);
    this.oxygenFill.width = 316 * (percent / 100);
    this.oxygenFill.setFillStyle(percent < 20 ? 0xff8b76 : percent < 45 ? 0xffd17c : 0x91e6bf, 0.96);
    this.infoText.setText("Kaynaklara yaklas: topla");
  }

  showDiveText(message, x, y, color) {
    const text = this.add.text(x, y, message, { fontSize: "13px", color, stroke: "#06202a", strokeThickness: 4 }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: text, y: y - 28, alpha: 0, duration: 850, onComplete: () => text.destroy() });
  }

  finishDive(oxygenFailed) {
    if (this.finished) return;
    this.finished = true;
    const gainedParts = Object.entries(this.gained).map(([key, amount]) => `${ITEM_LABELS[key]} +${amount}`);
    const parent = this.parentScene;
    const result = {
      siteKey: this.siteKey,
      fromIsland: this.fromIsland,
      oxygenFailed,
      pressure: this.pressure,
      duration: (this.time.now - this.startedAt) / 1000,
      gained: { ...this.gained },
      gainedAny: gainedParts.length > 0,
      summary: gainedParts.length > 0 ? `Dalis bitti: ${gainedParts.join(", ")}` : "Dalis bitti, kayda deger bir sey bulunamadi."
    };
    if (this.siteKey === "reef") parent.recordQuestAction("reefDived");
    if (this.siteKey === "deep") parent.recordQuestAction("deepDived");
    this.scene.stop();
    parent.finishUnderwaterDive(result);
  }

  hasTank() {
    return this.parentScene?.hasDiveTank;
  }
}
