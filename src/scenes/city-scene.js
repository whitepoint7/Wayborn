import Phaser from "phaser";

const BUILDINGS = [
  { key: "market", label: "Carsi", detail: "Ticaret ve erzak", x: 720, color: 0xb76b45 },
  { key: "shipyard", label: "Tersane", detail: "Sal onarimi", x: 1380, color: 0x557f8e },
  { key: "hall", label: "Belediye", detail: "Kontratlar", x: 2050, color: 0xa98952 },
  { key: "tavern", label: "Taverna", detail: "Tayfa ve hizmetler", x: 2720, color: 0x865b48 }
];

export class CityScene extends Phaser.Scene {
  constructor() {
    super("city");
    this.bounds = { width: 3200, height: 620 };
  }

  init(data) {
    this.parentScene = data.parentScene;
    this.city = data.city;
    this.finished = false;
    this.moveHold = 0;
    this.lastActionAt = -9999;
    this.entryX = 100;
  }

  create() {
    this.bounds.height = Math.max(620, this.scale.height);
    this.streetY = this.bounds.height - 130;
    this.cameras.main.setBounds(0, 0, this.bounds.width, this.bounds.height);
    this.cameras.main.setBackgroundColor(0x78a8b1);
    this.drawCity();
    this.createBuildings();

    this.player = this.add.container(this.entryX, this.streetY - 24).setDepth(12);
    const shadow = this.add.ellipse(0, 23, 30, 9, 0x172b32, 0.34);
    const body = this.add.rectangle(0, 0, 18, 34, 0xc98855).setStrokeStyle(2, 0x40251c);
    const head = this.add.circle(0, -23, 10, 0xf0b36b).setStrokeStyle(2, 0x40251c);
    this.player.add([shadow, body, head]);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      interact: Phaser.Input.Keyboard.KeyCodes.E,
      exit: Phaser.Input.Keyboard.KeyCodes.ESC
    });

    this.titleText = this.add.text(0, 0, this.city?.meta?.name ?? "Sehir", {
      fontSize: "22px", fontStyle: "700", color: "#f3fbf7", stroke: "#06202a", strokeThickness: 5
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
    this.infoText = this.add.text(0, 0, "Caddeyi kesfet", {
      fontSize: "13px", color: "#d6f7ff", stroke: "#06202a", strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30);

    this.leftButton = this.createMoveButton("<", -1);
    this.rightButton = this.createMoveButton(">", 1);
    this.actionButton = this.createActionButton("E", () => this.interact());
    this.exitButton = this.createActionButton("X", () => this.tryExit());
    this.layoutUi();
    this.scale.on("resize", () => this.layoutUi());
    this.input.on("pointerdown", (pointer) => this.handleCityPointer(pointer));
    this.input.on("pointerup", () => { this.moveHold = 0; });
  }

  drawCity() {
    this.add.rectangle(this.bounds.width / 2, this.bounds.height / 2, this.bounds.width, this.bounds.height, 0x78a8b1).setDepth(-20);
    this.add.rectangle(this.bounds.width / 2, this.streetY + 72, this.bounds.width, 180, 0x8b8173).setDepth(-8);
    this.add.rectangle(this.bounds.width / 2, this.streetY + 2, this.bounds.width, 10, 0xc3b28d).setDepth(-7);
    this.add.rectangle(this.bounds.width / 2, this.streetY + 48, this.bounds.width, 5, 0xd8c478, 0.45).setDepth(-6);

    for (let x = 120; x < this.bounds.width; x += 230) {
      const height = 110 + ((x / 230) % 3) * 34;
      this.add.rectangle(x, this.streetY - height / 2, 170, height, 0x416b74, 0.38).setDepth(-14);
      this.add.triangle(x, this.streetY - height - 22, -95, 24, 95, 24, 0, -28, 0x35555e, 0.42).setDepth(-13);
    }

    this.add.text(this.entryX, this.streetY - 86, "Sehir Kapisi", {
      fontSize: "14px", color: "#fff0aa", stroke: "#06202a", strokeThickness: 4
    }).setOrigin(0.5);
    this.add.rectangle(this.entryX, this.streetY - 38, 84, 76, 0x4d6870).setStrokeStyle(3, 0xc3b28d);
  }

  createBuildings() {
    this.buildings = BUILDINGS.map((definition) => {
      const building = this.add.container(definition.x, this.streetY - 92).setDepth(2);
      const body = this.add.rectangle(0, 0, 300, 180, definition.color).setStrokeStyle(4, 0x293f45);
      const roof = this.add.triangle(0, -118, -178, 38, 178, 38, 0, -38, 0x344c53).setStrokeStyle(3, 0x24383e);
      const door = this.add.rectangle(0, 45, 48, 88, 0x382b25).setStrokeStyle(2, 0xd0aa68);
      const windowLeft = this.add.rectangle(-88, -8, 50, 42, 0x9ed0d4, 0.82).setStrokeStyle(2, 0xf1d59c);
      const windowRight = this.add.rectangle(88, -8, 50, 42, 0x9ed0d4, 0.82).setStrokeStyle(2, 0xf1d59c);
      const sign = this.add.text(0, -66, definition.label, {
        fontSize: "21px", fontStyle: "700", color: "#fff0c7", stroke: "#33231b", strokeThickness: 5
      }).setOrigin(0.5);
      const detail = this.add.text(0, -38, definition.detail, {
        fontSize: "12px", color: "#f3fbf7", stroke: "#33231b", strokeThickness: 3
      }).setOrigin(0.5);
      building.add([body, roof, door, windowLeft, windowRight, sign, detail]);
      building.meta = definition;
      return building;
    });
  }

  createMoveButton(label, direction) {
    const button = this.createButton(label, 32);
    button.on("pointerdown", (pointer) => {
      pointer.event?.preventDefault();
      pointer.event?.stopPropagation();
      this.moveHold = direction;
    });
    const release = () => {
      if (this.moveHold === direction) this.moveHold = 0;
    };
    button.on("pointerup", release);
    button.on("pointerout", release);
    button.on("pointerupoutside", release);
    return button;
  }

  createActionButton(label, callback) {
    const button = this.createButton(label, 24);
    button.on("pointerdown", (pointer) => {
      pointer.event?.preventDefault();
      pointer.event?.stopPropagation();
      callback();
    });
    return button;
  }

  handleCityPointer(pointer) {
    if (this.finished) return;
    if (this.isScreenPointNear(this.leftButton, pointer, 54)) {
      pointer.event?.preventDefault();
      pointer.event?.stopPropagation();
      this.moveHold = -1;
      return;
    }
    if (this.isScreenPointNear(this.rightButton, pointer, 54)) {
      pointer.event?.preventDefault();
      pointer.event?.stopPropagation();
      this.moveHold = 1;
      return;
    }
    if (this.isScreenPointNear(this.actionButton, pointer, 54)) {
      pointer.event?.preventDefault();
      pointer.event?.stopPropagation();
      this.interact();
      return;
    }
    if (this.isScreenPointNear(this.exitButton, pointer, 54)) {
      pointer.event?.preventDefault();
      pointer.event?.stopPropagation();
      this.tryExit();
    }
  }

  isScreenPointNear(button, pointer, radius) {
    if (!button?.visible) return false;
    return Phaser.Math.Distance.Between(pointer.x, pointer.y, button.x, button.y) <= radius;
  }

  createButton(label, fontSize) {
    const button = this.add.container(0, 0).setScrollFactor(0).setDepth(32);
    const bg = this.add.circle(0, 0, 34, 0x10414e, 0.9).setStrokeStyle(2, 0xb1ebe0, 0.8);
    const icon = this.add.text(0, -2, label, { fontSize: `${fontSize}px`, fontStyle: "700", color: "#f3fbf7" }).setOrigin(0.5);
    button.add([bg, icon]);
    button.setSize(76, 76);
    button.setInteractive(new Phaser.Geom.Circle(0, 0, 38), Phaser.Geom.Circle.Contains);
    button.icon = icon;
    return button;
  }

  layoutUi() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.titleText.setPosition(w / 2, 30);
    this.infoText.setPosition(w / 2, 58);
    this.leftButton.setPosition(70, h - 68);
    this.rightButton.setPosition(150, h - 68);
    this.exitButton.setPosition(w - 70, h - 68);
    this.actionButton.setPosition(w - 150, h - 68);
  }

  getNearbyBuilding() {
    return this.buildings.find((building) => Math.abs(building.x - this.player.x) < 155) ?? null;
  }

  interact() {
    if (this.time.now - this.lastActionAt < 250) return;
    this.lastActionAt = this.time.now;
    const building = this.getNearbyBuilding();
    if (!building) {
      this.showText("Bir yapinin kapisina yaklas");
      return;
    }
    const key = building.meta.key;
    if (key === "market") {
      this.parentScene.openCityTradeFromScene(this, "market");
    } else if (key === "hall") {
      this.parentScene.openCityTradeFromScene(this, "contracts");
    } else if (key === "shipyard") {
      const before = this.parentScene.raftIntegrity;
      this.parentScene.useCityShipyard();
      this.showText(this.parentScene.raftIntegrity > before ? "Sal tamamen onarildi" : "Onarim icin 24 altin ve hasarli sal gerekir");
    } else if (key === "tavern") {
      this.parentScene.openCityServicesFromScene(this);
    }
  }

  showText(message) {
    const text = this.add.text(this.player.x, this.player.y - 72, message, {
      fontSize: "13px", color: "#fff0aa", stroke: "#06202a", strokeThickness: 4
    }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: text, y: text.y - 28, alpha: 0, duration: 1100, onComplete: () => text.destroy() });
  }

  tryExit() {
    if (this.player.x > 190) {
      this.showText("Ayrilmak icin sehir kapisina don");
      return;
    }
    this.finish();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    const parent = this.parentScene;
    this.scene.stop();
    parent.finishCityExplore();
  }

  update(_time, delta) {
    if (this.finished) return;
    const keyboardDirection =
      (this.keys.left.isDown || this.keys.left2.isDown ? -1 : 0) +
      (this.keys.right.isDown || this.keys.right2.isDown ? 1 : 0);
    const direction = Phaser.Math.Clamp(this.moveHold || keyboardDirection, -1, 1);
    this.player.x = Phaser.Math.Clamp(this.player.x + direction * 0.27 * delta, 64, this.bounds.width - 64);
    const nearby = this.getNearbyBuilding();
    this.actionButton.icon.setText(nearby ? "!" : "E");
    this.infoText.setText(nearby ? `${nearby.meta.label}: ${nearby.meta.detail}` : "Caddeyi kesfet");
    if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) this.interact();
    if (Phaser.Input.Keyboard.JustDown(this.keys.exit)) this.tryExit();
  }
}
