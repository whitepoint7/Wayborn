import Phaser from "phaser";
import { ITEM_LABELS } from "../data/items.js";

export class IslandScene extends Phaser.Scene {
  constructor() {
    super("island");
    this.bounds = { width: 1800, height: 620 };
  }

  init(data) {
    this.parentScene = data.parentScene;
    this.island = data.island;
    this.gained = {};
    this.rested = false;
    this.finished = false;
    this.moveHold = 0;
    this.hazardCooldown = 0;
    this.slowUntil = 0;
    this.stamina = 100;
    this.entryX = 82;
    this.jumpVelocity = 0;
    this.jumpOffset = 0;
    this.isGrounded = true;
    this.lastUiActionAt = 0;
    this.lastPlayerAttackAt = -9999;
    this.visualGroundInset = 10;
    this.spawnReservations = [];
  }

  create() {
    this.bounds.width = Math.max(1800, this.scale.width);
    this.bounds.height = Math.max(620, this.scale.height);
    this.terrainBaseY = this.bounds.height - 230;
    this.cameras.main.setBounds(0, 0, this.bounds.width, this.bounds.height);
    this.cameras.main.setBackgroundColor(0x4f9a6d);
    this.add.rectangle(this.bounds.width / 2, this.bounds.height / 2, this.bounds.width, this.bounds.height, 0x4f9a6d).setDepth(-20);
    this.add.rectangle(this.bounds.width / 2, this.terrainBaseY + 48, this.bounds.width, 190, 0xd8c478).setDepth(-18);
    this.trees = this.add.group();
    this.createIslandTerrain();
    this.resources = this.add.group();
    this.mines = this.add.group();
    this.hazards = this.add.group();
    this.spawnIslandHazards();
    this.spawnIslandMines();
    this.spawnIslandResources();

    this.add.text(this.entryX, this.getGroundY(this.entryX) - 48, "Giris / Cikis", {
      fontSize: "12px", color: "#d6f7ff", stroke: "#06202a", strokeThickness: 4
    }).setOrigin(0.5);
    this.player = this.add.circle(90, this.getGroundY(90) - 12, 12, 0xf0b36b).setStrokeStyle(2, 0x382017);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.nightShade = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x04131b, 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(18)
      .setAlpha(this.getNightShadeAlpha());
    this.torchGlow = this.add.circle(this.player.x, this.player.y, 118, 0xffb45f, 0.16)
      .setDepth(19)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(Boolean(this.parentScene?.hasTorch && this.parentScene?.isNight));
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      rest: Phaser.Input.Keyboard.KeyCodes.R,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      attack: Phaser.Input.Keyboard.KeyCodes.F,
      exit: Phaser.Input.Keyboard.KeyCodes.E
    });
    const riskLabel = this.island?.meta?.riskLabel ?? "Guvenli Sular";
    this.infoText = this.add.text(0, 0, `${riskLabel}: kaynaklara yaklas`, { fontSize: "13px", color: "#f3fbf7", stroke: "#06202a", strokeThickness: 4 }).setScrollFactor(0).setDepth(20).setOrigin(0.5);
    this.staminaPanel = this.add.container(0, 0).setScrollFactor(0).setDepth(22);
    this.staminaBack = this.add.rectangle(0, 0, 220, 16, 0x041219, 0.88).setStrokeStyle(1, 0xb1ebe0, 0.7);
    this.staminaFill = this.add.rectangle(-108, 0, 216, 12, 0xffd17c, 0.96).setOrigin(0, 0.5);
    this.staminaText = this.add.text(0, -22, "Dayaniklilik", { fontSize: "12px", color: "#fff0aa", stroke: "#06202a", strokeThickness: 3 }).setOrigin(0.5);
    this.staminaPanel.add([this.staminaBack, this.staminaFill, this.staminaText]);
    this.healthPanel = this.add.container(0, 0).setScrollFactor(0).setDepth(22);
    this.healthBack = this.add.rectangle(0, 0, 220, 16, 0x041219, 0.88).setStrokeStyle(1, 0xffb0a2, 0.72);
    this.healthFill = this.add.rectangle(-108, 0, 216, 12, 0xff8b76, 0.96).setOrigin(0, 0.5);
    this.healthText = this.add.text(0, -22, "Can", { fontSize: "12px", color: "#ffddd5", stroke: "#06202a", strokeThickness: 3 }).setOrigin(0.5);
    this.healthPanel.add([this.healthBack, this.healthFill, this.healthText]);
    this.exitButton = this.add.text(0, 0, "Adadan Ayril", {
      fontSize: "18px",
      color: "#f3fbf7",
      backgroundColor: "#10414e",
      padding: { x: 26, y: 18 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(22).setInteractive({ useHandCursor: true });
    this.exitButton.on("pointerdown", () => this.tryExitIsland());
    this.leftButton = this.createMoveButton("<", -1);
    this.rightButton = this.createMoveButton(">", 1);
    this.jumpButton = this.createActionButton("^", () => this.tryJump());
    this.contextActionButton = this.createActionButton("!", () => this.useContextAction());
    this.craftButton = this.createActionButton("U", () => this.parentScene.openIslandCraft(this));
    this.layoutUi();
    this.scale.on("resize", () => this.layoutUi());
    this.input.on("pointerdown", (pointer) => this.handleIslandPointer(pointer));
  }

  createMoveButton(label, direction) {
    const button = this.add.container(0, 0).setScrollFactor(0).setDepth(24);
    const bg = this.add.circle(0, 0, 32, 0x10414e, 0.88).setStrokeStyle(2, 0xb1ebe0, 0.78);
    const icon = this.add.text(0, -3, label, {
      fontSize: "34px",
      color: "#f3fbf7",
      fontStyle: "700"
    }).setOrigin(0.5);
    button.add([bg, icon]);
    button.setSize(72, 72);
    button.setInteractive(new Phaser.Geom.Circle(0, 0, 36), Phaser.Geom.Circle.Contains);
    button.on("pointerdown", (pointer) => {
      pointer.event?.preventDefault();
      pointer.event?.stopPropagation();
      this.moveHold = direction;
    });
    const release = (pointer) => {
      pointer?.event?.preventDefault();
      pointer?.event?.stopPropagation();
      if (this.moveHold === direction) this.moveHold = 0;
    };
    button.on("pointerup", release);
    button.on("pointerout", release);
    button.on("pointerupoutside", release);
    return button;
  }

  createActionButton(label, callback) {
    const button = this.add.container(0, 0).setScrollFactor(0).setDepth(24);
    const bg = this.add.circle(0, 0, 34, 0x10414e, 0.9).setStrokeStyle(2, 0xb1ebe0, 0.78);
    const icon = this.add.text(0, -2, label, {
      fontSize: "28px",
      color: "#f3fbf7",
      fontStyle: "700"
    }).setOrigin(0.5);
    button.add([bg, icon]);
    button.icon = icon;
    button.bg = bg;
    button.setSize(76, 76);
    button.setInteractive(new Phaser.Geom.Circle(0, 0, 38), Phaser.Geom.Circle.Contains);
    button.on("pointerdown", (pointer) => {
      pointer.event?.preventDefault();
      pointer.event?.stopPropagation();
      this.runIslandButton(callback);
    });
    return button;
  }

  runIslandButton(callback) {
    if (this.time.now - this.lastUiActionAt < 140) return;
    this.lastUiActionAt = this.time.now;
    callback();
  }

  handleIslandPointer(pointer) {
    if (this.finished) return;
    if (this.isScreenPointNear(this.jumpButton, pointer, 56)) {
      pointer.event?.preventDefault();
      pointer.event?.stopPropagation();
      this.runIslandButton(() => this.tryJump());
      return;
    }
    if (this.isScreenPointNear(this.contextActionButton, pointer, 56)) {
      pointer.event?.preventDefault();
      pointer.event?.stopPropagation();
      this.runIslandButton(() => this.useContextAction());
      return;
    }
    if (this.isScreenPointNear(this.craftButton, pointer, 56)) {
      pointer.event?.preventDefault();
      pointer.event?.stopPropagation();
      this.runIslandButton(() => this.parentScene.openIslandCraft(this));
      return;
    }
  }

  isScreenPointNear(button, pointer, radius) {
    if (!button?.visible) return false;
    return Phaser.Math.Distance.Between(pointer.x, pointer.y, button.x, button.y) <= radius;
  }

  createIslandTerrain() {
    const base = this.terrainBaseY;
    const profile = [
      { x: 0, y: base + 18 },
      { x: 0.18, y: base + 18 },
      { x: 0.25, y: base + 70 },
      { x: 0.39, y: base + 70 },
      { x: 0.46, y: base - 12 },
      { x: 0.62, y: base - 12 },
      { x: 0.69, y: base + 48 },
      { x: 0.83, y: base + 48 },
      { x: 0.9, y: base + 8 },
      { x: 1, y: base + 8 }
    ];
    this.groundPoints = profile.map((point) => ({
      x: Math.round(point.x * this.bounds.width),
      y: point.y
    }));
    this.flatSpawnRanges = [
      { min: 0.02, max: 0.17, zone: "shore" },
      { min: 0.27, max: 0.38, zone: "lowland" },
      { min: 0.48, max: 0.61, zone: "forest" },
      { min: 0.71, max: 0.82, zone: "forest" },
      { min: 0.92, max: 0.98, zone: "rocky" }
    ].map((range) => ({
      min: Math.round(range.min * this.bounds.width),
      max: Math.round(range.max * this.bounds.width),
      zone: range.zone
    }));
    this.reserveSpawnX(this.entryX, 88, "fixed");

    const ground = this.add.graphics().setDepth(-10);
    ground.fillStyle(0x6aa873, 1);
    ground.lineStyle(3, 0x2f6d48, 0.72);
    ground.beginPath();
    ground.moveTo(0, this.bounds.height);
    this.groundPoints.forEach((point) => ground.lineTo(point.x, point.y));
    ground.lineTo(this.bounds.width, this.bounds.height);
    ground.closePath();
    ground.fillPath();
    ground.strokePath();

    const zones = [
      { x: 310, y: 406, label: "Sahil", color: 0xd8c478 },
      { x: 830, y: 386, label: "Orman", color: 0x2f6d48 },
      { x: 1370, y: 408, label: "Kayalik", color: 0x8a8174 }
    ];
    zones.forEach((zone) => {
      this.add.text(zone.x, zone.y, zone.label, {
        fontSize: "18px",
        color: "#f3fbf7",
        stroke: "#06202a",
        strokeThickness: 5
      }).setOrigin(0.5).setAlpha(0.42).setDepth(-4);
    });

    const treeCount = Phaser.Math.Between(5, 7);
    for (let i = 0; i < treeCount; i += 1) this.spawnIslandTree(i);
  }

  spawnIslandTree(index) {
    const x = this.getSafeFlatSpawnX(["forest"], 138, "tree");
    if (x === null) return;
    const groundY = this.getVisualGroundY(x);
    const variants = ["island-palm-left", "island-palm-right", "island-banana-tree"];
    const key = variants[Phaser.Math.Between(0, variants.length - 1)];
    const tree = this.add.container(x, groundY).setDepth(-2);
    const sprite = this.add.image(0, 0, key).setOrigin(0.5, 1);
    this.fitSpriteToMaxSize(sprite, key === "island-banana-tree" ? 132 : 150);
    tree.add(sprite);
    tree.sprite = sprite;
    const treeHp = Phaser.Math.Between(3, 4);
    tree.meta = {
      type: "tree",
      variant: key,
      hp: treeHp,
      maxHp: treeHp,
      index,
      dead: false
    };
    const hpBack = this.add.rectangle(0, -sprite.displayHeight - 9, 40, 5, 0x08151c, 0.88).setStrokeStyle(1, 0xffe0a3, 0.55).setVisible(false);
    const hpFill = this.add.rectangle(-19, -sprite.displayHeight - 9, 38, 3, 0x91e6bf, 0.96).setOrigin(0, 0.5).setVisible(false);
    tree.add([hpBack, hpFill]);
    tree.hpBack = hpBack;
    tree.hpFill = hpFill;
    this.trees.add(tree);
  }

  getGroundY(x) {
    if (!this.groundPoints?.length) return this.terrainBaseY ?? 468;
    for (let i = 0; i < this.groundPoints.length - 1; i += 1) {
      const a = this.groundPoints[i];
      const b = this.groundPoints[i + 1];
      if (x < a.x || x > b.x) continue;
      const t = (x - a.x) / (b.x - a.x);
      return Phaser.Math.Linear(a.y, b.y, t);
    }
    return this.groundPoints[this.groundPoints.length - 1].y;
  }

  getVisualGroundY(x) {
    return this.getGroundY(x) + this.visualGroundInset;
  }

  reserveSpawnX(x, clearance, type) {
    this.spawnReservations.push({ x, clearance, type });
    return x;
  }

  getSafeFlatSpawnX(zones = null, clearance = 72, type = "object") {
    const allowed = this.flatSpawnRanges.filter((range) => !zones || zones.includes(range.zone));
    for (let attempt = 0; attempt < 48; attempt += 1) {
      const range = allowed[Phaser.Math.Between(0, allowed.length - 1)];
      if (!range || range.max - range.min < clearance) continue;
      const x = Phaser.Math.Between(range.min + 18, range.max - 18);
        const blocked = this.spawnReservations.some((entry) => Math.abs(entry.x - x) < (clearance + entry.clearance) * 0.5);
      if (!blocked) return this.reserveSpawnX(x, clearance, type);
    }
    for (let attempt = 0; attempt < 36; attempt += 1) {
      const range = allowed[Phaser.Math.Between(0, allowed.length - 1)];
      if (!range || range.max - range.min < 24) continue;
      const x = Phaser.Math.Between(range.min + 14, range.max - 14);
      const blocked = this.spawnReservations.some((entry) => Math.abs(entry.x - x) < (clearance * 0.58 + entry.clearance * 0.42));
      if (!blocked) return this.reserveSpawnX(x, Math.max(42, clearance * 0.72), type);
    }
    return null;
  }

  layoutUi() {
    if (!this.exitButton) return;
    this.nightShade?.setSize(this.scale.width, this.scale.height);
    this.infoText.setPosition(this.scale.width / 2, 34);
    this.staminaPanel?.setPosition(this.scale.width / 2, 66);
    this.healthPanel?.setPosition(this.scale.width / 2, 102);
    this.exitButton.setPosition(this.scale.width - 112, this.scale.height - 72);
    this.leftButton?.setPosition(62, this.scale.height - 62);
    this.rightButton?.setPosition(142, this.scale.height - 62);
    this.jumpButton?.setPosition(this.scale.width - 260, this.scale.height - 66);
    this.contextActionButton?.setPosition(this.scale.width - 342, this.scale.height - 66);
    this.craftButton?.setPosition(this.scale.width - 424, this.scale.height - 66);
  }

  spawnIslandResources() {
    const loot = this.island?.meta?.loot ?? {};
    const configs = [
      { key: "fruit", count: loot.fruit ?? 0, color: 0xe27c48, label: "Meyve" },
      { key: "stone", count: loot.stone ?? 0, color: 0x8a8174, label: "Tas" },
      { key: "sand", count: loot.sand ?? 0, color: 0xd8c478, label: "Kum" },
      { key: "scrap", count: loot.scrap ?? 0, color: 0x9ba7ad, label: "Hurda" }
    ];
    configs.forEach((config) => {
      const nodes = Math.min(5, config.count);
      for (let i = 0; i < nodes; i += 1) {
        const preferredZones = config.key === "stone"
          ? ["rocky", "lowland"]
          : config.key === "sand"
            ? ["shore", "lowland"]
            : ["lowland", "forest", "rocky"];
        const x = this.getSafeFlatSpawnX(preferredZones, 72, `resource-${config.key}`);
        if (x === null) continue;
        const y = this.getVisualGroundY(x);
        const node = this.add.container(x, y);
        const textureKey = this.textures.exists(`island-${config.key}`)
          ? `island-${config.key}`
          : this.textures.exists(`item-${config.key}`)
            ? `item-${config.key}`
            : "item-loot";
        const body = this.add.image(0, 0, textureKey).setOrigin(0.5, 1);
        this.fitSpriteToMaxSize(body, 36);
        const label = this.add.text(0, -body.displayHeight - 8, config.label, { fontSize: "11px", color: "#fff0aa", stroke: "#06202a", strokeThickness: 3 }).setOrigin(0.5);
        node.add([body, label]);
        node.meta = { key: config.key, collected: false };
        this.resources.add(node);
      }
    });
  }


  spawnIslandMines() {
    const oreAmount = this.island?.meta?.loot?.ore ?? 0;
    if (oreAmount <= 0) return;
    const nodeCount = Phaser.Math.Clamp(Math.ceil(oreAmount / 2), 1, 4);
    for (let i = 0; i < nodeCount; i += 1) {
      const x = this.getSafeFlatSpawnX(["rocky", "lowland"], 86, "mine");
      if (x === null) continue;
      const y = this.getVisualGroundY(x);
      const mine = this.add.container(x, y);
      const sprite = this.add.image(0, 0, "island-mine").setOrigin(0.5, 1);
      this.fitSpriteToMaxSize(sprite, 64);
      const label = this.add.text(0, -sprite.displayHeight - 8, "Maden damari", { fontSize: "11px", color: "#ffd18c", stroke: "#06202a", strokeThickness: 3 }).setOrigin(0.5);
      mine.add([sprite, label]);
      const hp = Phaser.Math.Between(3, 4);
      mine.meta = { type: "mine", hp, maxHp: hp, depleted: false };
      const hpBack = this.add.rectangle(0, -sprite.displayHeight - 18, 42, 5, 0x08151c, 0.88).setStrokeStyle(1, 0xffe0a3, 0.55).setVisible(false);
      const hpFill = this.add.rectangle(-20, -sprite.displayHeight - 18, 40, 3, 0x91e6bf, 0.96).setOrigin(0, 0.5).setVisible(false);
      mine.add([hpBack, hpFill]);
      mine.hpBack = hpBack;
      mine.hpFill = hpFill;
      this.mines.add(mine);
    }
  }

  fitSpriteToMaxSize(sprite, maxSize) {
    const width = Math.max(1, sprite.width ?? maxSize);
    const height = Math.max(1, sprite.height ?? maxSize);
    const scale = maxSize / Math.max(width, height);
    sprite.setDisplaySize(Math.round(width * scale), Math.round(height * scale));
  }

  spawnIslandHazards() {
    const riskBand = this.island?.meta?.riskBand ?? "safe";
    const riskMultiplier = riskBand === "danger" || riskBand === "edge" ? 2 : riskBand === "harsh" ? 1.45 : 1;
    const extraHazards = riskBand === "danger" || riskBand === "edge" ? 2 : riskBand === "harsh" ? 1 : 0;
    const configs = {
      thorn: { type: "thorn", label: "Diken", color: 0x61704d, count: 1 + extraHazards, damage: Math.round(4 * riskMultiplier), slow: 500, message: "Dikenler canini acitti" },
      snake: { type: "snake", label: "Yilan", color: 0x2f6d48, count: 1 + extraHazards, damage: Math.round(7 * riskMultiplier), slow: 650, hp: Math.round(3 * riskMultiplier), sight: 155, attackRange: 27, attackDelay: 1250, moveSpeed: 48, message: "Yilan saldirdi" },
      scorpion: { type: "scorpion", label: "Akrep", color: 0x5a3a24, count: 1 + extraHazards, damage: Math.round(6 * riskMultiplier), slow: 850, hp: Math.round(4 * riskMultiplier), sight: 135, attackRange: 25, attackDelay: 1450, moveSpeed: 34, message: "Akrep soktu" }
    };

    const spawnOne = (config, forced = false) => {
      const zones = ["lowland", "forest", "rocky"];
      const clearance = forced ? 58 : config.type === "thorn" ? 76 : 68;
      const x = this.getSafeFlatSpawnX(zones, clearance, `hazard-${config.type}`);
      if (x === null) return null;
      const y = this.getVisualGroundY(x);
      const node = this.add.container(x, y);
      if (config.type === "thorn") {
        const bush = this.add.image(0, 0, "hazard-thorn").setOrigin(0.5, 1);
        this.fitSpriteToMaxSize(bush, 48);
        node.add(bush);
      } else if (config.type === "snake") {
        const snake = this.add.image(0, 0, "hazard-snake-right").setOrigin(0.5, 1);
        this.fitSpriteToMaxSize(snake, 58);
        node.add(snake);
        node.sprite = snake;
        node.metaMove = { origin: x, range: Phaser.Math.Between(34, 60), speed: Phaser.Math.FloatBetween(0.0012, 0.002) };
      } else {
        const scorpion = this.add.image(0, 0, "hazard-scorpion-right").setOrigin(0.5, 1);
        this.fitSpriteToMaxSize(scorpion, 46);
        node.add(scorpion);
        node.sprite = scorpion;
      }
      const label = this.add.text(0, -28, config.label, { fontSize: "10px", color: "#ffdfaa", stroke: "#06202a", strokeThickness: 3 }).setOrigin(0.5).setAlpha(0.82);
      node.add(label);
      if (config.hp) {
        const hpBack = this.add.rectangle(0, -18, 38, 5, 0x08151c, 0.9).setStrokeStyle(1, 0xffd0c8, 0.6);
        const hpFill = this.add.rectangle(-18, -18, 36, 3, 0x91e6bf, 0.96).setOrigin(0, 0.5);
        node.add([hpBack, hpFill]);
        node.hpFill = hpFill;
      }
      node.meta = { ...config, maxHp: config.hp ?? 0, lastHit: -9999, lastAttackAt: -9999, dead: false };
      this.hazards.add(node);
      return node;
    };

    let hostileCount = 0;
    [configs.snake, configs.scorpion].forEach((config) => {
      for (let i = 0; i < config.count; i += 1) {
        if (spawnOne(config)) hostileCount += 1;
      }
    });
    while (hostileCount < 2) {
      const config = hostileCount % 2 === 0 ? configs.snake : configs.scorpion;
      if (!spawnOne(config, true)) break;
      hostileCount += 1;
    }

    let thornCount = 0;
    for (let i = 0; i < configs.thorn.count; i += 1) {
      if (spawnOne(configs.thorn)) thornCount += 1;
    }
    while (thornCount < 1) {
      if (!spawnOne(configs.thorn, true)) break;
      thornCount += 1;
    }

  }

  update(_time, delta) {
    if (this.finished) return;
    const dt = delta / 1000;
    const input = this.getInput();
    if (Phaser.Input.Keyboard.JustDown(this.keys.jump)) this.tryJump();
    if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) this.useContextAction();
    const slowed = this.time.now < this.slowUntil;
    const speed = slowed ? 76 : 170;
    this.updateJump(dt);
    this.updateStamina(dt, input);
    this.renderHealthBar();
    this.player.x = Phaser.Math.Clamp(this.player.x + input * speed * dt, 24, this.bounds.width - 24);
    this.player.y = this.getGroundY(this.player.x) - 12 + this.jumpOffset;
    this.updateNightLighting();
    this.updateIslandHazards(dt);
    if (this.finished) return;
    this.collectNearby();
    this.updateContextAction();
    if (this.player.x <= 170) {
      this.infoText.setText("Giris sahili: adadan ayril");
    } else {
      this.infoText.setText(slowed ? "Yavasladin, dikkatli ilerle" : "Kaynak topla, tehlikelerden uzak dur");
    }
    this.exitButton.setVisible(this.player.x <= 145);
    if (Phaser.Input.Keyboard.JustDown(this.keys.exit)) this.tryExitIsland();
  }

  getNightShadeAlpha() {
    if (!this.parentScene?.isNight) return 0;
    return this.parentScene.hasTorch ? 0.58 : 0.84;
  }

  updateNightLighting() {
    if (!this.nightShade) return;
    this.nightShade.setAlpha(this.getNightShadeAlpha());
    if (!this.torchGlow) return;
    const visible = Boolean(this.parentScene?.hasTorch && this.parentScene?.isNight);
    this.torchGlow.setVisible(visible);
    if (!visible) return;
    this.torchGlow.setPosition(this.player.x, this.player.y);
    this.torchGlow.setAlpha(0.13 + Math.sin(this.time.now * 0.008) * 0.025);
    this.torchGlow.setScale(1 + Math.sin(this.time.now * 0.006) * 0.04);
  }

  updateJump(dt) {
    if (this.isGrounded) return;
    this.jumpVelocity += 760 * dt;
    this.jumpOffset += this.jumpVelocity * dt;
    if (this.jumpOffset >= 0) {
      this.jumpOffset = 0;
      this.jumpVelocity = 0;
      this.isGrounded = true;
    }
  }

  updateStamina(dt, input) {
    const movingCost = Math.abs(input) > 0 ? 12 * dt : 0;
    const regen = this.isGrounded && Math.abs(input) === 0 ? 18 * dt : 0;
    this.stamina = Phaser.Math.Clamp(this.stamina - movingCost + regen, 0, 100);
    this.renderStaminaBar();
  }

  renderStaminaBar() {
    if (this.staminaFill) {
      this.staminaFill.displayWidth = Math.max(2, 216 * (this.stamina / 100));
      this.staminaFill.fillColor = this.stamina < 24 ? 0xff8b76 : this.stamina < 55 ? 0xffd17c : 0x91e6bf;
    }
  }

  renderHealthBar() {
    if (!this.healthFill) return;
    const hp = Phaser.Math.Clamp(this.parentScene.stats.hp, 0, 100);
    this.healthFill.displayWidth = Math.max(2, 216 * (hp / 100));
    this.healthFill.fillColor = hp < 25 ? 0xff5252 : hp < 55 ? 0xff8b76 : 0x91e6bf;
    this.healthText.setText(`Can ${Math.round(hp)}`);
  }

  spendStamina(amount) {
    if (this.stamina < amount) {
      this.showText("Dayaniklilik yok", this.player.x, this.player.y - 36, "#ffcc93");
      return false;
    }
    this.stamina -= amount;
    this.renderStaminaBar();
    return true;
  }

  tryJump() {
    if (!this.isGrounded) return;
    if (!this.spendStamina(16)) return;
    this.isGrounded = false;
    this.jumpVelocity = -335;
    this.showText("Zipla", this.player.x, this.player.y - 30, "#d6f7ff");
  }

  useContextAction() {
    const hostile = this.getNearestHostile(56);
    if (hostile) {
      this.attackHazard(hostile);
      return;
    }
    const thorn = this.getNearestThorn(56);
    if (thorn) {
      this.collectThorn(thorn);
      return;
    }
    const tree = this.getNearestTree(72);
    if (tree) {
      this.attackTree(tree);
      return;
    }
    const mine = this.getNearestMine(72);
    if (mine) {
      this.attackMine(mine);
      return;
    }
    this.showText("Yakin hedef yok", this.player.x, this.player.y - 34, "#c9d7df");
  }

  getNearestHostile(range) {
    let closest = null;
    let closestDistance = range;
    this.hazards.getChildren().forEach((hazard) => {
      if (!["snake", "scorpion"].includes(hazard.meta.type)) return;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y);
      if (distance < closestDistance) {
        closest = hazard;
        closestDistance = distance;
      }
    });
    return closest;
  }

  getNearestThorn(range) {
    let closest = null;
    let closestDistance = range;
    this.hazards.getChildren().forEach((hazard) => {
      if (hazard.meta.type !== "thorn") return;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y);
      if (distance < closestDistance) {
        closest = hazard;
        closestDistance = distance;
      }
    });
    return closest;
  }

  getNearestTree(range) {
    let closest = null;
    let closestDistance = range;
    this.trees?.getChildren().forEach((tree) => {
      if (tree.meta.dead) return;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, tree.x, tree.y);
      if (distance < closestDistance) {
        closest = tree;
        closestDistance = distance;
      }
    });
    return closest;
  }


  getNearestMine(range) {
    let closest = null;
    let closestDistance = range;
    this.mines?.getChildren().forEach((mine) => {
      if (mine.meta.depleted) return;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, mine.x, mine.y);
      if (distance < closestDistance) {
        closest = mine;
        closestDistance = distance;
      }
    });
    return closest;
  }

  attackTree(tree) {
    if (!this.parentScene.hasAxe) {
      this.showText("Agaci kesmek icin Basit Balta gerekli", tree.x, tree.y - 90, "#ffcc93");
      return;
    }
    if (this.time.now - this.lastPlayerAttackAt < 850) {
      this.showText("Tekrar vurmak icin bekle", this.player.x, this.player.y - 34, "#c9d7df");
      return;
    }
    if (!this.spendStamina(18)) return;
    this.lastPlayerAttackAt = this.time.now;
    tree.meta.hp = Math.max(0, tree.meta.hp - 1);
    tree.hpBack?.setVisible(true);
    tree.hpFill?.setVisible(true);
    tree.hpFill.displayWidth = Math.max(1, 38 * (tree.meta.hp / tree.meta.maxHp));
    this.showText(`Agac ${tree.meta.hp}/${tree.meta.maxHp}`, tree.x, tree.y - 105, "#fff0aa");
    this.tweens.add({ targets: tree, angle: tree.x >= this.player.x ? 3 : -3, duration: 90, yoyo: true });
    if (tree.meta.hp > 0) return;
    tree.meta.dead = true;
    this.grantLoot("log", Phaser.Math.Between(1, 2));
    this.grantLoot("branch", Phaser.Math.Between(1, 2));
    this.grantLoot("leaf", Phaser.Math.Between(1, 3));
    this.parentScene.recordQuestAction("treeChopped");
    if (tree.meta.variant === "island-banana-tree" && Phaser.Math.Between(1, 100) <= 75) this.grantLoot("fruit", Phaser.Math.Between(1, 2));
    this.tweens.add({
      targets: tree,
      alpha: 0,
      angle: tree.x >= this.player.x ? 18 : -18,
      duration: 260,
      onComplete: () => tree.destroy()
    });
  }


  attackMine(mine) {
    if (!this.parentScene.hasPickaxe) {
      this.showText("Madeni kazmak icin Basit Kazma gerekli", mine.x, mine.y - 72, "#ffcc93");
      return;
    }
    if (this.time.now - this.lastPlayerAttackAt < 900) {
      this.showText("Tekrar vurmak icin bekle", this.player.x, this.player.y - 34, "#c9d7df");
      return;
    }
    if (!this.spendStamina(20)) return;
    this.lastPlayerAttackAt = this.time.now;
    mine.meta.hp = Math.max(0, mine.meta.hp - 1);
    mine.hpBack?.setVisible(true);
    mine.hpFill?.setVisible(true);
    mine.hpFill.displayWidth = Math.max(1, 40 * (mine.meta.hp / mine.meta.maxHp));
    this.showText(`Maden ${mine.meta.hp}/${mine.meta.maxHp}`, mine.x, mine.y - 78, "#fff0aa");
    this.tweens.add({ targets: mine, x: mine.x + (mine.x >= this.player.x ? 8 : -8), duration: 70, yoyo: true });
    if (mine.meta.hp > 0) return;
    const loot = this.island?.meta?.loot ?? {};
    const oreGain = Math.min(loot.ore ?? 0, Phaser.Math.Between(1, 2));
    if (oreGain > 0 && this.grantLoot("ore", oreGain)) {
      loot.ore -= oreGain;
      this.parentScene.markQuestFlag("foundIslandOre");
      this.parentScene.recordQuestAction("oreMined");
    }
    this.grantLoot("stone", Phaser.Math.Between(1, 3));
    mine.meta.depleted = true;
    this.tweens.add({
      targets: mine,
      alpha: 0,
      scaleX: 0.65,
      scaleY: 0.65,
      duration: 220,
      onComplete: () => mine.destroy()
    });
  }

  attackHazard(hazard) {
    if (this.time.now - this.lastPlayerAttackAt < 1000) {
      this.showText("Tekrar vurmak icin bekle", this.player.x, this.player.y - 34, "#c9d7df");
      return;
    }
    if (!this.spendStamina(22)) return;
    this.lastPlayerAttackAt = this.time.now;
    hazard.meta.hp = Math.max(0, hazard.meta.hp - 1);
    this.renderHazardHealth(hazard);
    this.showText(`Vurdun ${hazard.meta.hp}/${hazard.meta.maxHp}`, hazard.x, hazard.y - 34, "#fff0aa");
    this.tweens.add({ targets: hazard, x: hazard.x + (hazard.x >= this.player.x ? 14 : -14), duration: 90, yoyo: true });
    if (hazard.meta.hp > 0) return;
    hazard.meta.dead = true;
    this.parentScene.recordQuestAction("islandEnemyDefeated");
    this.grantHazardLoot(hazard.meta.type);
    this.tweens.add({
      targets: hazard,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 180,
      onComplete: () => hazard.destroy()
    });
  }

  renderHazardHealth(hazard) {
    if (!hazard?.hpFill || !hazard.meta.maxHp) return;
    const ratio = Phaser.Math.Clamp(hazard.meta.hp / hazard.meta.maxHp, 0, 1);
    hazard.hpFill.displayWidth = Math.max(1, 36 * ratio);
    hazard.hpFill.fillColor = ratio <= 0.3 ? 0xff5252 : ratio <= 0.6 ? 0xffd17c : 0x91e6bf;
  }

  grantHazardLoot(type) {
    if (type === "snake") {
      this.grantLoot("rawMeat", 1);
      if (Phaser.Math.Between(1, 100) <= 38) this.grantLoot("snakeSkin", 1);
      if (Phaser.Math.Between(1, 100) <= 12) this.grantLoot("venomGland", 1);
    }
    if (type === "scorpion") {
      if (Phaser.Math.Between(1, 100) <= 65) this.grantLoot("rawMeat", 1);
      if (Phaser.Math.Between(1, 100) <= 22) this.grantLoot("venomGland", 1);
    }
  }

  grantLoot(key, amount = 1) {
    if (!this.parentScene.addInventoryItem(key, amount)) {
      this.showText("Envanter dolu", this.player.x, this.player.y - 38, "#ffcc93");
      return false;
    }
    this.gained[key] = (this.gained[key] ?? 0) + amount;
    this.parentScene.recordQuestAction("islandResourceCollected", amount);
    this.showText(`${ITEM_LABELS[key]} +${amount}`, this.player.x, this.player.y - 42, "#fff0aa");
    return true;
  }

  collectThorn(thorn) {
    if (!this.spendStamina(8)) return;
    const damage = Phaser.Math.Between(3, 6) * (this.island?.meta?.riskMultiplier ?? 1);
    this.parentScene.stats.hp = Math.max(0, this.parentScene.stats.hp - damage);
    this.grantLoot("thorn", 1);
    this.showText(`Diken toplandi, -${damage} can`, thorn.x, thorn.y - 30, "#ffcc93");
    thorn.destroy();
    this.renderHealthBar();
    this.parentScene.updateHud();
    if (this.parentScene.stats.hp <= 0) {
      this.finishExplore();
      this.parentScene.checkGameOver();
    }
  }

  updateContextAction() {
    if (!this.contextActionButton?.icon) return;
    const hostile = this.getNearestHostile(62);
    const tree = this.getNearestTree(76);
    const mine = this.getNearestMine(76);
    const thorn = this.getNearestThorn(62);
    if (hostile) {
      this.contextActionButton.icon.setText("X");
      this.contextActionButton.bg.setFillStyle(0x6d3b33, 0.94);
    } else if (thorn) {
      this.contextActionButton.icon.setText("T");
      this.contextActionButton.bg.setFillStyle(0x61704d, 0.94);
    } else if (tree) {
      this.contextActionButton.icon.setText(this.parentScene.hasAxe ? "B" : "?");
      this.contextActionButton.bg.setFillStyle(this.parentScene.hasAxe ? 0x7a4d2a : 0x53483e, 0.94);
    } else if (mine) {
      this.contextActionButton.icon.setText(this.parentScene.hasPickaxe ? "K" : "?");
      this.contextActionButton.bg.setFillStyle(this.parentScene.hasPickaxe ? 0x6f7784 : 0x53483e, 0.94);
    } else {
      this.contextActionButton.icon.setText("!");
      this.contextActionButton.bg.setFillStyle(0x10414e, 0.72);
    }
  }

  updateIslandHazards(dt = 1 / 60) {
    this.hazards.getChildren().forEach((hazard) => {
      if (hazard.meta.dead) return;
      const hostile = ["snake", "scorpion"].includes(hazard.meta.type);
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y);
      if (hostile && distance <= hazard.meta.sight && distance > hazard.meta.attackRange) {
        const direction = Math.sign(this.player.x - hazard.x);
        hazard.x = Phaser.Math.Clamp(hazard.x + direction * hazard.meta.moveSpeed * dt, 24, this.bounds.width - 24);
        hazard.y = this.getVisualGroundY(hazard.x);
        this.updateHazardDirection(hazard, direction);
      } else if (hazard.metaMove && !hostile) {
        hazard.x = hazard.metaMove.origin + Math.sin(this.time.now * hazard.metaMove.speed) * hazard.metaMove.range;
        hazard.y = this.getVisualGroundY(hazard.x);
      }
      if (!this.isGrounded && this.jumpOffset < -18 && hazard.meta.type !== "snake") return;
      if (distance > (hazard.meta.attackRange ?? 30)) return;
      const cooldown = hostile ? hazard.meta.attackDelay : 1500;
      if (this.time.now - hazard.meta.lastHit < cooldown) return;
      hazard.meta.lastHit = this.time.now;
      if (hazard.meta.slow) this.slowUntil = Math.max(this.slowUntil, this.time.now + hazard.meta.slow);
      if (hazard.meta.damage > 0) {
        this.parentScene.stats.hp = Math.max(0, this.parentScene.stats.hp - hazard.meta.damage);
        this.showText(`-${hazard.meta.damage} can`, this.player.x, this.player.y - 30, "#ffb0a2");
        this.parentScene.updateHud();
        this.renderHealthBar();
        if (this.parentScene.stats.hp <= 0) {
          this.finishExplore();
          this.parentScene.checkGameOver();
          return;
        }
      }
      this.showText(hazard.meta.message, hazard.x, hazard.y - 28, hazard.meta.damage > 0 ? "#ffcc93" : "#fff0aa");
    });
  }

  updateHazardDirection(hazard, direction) {
    if (!hazard?.sprite || !["snake", "scorpion"].includes(hazard.meta.type) || direction === 0) return;
    const facing = direction < 0 ? "left" : "right";
    if (hazard.meta.facing === facing) return;
    hazard.meta.facing = facing;
    const textureKey = `hazard-${hazard.meta.type}-${facing}`;
    if (this.textures.exists(textureKey)) hazard.sprite.setTexture(textureKey);
  }

  getInput() {
    let input = 0;
    if (this.moveHold) input += this.moveHold;
    if (this.keys.left.isDown || this.keys.left2.isDown) input -= 1;
    if (this.keys.right.isDown || this.keys.right2.isDown) input += 1;
    const pointer = this.input.activePointer;
    const pointerOnMoveButtons = pointer.y > this.scale.height - 112 && pointer.x < 186;
    if (pointer.isDown && pointerOnMoveButtons) {
      input += pointer.x < 102 ? -1 : 1;
    }
    return Phaser.Math.Clamp(input, -1, 1);
  }

  collectNearby() {
    this.resources.getChildren().forEach((node) => {
      if (node.meta.collected) return;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y) > 32) return;
      const loot = this.island?.meta?.loot ?? {};
      if ((loot[node.meta.key] ?? 0) <= 0) {
        node.destroy();
        return;
      }
      if (!this.parentScene.addInventoryItem(node.meta.key, 1)) {
        this.showText("Envanter dolu", node.x, node.y, "#ffcc93");
        return;
      }
      node.meta.collected = true;
      loot[node.meta.key] -= 1;
      this.gained[node.meta.key] = (this.gained[node.meta.key] ?? 0) + 1;
      this.parentScene.recordQuestAction("islandResourceCollected");
      if (node.meta.key === "scrap") this.parentScene.markQuestFlag("foundIslandScrap");
      if (node.meta.key === "ore") this.parentScene.markQuestFlag("foundIslandOre");
      if (node.meta.key === "sand") this.parentScene.recordQuestAction("sandFound");
      this.showText(`${ITEM_LABELS[node.meta.key]} +1`, node.x, node.y, "#fff0aa");
      node.destroy();
    });
  }

  showText(message, x, y, color) {
    const text = this.add.text(x, y, message, { fontSize: "13px", color, stroke: "#06202a", strokeThickness: 4 }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: text, y: y - 28, alpha: 0, duration: 850, onComplete: () => text.destroy() });
  }

  finishExplore() {
    if (this.finished) return;
    this.finished = true;
    const result = { gained: { ...this.gained }, rested: this.rested };
    const parent = this.parentScene;
    this.scene.stop();
    parent.finishIslandExplore(result);
  }

  tryExitIsland() {
    if (this.player.x > 145) {
      this.showText("Cikmak icin giris sahiline don", this.player.x, this.player.y - 36, "#ffcc93");
      return;
    }
    this.finishExplore();
  }
}
