import * as C from './constants';
import { Game as BaseGame } from './game';

interface RuntimeBuilding {
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
  blockIdx: number;
  size: C.BuildingSize;
}

interface RuntimeBuildingManager {
  buildings: RuntimeBuilding[];
  addBuilding(centerX: number, baseY: number, size: C.BuildingSize, blockIdx: number, generation: number): void;
  loadChunk(defs: Array<{ x: number; y: number; size: C.BuildingSize; blockIdx?: number }>): void;
}

interface RuntimeGame {
  buildings?: RuntimeBuildingManager;
  _spawnChunk?: (chunkId: number) => void;
  restart?: () => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const INFILL_XS = [-154, -128, -102, -76, 76, 102, 128, 154] as const;

const RESIDENTIAL_INFILL: readonly C.BuildingSize[] = [
  'house', 'townhouse', 'garage', 'shed', 'greenhouse', 'bungalow',
  'duplex', 'kominka', 'kura', 'chaya',
];

const MARKET_INFILL: readonly C.BuildingSize[] = [
  'shop', 'convenience', 'restaurant', 'cafe', 'bakery', 'bookstore',
  'pharmacy', 'ramen', 'izakaya', 'yatai', 'wagashi', 'sushi_ya',
];

const EDGE_INFILL: readonly C.BuildingSize[] = [
  'shed', 'garage', 'greenhouse', 'house', 'townhouse', 'cafe', 'yatai',
];

export class Game extends BaseGame {
  private readonly infilledBlocks = new Set<number>();

  constructor(canvas: HTMLCanvasElement, opts?: { screenshotMode?: boolean; screenshotChunkId?: number | null }) {
    super(canvas, opts);
    this.wrapChunkSpawning();
    this.wrapRestart();
    this.applyInfillToExistingBlocks();
  }

  private runtime(): RuntimeGame {
    return this as unknown as RuntimeGame;
  }

  private wrapChunkSpawning(): void {
    const runtime = this.runtime();
    const original = runtime._spawnChunk;
    if (typeof original !== 'function') return;

    const owner = this;
    runtime._spawnChunk = function patchedSpawnChunk(this: RuntimeGame, chunkId: number): void {
      original.call(this, chunkId);
      owner.addUrbanInfillToBlock(chunkId);
    };
  }

  private wrapRestart(): void {
    const runtime = this.runtime();
    const original = runtime.restart;
    if (typeof original !== 'function') return;

    const owner = this;
    runtime.restart = function patchedRestart(this: RuntimeGame): void {
      owner.infilledBlocks.clear();
      original.call(this);
      owner.applyInfillToExistingBlocks();
    };
  }

  private applyInfillToExistingBlocks(): void {
    const manager = this.runtime().buildings;
    if (!manager) return;
    const blockIds = new Set<number>();
    for (const building of manager.buildings) {
      if (Number.isFinite(building.blockIdx)) blockIds.add(building.blockIdx);
    }
    for (const blockIdx of [...blockIds].sort((a, b) => a - b)) {
      this.addUrbanInfillToBlock(blockIdx);
    }
  }

  private addUrbanInfillToBlock(blockIdx: number): void {
    if (this.infilledBlocks.has(blockIdx)) return;
    const manager = this.runtime().buildings;
    if (!manager) return;

    const bounds = bandBounds(blockIdx);
    const occupied = manager.buildings
      .filter((building) => building.active !== false)
      .map(rectFromBuilding);
    const reserved = reservedRectsForBlock(blockIdx, bounds.y0, bounds.y1);
    const additions: Array<{ x: number; y: number; size: C.BuildingSize; blockIdx: number }> = [];
    const maxBuildings = blockIdx < 0 ? 5 : 7;

    const candidates: Array<{ x: number; y: number; seed: number }> = [];
    let seedIndex = 0;
    for (let y = bounds.y0 + 30; y <= bounds.y1 - 18; y += 34) {
      for (const x of INFILL_XS) {
        const seed = blockIdx * 92821 + seedIndex * 137 + Math.floor(y * 3 + x * 5);
        candidates.push({
          x: x + jitter(seed, 11),
          y: y + jitter(seed + 17, 9),
          seed,
        });
        seedIndex += 1;
      }
    }

    candidates.sort((a, b) => hash(a.seed + 41) - hash(b.seed + 41));

    for (const candidate of candidates) {
      if (additions.length >= maxBuildings) break;
      const density = blockIdx < 0 ? 0.46 : 0.58;
      if (hash(candidate.seed + 5) > density) continue;

      const size = pickInfillBuilding(candidate.x, candidate.seed);
      const rect = rectForBuilding(candidate.x, candidate.y, size);
      if (!validInfillPlacement(rect, reserved, occupied)) continue;

      additions.push({ x: candidate.x, y: candidate.y, size, blockIdx });
      occupied.push(rect);
    }

    if (additions.length === 0) {
      this.infilledBlocks.add(blockIdx);
      return;
    }

    if (blockIdx >= 0) {
      manager.loadChunk(additions);
    } else {
      for (const addition of additions) {
        manager.addBuilding(addition.x, addition.y, addition.size, addition.blockIdx, 0);
      }
    }

    this.infilledBlocks.add(blockIdx);
  }
}

function bandBounds(blockIdx: number): { y0: number; y1: number } {
  if (blockIdx >= 0) {
    const y0 = C.WORLD_MAX_Y + blockIdx * C.CHUNK_HEIGHT + 10;
    return { y0, y1: y0 + C.CHUNK_HEIGHT - 20 };
  }
  const y0 = C.WORLD_MIN_Y + 10 + (blockIdx + 4) * C.CHUNK_HEIGHT + 10;
  return { y0, y1: y0 + C.CHUNK_HEIGHT - 20 };
}

function reservedRectsForBlock(blockIdx: number, y0: number, y1: number): Rect[] {
  const rects: Rect[] = [
    // Keep the main play lane readable and avoid closing the pinball route.
    { x: -56, y: y0 - 8, w: 112, h: y1 - y0 + 16 },
  ];

  if (blockIdx < 0 && y0 < C.WORLD_MIN_Y + 150) {
    rects.push({ x: -92, y: C.WORLD_MIN_Y - 8, w: 184, h: 138 });
  }

  return rects;
}

function rectFromBuilding(building: RuntimeBuilding): Rect {
  return {
    x: building.x - 5,
    y: building.y - 5,
    w: building.w + 10,
    h: building.h + 10,
  };
}

function rectForBuilding(centerX: number, baseY: number, size: C.BuildingSize): Rect {
  const def = C.BUILDING_DEFS[size];
  return {
    x: centerX - def.w / 2 - 5,
    y: baseY - 5,
    w: def.w + 10,
    h: def.h + 10,
  };
}

function validInfillPlacement(rect: Rect, reserved: readonly Rect[], occupied: readonly Rect[]): boolean {
  if (rect.x < C.WORLD_MIN_X + 3 || rect.x + rect.w > C.WORLD_MAX_X - 3) return false;
  if (reserved.some((zone) => rectsOverlap(rect, zone))) return false;
  if (occupied.some((zone) => rectsOverlap(rect, zone))) return false;
  return true;
}

function pickInfillBuilding(x: number, seed: number): C.BuildingSize {
  const edge = Math.abs(x) > 138;
  const pool = edge
    ? EDGE_INFILL
    : hash(seed + 23) < 0.52
      ? RESIDENTIAL_INFILL
      : MARKET_INFILL;
  return pool[Math.floor(hash(seed + 101) * pool.length)];
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function hash(seed: number): number {
  const v = Math.sin(seed * 91.721 + 17.13) * 43758.5453;
  return v - Math.floor(v);
}

function jitter(seed: number, amount: number): number {
  return (hash(seed) * 2 - 1) * amount;
}
