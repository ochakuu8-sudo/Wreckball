import * as C from './constants';
import type { FurnitureType, VehicleType } from './entities';
import type { GroundType } from './scenes';
import type { Intersection } from './grid';

export interface BuildingDef {
  x: number;
  y: number;
  size: C.BuildingSize;
  blockIdx?: number;
}

export interface BumperDef { x: number; y: number; }

export interface FurnitureDef {
  type: FurnitureType;
  x: number;
  y: number;
  hp?: number;
  score?: number;
}

export interface VehicleDef {
  type: VehicleType;
  lane: 'hilltop' | 'main' | 'lower' | 'riverside';
  direction: 1 | -1;
  speed: number;
  interval: number;
}

export interface GroundTile {
  type: GroundType;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PrePlacedHumanDef { x: number; y: number; }

export interface ScenePlacement {
  buildings: BuildingDef[];
  furniture: FurnitureDef[];
  grounds?: GroundTile[];
  humans?: PrePlacedHumanDef[];
}

export interface StageConfig {
  level: number;
  buildings: BuildingDef[];
  bumpers: BumperDef[];
  furniture: FurnitureDef[];
  vehicles: VehicleDef[];
  grounds: GroundTile[];
  prePlacedHumans: Array<{ x: number; y: number }>;
  bgTopR: number; bgTopG: number; bgTopB: number;
  bgBottomR: number; bgBottomG: number; bgBottomB: number;
}

export interface Block {
  id: number;
  xMin: number;
  xMax: number;
  baseY: number;
  pool: C.BuildingSize[];
}
export const BLOCKS: Block[] = [];

export interface ChunkRoad { y: number; h: number; }

export interface ResolvedHorizontalRoad {
  cy: number;
  h: number;
  xMin: number;
  xMax: number;
  cls: 'avenue' | 'street';
}

export interface ResolvedVerticalRoad {
  cx: number;
  w: number;
  yMin: number;
  yMax: number;
  cls: 'avenue' | 'street';
}

export interface ChunkSpecialArea {
  type: 'park' | 'parking_lot';
  y: number;
  h: number;
}

export type ClusterRole = 'hero' | 'ambient';
export type ClusterCell = 'NW' | 'NE' | 'SW' | 'SE' | 'merged';
export type BRef = { kind: 'b'; i: number };
export type FRef = { kind: 'f'; i: number };
export type Ref = BRef | FRef;

export interface SemanticCluster {
  id: string;
  role: ClusterRole;
  cell: ClusterCell;
  focal: Ref;
  companions?: Ref[];
  boundary?: Ref[];
  access?: Ref[];
  livingTrace?: Ref;
  handoffTo?: 'next' | 'prev';
}

export interface ChunkData {
  chunkId: number;
  baseY: number;
  stageIndex: number;
  roads: ChunkRoad[];
  horizontalRoads: ResolvedHorizontalRoad[];
  verticalRoads: ResolvedVerticalRoad[];
  intersections: Intersection[];
  buildings: BuildingDef[];
  furniture: FurnitureDef[];
  specialAreas: ChunkSpecialArea[];
  grounds: GroundTile[];
  prePlacedHumans: Array<{ x: number; y: number }>;
  clusters?: SemanticCluster[];
}

export interface StageDef {
  name: string;
  bgTopR: number; bgTopG: number; bgTopB: number;
  bgBottomR: number; bgBottomG: number; bgBottomB: number;
}

export const STAGES: StageDef[] = [
  {
    name: 'WRECK SPRINT',
    bgTopR: 0.13, bgTopG: 0.18, bgTopB: 0.28,
    bgBottomR: 0.07, bgBottomG: 0.06, bgBottomB: 0.07,
  },
];

export function getStage(stageIndex: number): StageDef {
  return STAGES[Math.max(0, Math.min(STAGES.length - 1, stageIndex))];
}

export type RaceCellKind =
  | 'empty'
  | 'light'
  | 'fuel'
  | 'boost'
  | 'gas'
  | 'dense'
  | 'score'
  | 'hazard'
  | 'recovery'
  | 'goal';

const RACE_CELL_W = 90;
const RACE_CELL_H = 90;
const RACE_COLS = 4;
const RACE_ROWS_PER_CHUNK = 2;
const RACE_X = [-135, -45, 45, 135] as const;

const RACE_COURSE: RaceCellKind[][] = [
  ['empty', 'empty', 'empty', 'empty'],
  ['light', 'empty', 'empty', 'light'],
  ['empty', 'fuel',  'empty', 'light'],
  ['gas',   'gas',   'empty', 'empty'],
  ['empty', 'empty', 'recovery', 'empty'],
  ['light', 'light', 'empty', 'light'],
  ['empty', 'boost', 'empty', 'empty'],
  ['fuel',  'empty', 'empty', 'hazard'],
  ['empty', 'gas',   'gas',   'empty'],
  ['dense', 'empty', 'empty', 'dense'],
  ['empty', 'empty', 'empty', 'empty'],
  ['light', 'light', 'empty', 'fuel'],
  ['empty', 'boost', 'boost', 'empty'],
  ['hazard','empty', 'empty', 'score'],
  ['empty', 'empty', 'fuel',  'empty'],
  ['gas',   'gas',   'empty', 'empty'],
  ['dense', 'dense', 'empty', 'boost'],
  ['recovery', 'empty', 'empty', 'recovery'],
  ['empty', 'score', 'score', 'empty'],
  ['empty', 'goal',  'goal',  'empty'],
];

export const TOTAL_CHUNKS = Math.ceil(RACE_COURSE.length / RACE_ROWS_PER_CHUNK);

export function chunkInfoFor(chunkId: number): { stageIndex: number; localIndex: number; stage: StageDef } {
  return { stageIndex: 0, localIndex: chunkId, stage: STAGES[0] };
}

function cellGround(kind: RaceCellKind): GroundType {
  switch (kind) {
    case 'fuel': return 'tile';
    case 'boost': return 'steel_plate';
    case 'gas': return 'oil_stained_concrete';
    case 'dense': return 'concrete';
    case 'score': return 'stone_pavement';
    case 'hazard': return 'hazard_stripe';
    case 'recovery': return 'wood_deck';
    case 'goal': return 'red_carpet';
    case 'light': return 'residential_tile';
    default: return 'asphalt';
  }
}

function addBuilding(
  out: BuildingDef[],
  size: C.BuildingSize,
  x: number,
  centerY: number,
  blockIdx: number,
  dx = 0,
  dy = 0
): void {
  const def = C.BUILDING_DEFS[size];
  out.push({ x: x + dx, y: centerY - def.h / 2 + dy, size, blockIdx });
}

function addHumans(out: Array<{ x: number; y: number }>, x: number, y: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const a = i * 2.399963229728653;
    const r = 8 + (i % 4) * 4;
    out.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
  }
}

function buildCell(
  kind: RaceCellKind,
  col: number,
  globalRow: number,
  localRow: number,
  chunkBaseY: number,
  blockIdx: number,
  out: ChunkData
): void {
  const x = RACE_X[col];
  const cellBottom = chunkBaseY + localRow * RACE_CELL_H;
  const centerY = cellBottom + RACE_CELL_H / 2;
  out.grounds.push({ type: cellGround(kind), x, y: centerY, w: RACE_CELL_W, h: RACE_CELL_H });

  if (kind === 'empty') return;

  switch (kind) {
    case 'light':
      addBuilding(out.buildings, globalRow % 2 === 0 ? 'house' : 'townhouse', x, centerY, blockIdx);
      addHumans(out.prePlacedHumans, x, centerY + 4, 3);
      break;
    case 'fuel':
      addBuilding(out.buildings, globalRow < 8 ? 'convenience' : 'train_station', x, centerY, blockIdx);
      addHumans(out.prePlacedHumans, x, centerY + 6, 12);
      break;
    case 'boost':
      addBuilding(out.buildings, 'bus_terminal_shelter', x, centerY, blockIdx);
      addHumans(out.prePlacedHumans, x, centerY, 4);
      break;
    case 'gas':
      addBuilding(out.buildings, 'gas_station', x, centerY, blockIdx);
      addHumans(out.prePlacedHumans, x, centerY, 3);
      break;
    case 'dense':
      addBuilding(out.buildings, 'shop', x, centerY, blockIdx, -18, -8);
      addBuilding(out.buildings, 'ramen', x, centerY, blockIdx, 12, 0);
      addBuilding(out.buildings, 'house', x, centerY, blockIdx, 24, 24);
      addHumans(out.prePlacedHumans, x, centerY + 6, 8);
      break;
    case 'score':
      addBuilding(out.buildings, globalRow > 17 ? 'tower' : 'apartment_tall', x, centerY, blockIdx);
      addHumans(out.prePlacedHumans, x, centerY + 8, 8);
      break;
    case 'hazard':
      addBuilding(out.buildings, 'parking', x, centerY, blockIdx);
      break;
    case 'recovery':
      addBuilding(out.buildings, 'cafe', x, centerY, blockIdx);
      addHumans(out.prePlacedHumans, x, centerY + 8, 10);
      break;
    case 'goal':
      if (col === 1) addBuilding(out.buildings, 'castle', 0, centerY, blockIdx);
      break;
  }
}

export function generateChunk(chunkId: number): ChunkData {
  const baseY = C.WORLD_MAX_Y + chunkId * C.CHUNK_HEIGHT;
  const info = chunkInfoFor(chunkId);
  const out: ChunkData = {
    chunkId,
    baseY,
    stageIndex: info.stageIndex,
    roads: [],
    horizontalRoads: [],
    verticalRoads: [],
    intersections: [],
    buildings: [],
    furniture: [],
    specialAreas: [],
    grounds: [],
    prePlacedHumans: [],
    clusters: [],
  };

  for (let localRow = 0; localRow < RACE_ROWS_PER_CHUNK; localRow++) {
    const globalRow = chunkId * RACE_ROWS_PER_CHUNK + localRow;
    const row = RACE_COURSE[globalRow];
    if (!row) continue;
    for (let col = 0; col < RACE_COLS; col++) buildCell(row[col], col, globalRow, localRow, baseY, chunkId, out);
  }

  for (let localRow = 0; localRow <= RACE_ROWS_PER_CHUNK; localRow++) {
    const y = baseY + localRow * RACE_CELL_H;
    out.horizontalRoads.push({ cy: y, h: 6, xMin: C.WORLD_MIN_X, xMax: C.WORLD_MAX_X, cls: 'street' });
  }
  for (const x of [-90, 0, 90]) {
    out.verticalRoads.push({ cx: x, w: 6, yMin: baseY, yMax: baseY + RACE_ROWS_PER_CHUNK * RACE_CELL_H, cls: x === 0 ? 'avenue' : 'street' });
  }
  return out;
}

export function placeCity(): ScenePlacement {
  const out: ScenePlacement = { buildings: [], furniture: [], grounds: [], humans: [] };
  const startRows: RaceCellKind[][] = [
    ['empty', 'empty', 'empty', 'empty'],
    ['light', 'empty', 'fuel', 'light'],
    ['empty', 'gas', 'gas', 'empty'],
    ['recovery', 'empty', 'empty', 'boost'],
  ];
  const originY = -80;
  const chunk: ChunkData = {
    chunkId: -1,
    baseY: originY,
    stageIndex: 0,
    roads: [],
    horizontalRoads: [],
    verticalRoads: [],
    intersections: [],
    buildings: out.buildings,
    furniture: out.furniture,
    specialAreas: [],
    grounds: out.grounds!,
    prePlacedHumans: out.humans!,
    clusters: [],
  };
  startRows.forEach((row, rowIndex) => {
    row.forEach((kind, col) => buildCell(kind, col, rowIndex, rowIndex, originY, -1, chunk));
  });
  return out;
}

export function getInitialCityRoadData(): {
  horizontalRoads: ResolvedHorizontalRoad[];
  verticalRoads: ResolvedVerticalRoad[];
  intersections: Intersection[];
} {
  return { horizontalRoads: [], verticalRoads: [], intersections: [] };
}
