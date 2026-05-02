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

export type GroundDecalKind =
  | 'plaza'
  | 'tile_patch'
  | 'feed_mark'
  | 'score_mark'
  | 'impact_mark'
  | 'crowd_spot'
  | 'danger_stripe'
  | 'tire'
  | 'stain'
  | 'shadow_patch'
  | 'lot_frame'
  | 'shop_stripe'
  | 'planter'
  | 'curb_line'
  | 'crosswalk'
  | 'parking_stall'
  | 'lane_mark'
  | 'road_end_cap'
  | 'junction_pad'
  | 'facade_row'
  | 'frontage_pad'
  | 'driveway'
  | 'curb_corner';

export interface GroundDecal {
  kind: GroundDecalKind;
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  alpha?: number;
}

export type RoadSurfaceKind = 'road' | 'sidewalk' | 'junction';
export type RoadSurfaceClass = 'avenue' | 'street' | 'lane';
export type RoadSurfaceOrientation = 'h' | 'v';

export interface RoadSurface {
  kind: RoadSurfaceKind;
  x: number;
  y: number;
  w: number;
  h: number;
  cls: RoadSurfaceClass;
  orientation?: RoadSurfaceOrientation;
}

export type RoadDecalKind = 'curb' | 'lane_mark' | 'crosswalk' | 'endpoint_cap';

export interface RoadDecal {
  kind: RoadDecalKind;
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  alpha?: number;
  cls?: RoadSurfaceClass;
}

export interface PrePlacedHumanDef {
  x: number;
  y: number;
  rewardKind?: 'runner' | 'crowd' | 'vip' | 'marshal';
  value?: number;
}

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
  groundDecals: GroundDecal[];
  roadSurfaces: RoadSurface[];
  roadDecals: RoadDecal[];
  prePlacedHumans: PrePlacedHumanDef[];
  clusters?: SemanticCluster[];
}

export interface StageDef extends StageConfig {
  name: string;
  nameEn: string;
  bgTop: readonly [number, number, number];
  bgBottom: readonly [number, number, number];
}

const BG_TOP = [0.13, 0.18, 0.28] as const;
const BG_BOTTOM = [0.07, 0.06, 0.07] as const;

export const STAGES: StageDef[] = [
  {
    level: 1,
    name: 'WRECK SPRINT',
    nameEn: 'WRECK SPRINT',
    buildings: [],
    bumpers: [],
    furniture: [],
    vehicles: [],
    grounds: [],
    prePlacedHumans: [],
    bgTop: BG_TOP,
    bgBottom: BG_BOTTOM,
    bgTopR: BG_TOP[0], bgTopG: BG_TOP[1], bgTopB: BG_TOP[2],
    bgBottomR: BG_BOTTOM[0], bgBottomG: BG_BOTTOM[1], bgBottomB: BG_BOTTOM[2],
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

export function chunkInfoFor(chunkId: number): { stageIndex: number; localIndex: number; stage: StageDef; finished: boolean } {
  return { stageIndex: 0, localIndex: chunkId, stage: STAGES[0], finished: chunkId >= TOTAL_CHUNKS };
}

function cellGround(kind: RaceCellKind, col: number, globalRow: number): GroundType {
  if (kind === 'empty') {
    const variants: GroundType[] = ['asphalt', 'concrete', 'residential_tile', 'grass'];
    return variants[Math.abs(globalRow + col * 2) % variants.length];
  }
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

function addFurniture(out: FurnitureDef[], type: FurnitureType, x: number, y: number, dx = 0, dy = 0): void {
  out.push({ type, x: x + dx, y: y + dy });
}

function addHumans(out: Array<{ x: number; y: number }>, x: number, y: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const a = i * 2.399963229728653;
    const r = 8 + (i % 4) * 4;
    out.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
  }
}

function decorateEmpty(out: ChunkData, x: number, centerY: number, col: number, globalRow: number): void {
  const variant = Math.abs(globalRow * 3 + col) % 5;
  if (variant === 0) {
    addFurniture(out.furniture, 'tree', x, centerY, -22, 18);
    addFurniture(out.furniture, 'bush', x, centerY, 18, -18);
    addFurniture(out.furniture, 'bench', x, centerY, 0, -8);
  } else if (variant === 1) {
    addFurniture(out.furniture, 'wood_fence', x, centerY, -28, -24);
    addFurniture(out.furniture, 'wood_fence', x, centerY, 28, -24);
    addFurniture(out.furniture, 'potted_plant', x, centerY, -8, 12);
    addFurniture(out.furniture, 'mailbox', x, centerY, 18, 10);
  } else if (variant === 2) {
    addFurniture(out.furniture, 'street_lamp', x, centerY, -28, 22);
    addFurniture(out.furniture, 'bicycle_rack', x, centerY, 22, -12);
    addHumans(out.prePlacedHumans, x, centerY, 2);
  } else if (variant === 3) {
    addFurniture(out.furniture, 'flower_bed', x, centerY, -18, -14);
    addFurniture(out.furniture, 'flower_bed', x, centerY, 18, 12);
    addFurniture(out.furniture, 'sakura_tree', x, centerY, 0, 28);
  } else {
    addFurniture(out.furniture, 'power_pole', x, centerY, -32, 24);
    addFurniture(out.furniture, 'garbage', x, centerY, 24, -20);
    addFurniture(out.furniture, 'cat', x, centerY, 2, 4);
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
  out.grounds.push({ type: cellGround(kind, col, globalRow), x, y: centerY, w: RACE_CELL_W, h: RACE_CELL_H });

  if (kind === 'empty') {
    decorateEmpty(out, x, centerY, col, globalRow);
    return;
  }

  switch (kind) {
    case 'light':
      addBuilding(out.buildings, globalRow % 2 === 0 ? 'house' : 'townhouse', x, centerY, blockIdx, -10, -2);
      addFurniture(out.furniture, 'wood_fence', x, centerY, -30, -24);
      addFurniture(out.furniture, 'potted_plant', x, centerY, 14, -18);
      addFurniture(out.furniture, 'mailbox', x, centerY, 26, -12);
      addFurniture(out.furniture, 'tree', x, centerY, 26, 24);
      addHumans(out.prePlacedHumans, x, centerY + 4, 4);
      break;
    case 'fuel':
      addBuilding(out.buildings, globalRow < 8 ? 'convenience' : 'train_station', x, centerY, blockIdx);
      addFurniture(out.furniture, 'vending', x, centerY, -28, -18);
      addFurniture(out.furniture, 'sign_board', x, centerY, 24, -14);
      addFurniture(out.furniture, 'bicycle_rack', x, centerY, -20, 18);
      addFurniture(out.furniture, 'a_frame_sign', x, centerY, 20, 18);
      addHumans(out.prePlacedHumans, x, centerY + 6, 14);
      break;
    case 'boost':
      addBuilding(out.buildings, 'bus_terminal_shelter', x, centerY, blockIdx);
      addFurniture(out.furniture, 'banner_pole', x, centerY, -30, 20);
      addFurniture(out.furniture, 'banner_pole', x, centerY, 30, 20);
      addFurniture(out.furniture, 'traffic_cone', x, centerY, -18, -18);
      addFurniture(out.furniture, 'traffic_cone', x, centerY, 18, -18);
      addHumans(out.prePlacedHumans, x, centerY, 5);
      break;
    case 'gas':
      // Make adjacent gas cells read as one gas-station complex: left = building, right = yard/details.
      if (col === 0 || RACE_COURSE[globalRow]?.[col - 1] !== 'gas') {
        addBuilding(out.buildings, 'gas_station', x, centerY, blockIdx);
        addFurniture(out.furniture, 'sign_board', x, centerY, 24, 20);
      } else {
        addBuilding(out.buildings, 'garage', x, centerY, blockIdx, -10, 2);
        addFurniture(out.furniture, 'car', x, centerY, 18, -8);
      }
      addFurniture(out.furniture, 'gas_canister', x, centerY, -26, -18);
      addFurniture(out.furniture, 'fire_extinguisher', x, centerY, 26, -18);
      addFurniture(out.furniture, 'traffic_cone', x, centerY, -10, 20);
      addFurniture(out.furniture, 'traffic_cone', x, centerY, 10, 20);
      addHumans(out.prePlacedHumans, x, centerY, 4);
      break;
    case 'dense':
      addBuilding(out.buildings, 'shop', x, centerY, blockIdx, -20, -8);
      addBuilding(out.buildings, 'ramen', x, centerY, blockIdx, 8, -2);
      addBuilding(out.buildings, 'house', x, centerY, blockIdx, 24, 24);
      addFurniture(out.furniture, 'noren', x, centerY, -20, -22);
      addFurniture(out.furniture, 'chouchin', x, centerY, 0, -22);
      addFurniture(out.furniture, 'vending', x, centerY, 28, -12);
      addFurniture(out.furniture, 'street_lamp', x, centerY, -30, 24);
      addHumans(out.prePlacedHumans, x, centerY + 6, 10);
      break;
    case 'score':
      addBuilding(out.buildings, globalRow > 17 ? 'tower' : 'apartment_tall', x, centerY, blockIdx);
      addFurniture(out.furniture, 'street_lamp', x, centerY, -28, -22);
      addFurniture(out.furniture, 'street_lamp', x, centerY, 28, -22);
      addFurniture(out.furniture, 'bench', x, centerY, 0, 26);
      addHumans(out.prePlacedHumans, x, centerY + 8, 9);
      break;
    case 'hazard':
      addBuilding(out.buildings, 'parking', x, centerY, blockIdx);
      addFurniture(out.furniture, 'traffic_cone', x, centerY, -28, -22);
      addFurniture(out.furniture, 'traffic_cone', x, centerY, 28, -22);
      addFurniture(out.furniture, 'sandbags', x, centerY, 0, 20);
      addFurniture(out.furniture, 'electric_box', x, centerY, 24, 18);
      break;
    case 'recovery':
      addBuilding(out.buildings, 'cafe', x, centerY, blockIdx);
      addFurniture(out.furniture, 'parasol', x, centerY, -24, 18);
      addFurniture(out.furniture, 'bench', x, centerY, 18, 16);
      addFurniture(out.furniture, 'potted_plant', x, centerY, -18, -16);
      addFurniture(out.furniture, 'flower_bed', x, centerY, 22, -16);
      addHumans(out.prePlacedHumans, x, centerY + 8, 12);
      break;
    case 'goal':
      if (col === 1) {
        addBuilding(out.buildings, 'castle', 0, centerY, blockIdx);
        addFurniture(out.furniture, 'banner_pole', x, centerY, -38, 26);
        addFurniture(out.furniture, 'banner_pole', x + 90, centerY, 38, 26);
        addHumans(out.prePlacedHumans, 0, centerY - 20, 18);
      }
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
    groundDecals: [],
    roadSurfaces: [],
    roadDecals: [],
    prePlacedHumans: [],
    clusters: [],
  };

  for (let localRow = 0; localRow < RACE_ROWS_PER_CHUNK; localRow++) {
    const globalRow = chunkId * RACE_ROWS_PER_CHUNK + localRow;
    const row = RACE_COURSE[globalRow];
    if (!row) continue;
    for (let col = 0; col < RACE_COLS; col++) buildCell(row[col], col, globalRow, localRow, baseY, chunkId, out);
  }

  // Keep only chunk-boundary roads. Internal 90px cell borders remain logical, not visual roads.
  out.horizontalRoads.push({ cy: baseY, h: 4, xMin: C.WORLD_MIN_X, xMax: C.WORLD_MAX_X, cls: 'street' });
  if (chunkId % 3 === 0) {
    out.verticalRoads.push({ cx: 0, w: 4, yMin: baseY, yMax: baseY + RACE_ROWS_PER_CHUNK * RACE_CELL_H, cls: 'avenue' });
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
    groundDecals: [],
    roadSurfaces: [],
    roadDecals: [],
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
