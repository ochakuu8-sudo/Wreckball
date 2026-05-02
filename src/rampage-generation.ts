import * as C from './constants';
import { getRampageBuildingProfile } from './rampage-building-profiles';
import {
  LANE_X,
  patternsForIntent,
  type BlockIntent,
  type BlockPattern,
  type PatternPlacement,
  type PlacementRole,
} from './rampage-patterns';

export interface BuildingSpawnDef {
  x: number;
  y: number;
  size: C.BuildingSize;
  blockIdx?: number;
  intent?: BlockIntent;
  role?: PlacementRole;
  patternId?: string;
}

export interface RampageGenerationContext {
  blockIdx: number;
  momentum: number;
  overdrive: boolean;
  combo: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SMALL_FALLBACK: C.BuildingSize[] = [
  'house', 'townhouse', 'garage', 'shed', 'shop', 'convenience',
  'restaurant', 'cafe', 'bakery', 'ramen', 'yatai',
];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function rectOverlapsAny(rect: Rect, zones: Rect[]): boolean {
  return zones.some((zone) => rectsOverlap(rect, zone));
}

function makeRect(x: number, y: number, size: C.BuildingSize): Rect {
  const def = C.BUILDING_DEFS[size];
  const profile = getRampageBuildingProfile(size);
  const pad =
    profile.klass === 'small' ? 7 :
    profile.klass === 'medium' ? 11 :
    profile.klass === 'large' ? 16 :
    22;
  return { x: x - def.w / 2 - pad, y: y - pad, w: def.w + pad * 2, h: def.h + pad * 2 };
}

function noBuildZones(baseY: number, bandHeight: number, blockIdx: number): Rect[] {
  const crossY = baseY + (blockIdx % 2 === 0 ? 62 : 138);
  return [
    { x: -56, y: baseY - 10, w: 112, h: bandHeight + 20 },
    { x: C.WORLD_MIN_X - 10, y: crossY - 24, w: C.WORLD_MAX_X - C.WORLD_MIN_X + 20, h: 48 },
  ];
}

function chooseBlockIntent(ctx: RampageGenerationContext): BlockIntent {
  if (ctx.overdrive) return 'cashout';
  if (ctx.momentum < 26) return 'recover';
  if (ctx.blockIdx > 0 && ctx.blockIdx % 6 === 0) return 'breather';
  if (ctx.combo >= 12 || ctx.momentum >= 72) return 'gate';
  return 'choice';
}

function choosePattern(intent: BlockIntent, blockIdx: number): BlockPattern {
  const options = patternsForIntent(intent);
  if (options.length === 0) return patternsForIntent('choice')[0];
  return options[Math.abs(blockIdx) % options.length];
}

function placePatternBuilding(
  baseY: number,
  bandHeight: number,
  blockIdx: number,
  pattern: BlockPattern,
  placement: PatternPlacement,
): BuildingSpawnDef {
  const size = pick(placement.sizes);
  const xJitter = placement.xJitter ?? 0;
  const yJitter = placement.yJitter ?? 0;
  return {
    x: LANE_X[placement.lane] + (placement.xOffset ?? 0) + rand(-xJitter, xJitter),
    y: baseY + placement.y * bandHeight + rand(-yJitter, yJitter),
    size,
    blockIdx,
    intent: pattern.intent,
    role: placement.role,
    patternId: pattern.id,
  };
}

function validPlacement(rect: Rect, reserved: Rect[], rects: Rect[], baseY: number, bandHeight: number): boolean {
  if (rect.x < C.WORLD_MIN_X + 4 || rect.x + rect.w > C.WORLD_MAX_X - 4) return false;
  if (rect.y < baseY - 8 || rect.y + rect.h > baseY + bandHeight + 8) return false;
  if (rectOverlapsAny(rect, reserved)) return false;
  if (rects.some((existing) => rectsOverlap(rect, existing))) return false;
  return true;
}

function shiftedCandidates(candidate: BuildingSpawnDef, bandHeight: number): BuildingSpawnDef[] {
  return [0, -bandHeight * 0.29, bandHeight * 0.29, -bandHeight * 0.46, bandHeight * 0.46]
    .map((yOffset) => ({ ...candidate, y: candidate.y + yOffset }));
}

function resolvePattern(
  baseY: number,
  bandHeight: number,
  blockIdx: number,
  pattern: BlockPattern,
): BuildingSpawnDef[] {
  const out: BuildingSpawnDef[] = [];
  const rects: Rect[] = [];
  const reserved = noBuildZones(baseY, bandHeight, blockIdx);

  for (const placement of pattern.placements) {
    let accepted: BuildingSpawnDef | null = null;
    for (let attempt = 0; attempt < 18; attempt++) {
      const candidate = placePatternBuilding(baseY, bandHeight, blockIdx, pattern, placement);
      for (const shifted of shiftedCandidates(candidate, bandHeight)) {
        const rect = makeRect(shifted.x, shifted.y, shifted.size);
        if (!validPlacement(rect, reserved, rects, baseY, bandHeight)) continue;
        accepted = shifted;
        rects.push(rect);
        break;
      }
      if (accepted) break;
    }
    if (accepted) out.push(accepted);
  }

  if (out.length < 2 && pattern.intent !== 'breather') {
    for (const x of [-145, 145]) {
      const size = pick(SMALL_FALLBACK);
      const y = baseY + rand(30, bandHeight - 45);
      const rect = makeRect(x, y, size);
      if (!validPlacement(rect, reserved, rects, baseY, bandHeight)) continue;
      out.push({ x, y, size, blockIdx, intent: 'recover', role: 'bank', patternId: 'fallback_bank' });
      rects.push(rect);
    }
  }

  return out;
}

export function generateInitialRampageCity(): BuildingSpawnDef[] {
  const out: BuildingSpawnDef[] = [];
  const bandHeight = C.CHUNK_HEIGHT;
  let baseY = C.WORLD_MIN_Y + 10;
  let blockIdx = -4;
  while (baseY < C.WORLD_MAX_Y - 20) {
    const ctx: RampageGenerationContext = {
      blockIdx,
      momentum: blockIdx < -2 ? 22 : 38,
      overdrive: false,
      combo: 0,
    };
    const intent = chooseBlockIntent(ctx);
    out.push(...resolvePattern(baseY, bandHeight, blockIdx, choosePattern(intent, blockIdx)));
    baseY += bandHeight;
    blockIdx++;
  }
  return out;
}

export function generateRampageBand(
  baseY: number,
  bandHeight: number,
  ctx: RampageGenerationContext,
): BuildingSpawnDef[] {
  const intent = chooseBlockIntent(ctx);
  const pattern = choosePattern(intent, ctx.blockIdx);
  return resolvePattern(baseY, bandHeight, ctx.blockIdx, pattern);
}
