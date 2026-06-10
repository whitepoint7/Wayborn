import Phaser from "phaser";

export class RaftSystem {
  constructor(scene, { moduleTypes, maxColumns, maxRows }) {
    this.scene = scene;
    this.moduleTypes = moduleTypes;
    this.maxColumns = maxColumns;
    this.maxRows = maxRows;
  }

  getBeamTiles(tiles = this.scene.raftTiles) {
    return tiles.filter((tile) => tile.beamHp > 0);
  }

  getBuildCandidates() {
    const occupied = new Set(this.scene.raftTiles.map((tile) => this.scene.tileKey(tile.x, tile.y)));
    const adjacent = new Set();
    const candidates = new Map();
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];

    this.scene.raftTiles.forEach((tile) => {
      directions.forEach((dir) => {
        const x = tile.x + dir.x;
        const y = tile.y + dir.y;
        adjacent.add(this.scene.tileKey(x, y));
      });
    });

    this.getBeamTiles().forEach((beam) => {
      for (let y = beam.y - 1; y <= beam.y + 1; y += 1) {
        for (let x = beam.x - 1; x <= beam.x + 1; x += 1) {
          const key = this.scene.tileKey(x, y);
          if (!occupied.has(key) && adjacent.has(key) && this.isWithinBounds(x, y)) candidates.set(key, { x, y });
        }
      }
    });

    return Array.from(candidates.values()).sort((a, b) => Math.abs(a.x) + Math.abs(a.y) - (Math.abs(b.x) + Math.abs(b.y)));
  }

  getNetCandidates() {
    return this.scene.raftTiles.filter((tile) => !this.scene.isCenterTile(tile) && !(tile.netHp > 0) && !(tile.beamHp > 0));
  }

  getModuleCandidates() {
    return this.scene.raftTiles.filter((tile) => !this.scene.isStartingRaftTile(tile) && !tile.module);
  }

  getBeamCandidates() {
    return this.scene.raftTiles.filter((tile) => !(tile.beamHp > 0) && !(tile.netHp > 0));
  }

  getBeamMoveCandidates(source) {
    if (!(source?.beamHp > 0)) return [];
    return this.scene.raftTiles.filter((tile) => {
      if (tile === source || tile.beamHp > 0 || tile.netHp > 0 || !this.isWithinBounds(tile.x, tile.y)) return false;
      const movedTiles = this.scene.raftTiles.map((candidate) => {
        const moved = { ...candidate };
        if (candidate !== source) return moved;
        delete moved.beamHp;
        return moved;
      });
      const targetCopy = movedTiles.find((candidate) => candidate.x === tile.x && candidate.y === tile.y);
      targetCopy.beamHp = source.beamHp;
      return this.areTilesSupported(movedTiles);
    });
  }

  getModuleMoveCandidates(source) {
    return this.scene.raftTiles.filter((tile) => tile !== source && !this.scene.isStartingRaftTile(tile) && !tile.module);
  }

  getNetMoveCandidates(source) {
    return this.scene.raftTiles.filter((tile) => tile !== source && !this.scene.isCenterTile(tile) && !(tile.netHp > 0) && !(tile.beamHp > 0));
  }

  isWithinBounds(x, y) {
    const minX = -Math.floor(this.maxColumns / 2);
    const maxX = minX + this.maxColumns - 1;
    const minY = -Math.floor(this.maxRows / 2);
    const maxY = minY + this.maxRows - 1;
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }

  getTileLimit() {
    const supported = new Set(this.scene.raftTiles.map((tile) => this.scene.tileKey(tile.x, tile.y)));
    this.getBeamTiles().forEach((beam) => {
      for (let y = beam.y - 1; y <= beam.y + 1; y += 1) {
        for (let x = beam.x - 1; x <= beam.x + 1; x += 1) {
          supported.add(this.scene.tileKey(x, y));
        }
      }
    });
    return supported.size;
  }

  getMaxCells() {
    return this.maxColumns * this.maxRows;
  }

  getLoadCapacity() {
    return 9 + this.scene.raftTiles.length * 2.4 + this.getBeamTiles().length * 3.2;
  }

  getLoad() {
    const tileWeight = this.scene.raftTiles.length;
    const netWeight = this.scene.getActiveNetCount() * 0.35;
    const beamWeight = this.getBeamTiles().length * 0.75;
    const moduleWeight = this.scene.raftTiles.reduce(
      (sum, tile) => sum + (tile.module ? this.moduleTypes[tile.module]?.weight ?? 1.5 : 0),
      0
    );
    const cargoWeight = (this.scene.getInventoryLoad() + this.scene.getStorageLoad()) * 0.08;
    return tileWeight + netWeight + beamWeight + moduleWeight + cargoWeight;
  }

  getLoadRatio() {
    return this.getLoad() / this.getLoadCapacity();
  }

  getBurdenLabel() {
    const ratio = this.getLoadRatio();
    if (ratio < 0.55) return "hafif";
    if (ratio < 0.82) return "dengeli";
    if (ratio < 1.05) return "agir";
    return "asiri";
  }

  getMobilityFactor() {
    const sizeDrag = Phaser.Math.Clamp(1 - Math.max(0, this.scene.raftTiles.length - 6) * 0.018, 0.72, 1);
    const loadRatio = this.getLoadRatio();
    const loadDrag = loadRatio <= 0.65 ? 1 : Phaser.Math.Clamp(1 - (loadRatio - 0.65) * 0.55, 0.58, 1);
    const mastBonus = this.scene.hasMast ? 1.06 : 1;
    return Phaser.Math.Clamp(sizeDrag * loadDrag * mastBonus, 0.46, 1.08);
  }

  areTilesSupported(tiles = this.scene.raftTiles) {
    const beamTiles = tiles.filter((tile) => tile.beamHp > 0);
    return tiles.every((tile) => {
      if (this.scene.isStartingRaftTile(tile)) return true;
      return beamTiles.some((beam) => Math.abs(beam.x - tile.x) <= 1 && Math.abs(beam.y - tile.y) <= 1);
    });
  }

  isConnected(tiles = this.scene.raftTiles) {
    if (!tiles.length) return false;
    const center = tiles.find((tile) => this.scene.isCenterTile(tile));
    if (!center) return false;
    const tileMap = new Map(tiles.map((tile) => [this.scene.tileKey(tile.x, tile.y), tile]));
    const visited = new Set([this.scene.tileKey(center.x, center.y)]);
    const stack = [center];
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    while (stack.length) {
      const tile = stack.pop();
      directions.forEach((dir) => {
        const key = this.scene.tileKey(tile.x + dir.x, tile.y + dir.y);
        if (visited.has(key) || !tileMap.has(key)) return;
        visited.add(key);
        stack.push(tileMap.get(key));
      });
    }
    return visited.size === tiles.length;
  }

  getCrewCapacity() {
    return this.scene.raftTiles.reduce((sum, tile) => sum + (this.moduleTypes[tile.module]?.crewCapacity ?? 0), 0);
  }

  getModuleCapacity() {
    return Math.max(0, this.scene.raftTiles.length - 3);
  }
}
