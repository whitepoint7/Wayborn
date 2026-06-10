import Phaser from "phaser";
import { CONTRACT_POOL } from "../data/contracts.js";

export class ContractSystem {
  constructor(scene, { worldSize }) {
    this.scene = scene;
    this.worldSize = worldSize;
  }

  ensure(contracts) {
    const normalized = this.normalize(contracts);
    this.ensureTutorialContract(normalized);
    while (normalized.length < 3) {
      normalized.push(this.generate(normalized.map((contract) => contract.id)));
    }
    return normalized;
  }

  ensureTutorialContract(contracts) {
    if (this.scene.getActiveQuest()?.id !== "learn-contracts") return;
    const tutorial = CONTRACT_POOL.find((contract) => contract.id === "tutorial_branch_order");
    if (!tutorial || contracts.some((contract) => contract.id === tutorial.id)) return;
    contracts.unshift(this.clone(tutorial));
    if (contracts.length > 3) contracts.length = 3;
  }

  normalize(contracts) {
    if (!Array.isArray(contracts)) return [];
    return contracts
      .map((contract) => {
        const template = CONTRACT_POOL.find((candidate) => candidate.id === contract?.id);
        const accepted = Object.prototype.hasOwnProperty.call(contract ?? {}, "accepted") ? Boolean(contract.accepted) : Boolean(contract?.origin);
        return template ? this.clone(template, contract?.origin, accepted) : null;
      })
      .filter(Boolean)
      .filter((contract, index, list) => list.findIndex((candidate) => candidate.id === contract.id) === index)
      .slice(0, 3);
  }

  generate(excludedIds = []) {
    const candidates = CONTRACT_POOL.filter((contract) => !contract.tutorial && !excludedIds.includes(contract.id));
    const pool = candidates.length ? candidates : CONTRACT_POOL;
    const totalWeight = pool.reduce((sum, contract) => sum + contract.weight, 0);
    let roll = Phaser.Math.Between(1, totalWeight);
    const selected = pool.find((contract) => {
      roll -= contract.weight;
      return roll <= 0;
    }) ?? pool[0];
    return this.clone(selected);
  }

  clone(contract, origin = null, accepted = false) {
    return {
      id: contract.id,
      title: contract.title,
      detail: contract.detail,
      need: { ...contract.need },
      reward: { ...contract.reward },
      origin: this.normalizeOrigin(origin),
      accepted: Boolean(accepted)
    };
  }

  getPortOrigin(port) {
    if (!port) return null;
    return this.normalizeOrigin({
      x: port.x,
      y: port.y,
      name: port.meta?.name ?? "Kucuk Liman"
    });
  }

  normalizeOrigin(origin) {
    if (!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) return null;
    return {
      x: Phaser.Math.Clamp(Number(origin.x), -this.worldSize / 2, this.worldSize / 2),
      y: Phaser.Math.Clamp(Number(origin.y), -this.worldSize / 2, this.worldSize / 2),
      name: String(origin.name || "Kucuk Liman").slice(0, 32)
    };
  }

  canComplete(contract) {
    const scene = this.scene;
    return contract?.accepted &&
      this.isAtOrigin(contract) &&
      Object.entries(contract.need ?? {}).every(([key, amount]) => (scene.inventory[key] ?? 0) >= amount);
  }

  isAtOrigin(contract) {
    const scene = this.scene;
    if (!contract?.origin || !scene.currentPort) return true;
    return Phaser.Math.Distance.Between(scene.currentPort.x, scene.currentPort.y, contract.origin.x, contract.origin.y) < 80;
  }

  getCompassTarget() {
    const scene = this.scene;
    if (!scene.hasCompass || !scene.portContracts?.length) return null;
    const targets = scene.portContracts
      .filter((contract) => contract.accepted)
      .map((contract) => contract.origin)
      .filter((origin) => origin && Number.isFinite(origin.x) && Number.isFinite(origin.y))
      .filter((origin, index, list) => list.findIndex((candidate) => Math.round(candidate.x) === Math.round(origin.x) && Math.round(candidate.y) === Math.round(origin.y)) === index)
      .map((origin) => ({
        ...origin,
        distance: Phaser.Math.Distance.Between(scene.playerRoot.x, scene.playerRoot.y, origin.x, origin.y)
      }))
      .filter((origin) => origin.distance > 180);
    if (!targets.length) return null;
    targets.sort((a, b) => a.distance - b.distance);
    return { ...targets[0], label: "Kontrat" };
  }
}

export { CONTRACT_POOL };
