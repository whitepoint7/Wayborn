import Phaser from "phaser";

const CREW_NAMES = [
  "Alden Rook",
  "Mira Voss",
  "Corin Vale",
  "Nessa Ward",
  "Tarin Holt",
  "Elian Marr",
  "Sera Quill",
  "Bram Mercer",
  "Lyra Venn",
  "Oren Drell",
  "Mara Venn",
  "Cassian Drell",
  "Ilya Marr",
  "Neris Quill",
  "Varek Sorn",
  "Elara Rook"
];
const TURKISH_NAME_PATTERN = /^(ahmet|mehmet|mert|emre|can|deniz|efe|kerem|berk|arda|yusuf|tolga|ali|veli|ayse|fatma|elif|zeynep)$/i;
const CREW_ROLES = [
  { key: "lookout", label: "Gozcu" },
  { key: "fisher", label: "Balikci" },
  { key: "handyman", label: "Tamirci" },
  { key: "survivor", label: "Kazazede" }
];

export class CrewSystem {
  constructor(scene, { worldSize }) {
    this.scene = scene;
    this.worldSize = worldSize;
    this.nearSurvivor = null;
    this.supplyTicks = 0;
  }

  spawnSurvivor(randomAnywhere = false) {
    const scene = this.scene;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = randomAnywhere ? Phaser.Math.Between(700, 2300) : Phaser.Math.Between(900, 1600);
    const x = scene.playerRoot.x + Math.cos(angle) * distance;
    const y = scene.playerRoot.y + Math.sin(angle) * distance;
    if (Math.abs(x) > this.worldSize / 2 || Math.abs(y) > this.worldSize / 2 || scene.isPointOnIsland(x, y, 70)) return false;

    const role = Phaser.Utils.Array.GetRandom(CREW_ROLES);
    const survivor = scene.add.container(x, y).setDepth(8);
    const ring = scene.add.circle(0, 0, 19, 0xffd37a, 0.14).setStrokeStyle(2, 0xffd37a, 0.72);
    const plank = scene.add.rectangle(0, 7, 33, 11, 0x8b5a32, 0.96).setStrokeStyle(2, 0x3f2816, 0.8);
    const head = scene.add.circle(0, -5, 7, 0xe6a66c, 1).setStrokeStyle(2, 0x4a2d20, 0.9);
    const signal = scene.add.triangle(14, -19, 0, 9, -6, -5, 6, -5, 0xffd37a, 0.9);
    survivor.add([ring, plank, head, signal]);
    survivor.meta = {
      id: `survivor-${Date.now()}-${Phaser.Math.Between(100, 999)}`,
      name: this.getSafeCrewName(),
      role: role.key,
      roleLabel: role.label,
      drift: Phaser.Math.FloatBetween(0.12, 0.3),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2)
    };
    scene.survivors.add(survivor);
    return true;
  }

  update(dt, time) {
    const scene = this.scene;
    scene.survivors.getChildren().forEach((survivor) => {
      if (scene.windEnabled) {
        survivor.x += scene.wind.x * survivor.meta.drift * scene.windPower * dt;
        survivor.y += scene.wind.y * survivor.meta.drift * scene.windPower * dt;
      }
      survivor.rotation = Math.sin(time * 0.002 + survivor.meta.phase) * 0.08;
      scene.resolveIslandCollisionForItem(survivor);
    });
    this.checkNearby();
  }

  checkNearby() {
    const scene = this.scene;
    let closest = null;
    let closestDistance = Infinity;
    scene.survivors.getChildren().forEach((survivor) => {
      const distance = Phaser.Math.Distance.Between(survivor.x, survivor.y, scene.playerRoot.x, scene.playerRoot.y);
      if (distance < 72 && distance < closestDistance) {
        closest = survivor;
        closestDistance = distance;
      }
    });
    if (closest !== this.nearSurvivor) {
      this.nearSurvivor = closest;
      scene.nearSurvivor = closest;
      scene.updateActionLabels();
      if (closest) scene.logEvent("Denizde bir kazazede var. Kurtarmak icin bos yatak gerekli.", "warn");
    }
  }

  rescueNearby() {
    const scene = this.scene;
    const survivor = this.nearSurvivor;
    if (!survivor) return false;
    if (scene.getCrewCount() >= scene.getCrewCapacity()) {
      scene.showAlertModal("Kazazedeyi alacak bos yatak yok. Once sali genisletip Basit Yatak kur.");
      return false;
    }
    const member = {
      id: survivor.meta.id,
      name: this.getSafeCrewName(survivor.meta.name),
      role: survivor.meta.role,
      roleLabel: survivor.meta.roleLabel,
      hunger: 0,
      thirst: 0
    };
    scene.crew.push(member);
    survivor.destroy();
    this.nearSurvivor = null;
    scene.nearSurvivor = null;
    scene.stats.morale = Math.min(100, scene.stats.morale + 10);
    scene.recordQuestAction("survivorRecruited");
    scene.notify(`${member.name} kurtarildi. Gorevi: ${member.roleLabel}`, scene.playerRoot.x, scene.playerRoot.y - 70, "#bff4c7", "good");
    scene.updateActionLabels();
    scene.updateHud();
    return true;
  }

  survivalTick() {
    const scene = this.scene;
    if (!scene.crew.length || scene.isGameOver) return;
    this.supplyTicks += 1;
    if (this.supplyTicks % 8 !== 0) return;

    this.applyRoleBenefits();
    const crewCount = scene.getCrewCount();
    const foodNeeded = Math.max(1, Math.ceil(crewCount / 2));
    const waterNeeded = Math.max(1, Math.ceil(crewCount / 2));
    const foodTaken = this.consumeFood(foodNeeded);
    let waterTaken = Math.min(waterNeeded, scene.waterReserve);
    scene.waterReserve -= waterTaken;
    if (waterTaken < waterNeeded && scene.hasFlask && scene.flaskWater > 0) {
      const flaskTaken = Math.min(waterNeeded - waterTaken, scene.flaskWater);
      scene.flaskWater -= flaskTaken;
      waterTaken += flaskTaken;
    }

    if (foodTaken < foodNeeded || waterTaken < waterNeeded) {
      const survivorSupport = Math.min(3, this.countRole("survivor"));
      scene.stats.morale = Math.max(0, scene.stats.morale - Math.max(1, 4 - survivorSupport));
      const missing = [
        foodTaken < foodNeeded ? "yiyecek" : "",
        waterTaken < waterNeeded ? "su" : ""
      ].filter(Boolean).join(" ve ");
      scene.logEvent(`Tayfanin ${missing} ihtiyaci karsilanamadi. Moral dusuyor.`, "warn");
    } else {
      scene.stats.morale = Math.min(100, scene.stats.morale + 1);
    }
  }

  consumeFood(amount) {
    const inventory = this.scene.inventory;
    const foodSources = [
      { key: "cookedSharkMeat", value: 3 },
      { key: "cookedFish", value: 1 },
      { key: "cookedMeat", value: 1 },
      { key: "fruit", value: 1 },
      { key: "food", value: 1 }
    ];
    let remaining = amount;

    foodSources.forEach(({ key, value }) => {
      if (remaining <= 0) return;
      const taken = Math.min(Math.ceil(remaining / value), inventory[key] ?? 0);
      inventory[key] = Math.max(0, (inventory[key] ?? 0) - taken);
      remaining -= taken * value;
    });

    return Math.min(amount, amount - Math.max(0, remaining));
  }

  applyRoleBenefits() {
    const scene = this.scene;
    const fishers = this.countRole("fisher");
    const handymen = this.countRole("handyman");
    if (fishers > 0 && scene.canStore(1)) {
      const catchAmount = fishers * 2 + (Phaser.Math.Between(1, 100) <= Math.min(70, fishers * 30) ? 1 : 0);
      const stored = Math.min(catchAmount, scene.getCarryCapacity() - scene.getInventoryLoad());
      scene.inventory.fish += stored;
      if (stored > 0) scene.logEvent(`Balikci tayfa ${stored} balik yakaladi.`, "good");
    }
    if (handymen > 0 && scene.raftIntegrity < 100) {
      scene.raftIntegrity = Math.min(100, scene.raftIntegrity + Math.min(2, handymen));
    }
  }

  countRole(role) {
    return this.scene.crew.filter((member) => member.role === role).length;
  }

  assignRole(memberId, role) {
    const roleDefinition = CREW_ROLES.find((entry) => entry.key === role);
    const member = this.scene.crew.find((entry) => entry.id === memberId);
    if (!member || !roleDefinition) return false;
    member.role = roleDefinition.key;
    member.roleLabel = roleDefinition.label;
    this.scene.notify(`${member.name} artik ${roleDefinition.label}.`, this.scene.playerRoot.x, this.scene.playerRoot.y - 70, "#bff4c7", "good");
    this.scene.updateHud();
    return true;
  }

  getLookoutBonus() {
    return this.countRole("lookout") * 110;
  }

  getSafeCrewName(name = null, seed = 0) {
    const trimmed = String(name ?? "").trim();
    const firstName = trimmed.split(/\s+/)[0] ?? "";
    if (trimmed && !TURKISH_NAME_PATTERN.test(firstName)) return trimmed.slice(0, 32);
    if (!Number.isFinite(seed) || seed === 0) return Phaser.Utils.Array.GetRandom(CREW_NAMES);
    return CREW_NAMES[Math.abs(seed) % CREW_NAMES.length];
  }
}
