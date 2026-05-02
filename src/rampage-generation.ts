import * as C from './constants';
import { getRampageBuildingProfile } from './rampage-building-profiles';
import type { FurnitureType } from './entities';
import type { HumanRewardKind } from './humans';
import type { BlockIntent, PlacementRole } from './rampage-patterns';
import type { GroundDecal, GroundTile, RoadDecal, RoadSurface } from './stages';

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

export interface RampageHumanSeed {
  x: number;
  y: number;
  rewardKind?: HumanRewardKind;
  value?: number;
}

export type LayoutMotifId =
  | 'feed_chain'
  | 'panic_plaza'
  | 'score_wall'
  | 'split_reward'
  | 'breaker_gate'
  | 'pinball_nest';

type CityBlockTemplateId =
  | 'shopping_street'
  | 'residential_lane'
  | 'downtown_crossing'
  | 'civic_plaza'
  | 'station_front'
  | 'construction_edge';

export interface RampageLayoutBand {
  motifId: LayoutMotifId;
  intent: BlockIntent;
  buildings: BuildingSpawnDef[];
  furniture: Array<{ type: FurnitureType; x: number; y: number }>;
  grounds: GroundTile[];
  groundDecals: GroundDecal[];
  roadSurfaces: RoadSurface[];
  roadDecals: RoadDecal[];
  humans: RampageHumanSeed[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BuildingSpec {
  x: number;
  y: number;
  size: C.BuildingSize;
  role: PlacementRole;
  intent: BlockIntent;
  motifId: LayoutMotifId;
  blockIdx: number;
  jitterX?: number;
  jitterY?: number;
}

type StreetRoadRole = 'main' | 'alley' | 'side' | 'service';
type StreetRoadClass = 'avenue' | 'street' | 'lane';
type StreetRoadEndpoint = 'through' | 'dead_end' | 'driveway' | 'plaza';
type RoadNodeKind = 'boundary' | 'turn' | 'junction' | 'terminal';

interface StreetRoadSegment {
  role: StreetRoadRole;
  orientation: 'h' | 'v';
  x: number;
  y: number;
  w: number;
  h: number;
  sidewalk: number;
  cls: StreetRoadClass;
  endpoint: StreetRoadEndpoint;
}

interface StreetIntersection {
  x: number;
  y: number;
  major: boolean;
  style: 'full' | 't' | 'simple' | 'turn';
}

interface RoadNode {
  id: string;
  x: number;
  y: number;
  kind: RoadNodeKind;
}

interface RoadEdge {
  id: string;
  from: RoadNode;
  to: RoadNode;
  role: StreetRoadRole;
  cls: StreetRoadClass;
  width: number;
  sidewalk: number;
  endpoint: StreetRoadEndpoint;
  mainPath: boolean;
}

interface RoadGraph {
  nodes: RoadNode[];
  edges: RoadEdge[];
  bottomX: number;
  topX: number;
}

interface StreetLayout {
  mainCorridorX: number;
  primaryY: number;
  secondaryY: number;
  sideStreetX: number;
  serviceStreetX: number;
  mainRoadH: number;
  mainWalkH: number;
  alleyH: number;
  alleyWalkH: number;
  sideStreetW: number;
  sideWalkW: number;
  serviceStreetW: number;
  serviceWalkW: number;
  alleyW: number;
  serviceHeightRatio: number;
  roads: StreetRoadSegment[];
  intersections: StreetIntersection[];
  junctions: StreetIntersection[];
  graph: RoadGraph;
}

type FrontageSide = 'north' | 'south' | 'east' | 'west' | 'center';
type CityParcelKind = 'shops' | 'homes' | 'towers' | 'civic' | 'station' | 'park' | 'construction';

interface FrontageSlot {
  x: number;
  y: number;
  pool: readonly C.BuildingSize[];
  role: PlacementRole;
  jitterX?: number;
  jitterY?: number;
  decor?: readonly FurnitureType[];
}

interface ParcelDecorPlan {
  decal:
    | 'frontage_pad'
    | 'driveway'
    | 'curb_corner'
    | 'plaza'
    | 'planter'
    | 'parking_stall'
    | 'danger_stripe'
    | 'facade_row'
    | 'shop_stripe';
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  alpha?: number;
}

interface CityParcel extends Rect {
  id: string;
  kind: CityParcelKind;
  frontageSide: FrontageSide;
  slots: FrontageSlot[];
  decor: ParcelDecorPlan[];
}

const SMALL_HOMES: readonly C.BuildingSize[] = [
  'house', 'townhouse', 'garage', 'shed', 'greenhouse', 'bungalow',
  'duplex', 'kominka', 'chaya', 'kura', 'dojo',
];

const SMALL_SHOPS: readonly C.BuildingSize[] = [
  'shop', 'convenience', 'restaurant', 'cafe', 'bakery', 'bookstore',
  'pharmacy', 'ramen', 'izakaya', 'yatai', 'wagashi', 'sushi_ya',
];

const SHOPPING_STREET_BUILDINGS: readonly C.BuildingSize[] = [
  'shotengai_arcade', 'shop', 'convenience', 'restaurant', 'cafe', 'bakery',
  'bookstore', 'ramen', 'izakaya', 'wagashi', 'sushi_ya',
];

const RELEASE_BUILDINGS: readonly C.BuildingSize[] = [
  'school', 'hospital', 'train_station', 'department_store',
  'bus_terminal_shelter', 'supermarket', 'game_center',
];

const STOPPER_BUILDINGS: readonly C.BuildingSize[] = [
  'apartment', 'supermarket', 'karaoke', 'pachinko', 'game_center',
  'bank', 'library', 'movie_theater', 'warehouse', 'shotengai_arcade',
];

const VAULT_BUILDINGS: readonly C.BuildingSize[] = [
  'office', 'apartment_tall', 'city_hall', 'business_hotel',
  'tower', 'skyscraper', 'stadium', 'ferris_wheel',
];

const PINBALL_BOUNCERS: readonly C.BuildingSize[] = [
  'bank', 'library', 'museum', 'parking', 'game_center',
  'supermarket', 'fountain_pavilion', 'train_station',
];

const CIVIC_BUILDINGS: readonly C.BuildingSize[] = [
  'post_office', 'library', 'museum', 'city_hall', 'clinic',
  'police_station', 'fire_station', 'train_station',
];

const DOWNTOWN_BUILDINGS: readonly C.BuildingSize[] = [
  'office', 'apartment_tall', 'business_hotel', 'department_store',
  'bank', 'movie_theater', 'pachinko', 'karaoke',
];

const MARKET_FURNITURE: readonly FurnitureType[] = [
  'a_frame_sign', 'shop_awning', 'noren', 'chouchin', 'vending',
  'kerbside_vending_pair', 'bicycle_rack', 'milk_crate_stack',
];

const RESIDENTIAL_FURNITURE: readonly FurnitureType[] = [
  'mailbox', 'post_letter_box', 'potted_plant', 'flower_planter_row',
  'wood_fence', 'ac_unit', 'gas_canister', 'laundry_pole',
];

const CIVIC_FURNITURE: readonly FurnitureType[] = [
  'bench', 'street_lamp', 'flag_pole', 'statue', 'flower_bed',
  'fountain_large', 'bicycle_row',
];

const DOWNTOWN_FURNITURE: readonly FurnitureType[] = [
  'street_lamp', 'bollard', 'guardrail_short', 'atm', 'newspaper_stand',
  'traffic_cone', 'electric_box', 'taxi_rank_sign',
];

const PREPLACED_HUMANS_PER_BAND = 9;
const GROUND_X = [-135, -45, 45, 135] as const;
type DistrictKind = 'market' | 'residential' | 'civic' | 'downtown';

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function hash(seed: number): number {
  const v = Math.sin(seed * 91.721 + 17.13) * 43758.5453;
  return v - Math.floor(v);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function positiveMod(v: number, mod: number): number {
  return ((v % mod) + mod) % mod;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function rectOverlapArea(a: Rect, b: Rect): number {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

function rectOverlapsAny(rect: Rect, zones: readonly Rect[]): boolean {
  return zones.some((zone) => rectsOverlap(rect, zone));
}

function makeRect(x: number, y: number, size: C.BuildingSize): Rect {
  const def = C.BUILDING_DEFS[size];
  const profile = getRampageBuildingProfile(size);
  const pad =
    profile.klass === 'small' ? 4 :
    profile.klass === 'medium' ? 6 :
    profile.klass === 'large' ? 8 :
    10;
  return { x: x - def.w / 2 - pad, y: y - pad, w: def.w + pad * 2, h: def.h + pad * 2 };
}

function noBuildZones(baseY: number, blockIdx: number): Rect[] {
  if (blockIdx >= 0) return [];
  const protectsFlipperFeed = baseY < C.WORLD_MIN_Y + 80;
  return protectsFlipperFeed
    ? [{ x: -70, y: C.WORLD_MIN_Y - 8, w: 140, h: 94 }]
    : [];
}

function validPlacement(rect: Rect, reserved: readonly Rect[], rects: readonly Rect[], baseY: number, bandHeight: number): boolean {
  if (rect.x < C.WORLD_MIN_X + 4 || rect.x + rect.w > C.WORLD_MAX_X - 4) return false;
  if (rect.y < baseY - 8 || rect.y + rect.h > baseY + bandHeight + 8) return false;
  if (rectOverlapsAny(rect, reserved)) return false;
  if (rects.some((existing) => rectsOverlap(rect, existing))) return false;
  return true;
}

function addDecal(
  out: GroundDecal[],
  kind: GroundDecal['kind'],
  x: number,
  y: number,
  w: number,
  h: number,
  rot = 0,
  alpha = 1,
): void {
  out.push({ kind, x, y, w, h, rot, alpha });
}

const ROAD_SENSITIVE_GROUND_DECALS = new Set<GroundDecal['kind']>([
  'frontage_pad',
  'plaza',
  'parking_stall',
  'shop_stripe',
  'planter',
  'lot_frame',
  'facade_row',
]);

function trimRoadOverlappingGroundDecals(layout: RampageLayoutBand, roadZones: readonly Rect[]): void {
  layout.groundDecals = layout.groundDecals.filter((decal) => {
    if (!ROAD_SENSITIVE_GROUND_DECALS.has(decal.kind)) return true;
    const rect = { x: decal.x - decal.w / 2, y: decal.y - decal.h / 2, w: decal.w, h: decal.h };
    const area = Math.max(1, Math.abs(rect.w * rect.h));
    return !roadZones.some((zone) => rectOverlapArea(rect, zone) / area > 0.22);
  });
}

function addFurniture(layout: RampageLayoutBand, type: FurnitureType, x: number, y: number): void {
  layout.furniture.push({
    type,
    x: clamp(x, C.WORLD_MIN_X + 8, C.WORLD_MAX_X - 8),
    y,
  });
}

function addFurnitureSeries(layout: RampageLayoutBand, type: FurnitureType, xs: readonly number[], y: number, yStep = 0): void {
  xs.forEach((x, i) => addFurniture(layout, type, x, y + yStep * i));
}

function addParcelDetail(
  layout: RampageLayoutBand,
  templateId: CityBlockTemplateId,
  blockIdx: number,
  lotIdx: number,
  cx: number,
  cy: number,
  w: number,
  h: number,
): void {
  const edgeY = cy + (lotIdx % 2 === 0 ? -h * 0.34 : h * 0.34);
  const edgeX = cx + (lotIdx % 2 === 0 ? -w * 0.32 : w * 0.32);
  const altX = cx - (lotIdx % 2 === 0 ? -w * 0.32 : w * 0.32);
  const phase = Math.abs(blockIdx + lotIdx);
  if (phase % 2 === 1 && w < 78) return;

  switch (templateId) {
    case 'shopping_street':
      addDecal(layout.groundDecals, 'shop_stripe', cx, edgeY, Math.min(76, w * 0.72), 4, 0, 0.36);
      addFurniture(layout, phase % 2 === 0 ? 'shop_awning' : 'noren', edgeX, edgeY - 3);
      if (w > 68) addFurniture(layout, phase % 3 === 0 ? 'vending' : 'a_frame_sign', altX, edgeY + 4);
      break;
    case 'residential_lane':
      addFurniture(layout, phase % 2 === 0 ? 'wood_fence' : 'hedge', cx, edgeY);
      addFurniture(layout, phase % 3 === 0 ? 'mailbox' : 'potted_plant', edgeX, edgeY + 8);
      if (w > 72) addFurniture(layout, phase % 2 === 0 ? 'tree' : 'flower_planter_row', altX, edgeY - 8);
      break;
    case 'downtown_crossing':
      addDecal(layout.groundDecals, 'parking_stall', cx, edgeY, Math.min(96, w * 0.74), 16, 0, 0.42);
      addFurniture(layout, phase % 2 === 0 ? 'street_lamp' : 'bollard', edgeX, edgeY - 10);
      if (w > 82) addFurniture(layout, phase % 3 === 0 ? 'newspaper_stand' : 'atm', altX, edgeY + 8);
      break;
    case 'civic_plaza':
      addDecal(layout.groundDecals, 'planter', cx, cy, Math.min(38, w * 0.30), Math.min(18, h * 0.28), 0, 0.48);
      addFurniture(layout, phase % 2 === 0 ? 'bench' : 'flower_bed', edgeX, edgeY);
      if (w > 82) addFurniture(layout, 'street_lamp', altX, edgeY);
      break;
    case 'station_front':
      addDecal(layout.groundDecals, 'parking_stall', cx, edgeY, Math.min(92, w * 0.70), 17, 0, 0.50);
      addFurniture(layout, phase % 2 === 0 ? 'bus_stop' : 'taxi_rank_sign', edgeX, edgeY);
      if (w > 86) addFurniture(layout, phase % 3 === 0 ? 'bicycle_rack' : 'platform_edge', altX, edgeY + 9);
      break;
    case 'construction_edge':
      addDecal(layout.groundDecals, 'danger_stripe', cx, edgeY, Math.min(96, w * 0.74), 7, 0, 0.42);
      addFurniture(layout, phase % 2 === 0 ? 'traffic_cone' : 'guardrail_short', edgeX, edgeY);
      if (w > 82) addFurniture(layout, phase % 3 === 0 ? 'sandbags' : 'tarp', altX, edgeY + 8);
      break;
  }
}

function addPathMark(out: GroundDecal[], from: { x: number; y: number }, to: { x: number; y: number }, alpha = 0.38): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 8) return;
  addDecal(out, 'feed_mark', from.x + dx / 2, from.y + dy / 2, len, 7, Math.atan2(dy, dx), alpha);
}

function chooseCityBlockTemplate(motifId: LayoutMotifId, district: DistrictKind, ctx: RampageGenerationContext): CityBlockTemplateId {
  if (motifId === 'breaker_gate') return 'construction_edge';
  if (ctx.overdrive || district === 'downtown' || motifId === 'score_wall') return 'downtown_crossing';
  if (motifId === 'pinball_nest' && district === 'civic') return 'civic_plaza';
  if (motifId === 'panic_plaza') return 'shopping_street';
  if (motifId === 'split_reward' && district === 'civic') return 'station_front';
  if (district === 'residential') return 'residential_lane';
  if (district === 'market') return Math.abs(ctx.blockIdx) % 3 === 0 ? 'station_front' : 'shopping_street';
  return 'civic_plaza';
}

function hRoad(
  role: StreetRoadRole,
  x: number,
  y: number,
  w: number,
  h: number,
  sidewalk: number,
  cls: StreetRoadClass,
  endpoint: StreetRoadEndpoint = 'through',
): StreetRoadSegment {
  return { role, orientation: 'h', x, y, w, h, sidewalk, cls, endpoint };
}

function vRoad(
  role: StreetRoadRole,
  x: number,
  y: number,
  w: number,
  h: number,
  sidewalk: number,
  cls: StreetRoadClass,
  endpoint: StreetRoadEndpoint = 'through',
): StreetRoadSegment {
  return { role, orientation: 'v', x, y, w, h, sidewalk, cls, endpoint };
}

const STREET_CORRIDOR_PATH = [-56, -34, -12, 12, 34, 56, 36, 12, -14, -40] as const;
const ROAD_SPINE_SPAN_BANDS = 5;
const ROAD_OVERLAP = 12;

function spineBoundaryX(blockIdx: number): number {
  const corridorIdx = Math.floor((blockIdx + 64) / ROAD_SPINE_SPAN_BANDS);
  return STREET_CORRIDOR_PATH[positiveMod(corridorIdx, STREET_CORRIDOR_PATH.length)];
}

function roadNode(graph: RoadGraph, id: string, x: number, y: number, kind: RoadNodeKind): RoadNode {
  const node = { id, x, y, kind };
  graph.nodes.push(node);
  return node;
}

function roadEdge(
  graph: RoadGraph,
  id: string,
  from: RoadNode,
  to: RoadNode,
  role: StreetRoadRole,
  cls: StreetRoadClass,
  width: number,
  sidewalk: number,
  endpoint: StreetRoadEndpoint,
  mainPath: boolean,
): void {
  graph.edges.push({ id, from, to, role, cls, width, sidewalk, endpoint, mainPath });
}

function roadXAtY(graph: RoadGraph, y: number): number {
  let nearestX = graph.bottomX;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (const edge of graph.edges) {
    if (!edge.mainPath || edge.from.x !== edge.to.x) continue;
    const minY = Math.min(edge.from.y, edge.to.y);
    const maxY = Math.max(edge.from.y, edge.to.y);
    if (y >= minY && y <= maxY) return edge.from.x;
    const dist = Math.min(Math.abs(y - minY), Math.abs(y - maxY));
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestX = edge.from.x;
    }
  }
  return nearestX;
}

function roadEdgeToSegment(edge: RoadEdge): StreetRoadSegment {
  const overlap = edge.role === 'main' ? edge.width : edge.width * 0.45;
  if (Math.abs(edge.from.y - edge.to.y) < 0.001) {
    return hRoad(
      edge.role,
      (edge.from.x + edge.to.x) / 2,
      edge.from.y,
      Math.abs(edge.to.x - edge.from.x) + overlap,
      edge.width + (edge.mainPath ? 2 : 0),
      edge.sidewalk,
      edge.cls,
      edge.endpoint,
    );
  }
  return vRoad(
    edge.role,
    edge.from.x,
    (edge.from.y + edge.to.y) / 2,
    edge.width,
    Math.abs(edge.to.y - edge.from.y) + overlap,
    edge.sidewalk,
    edge.cls,
    edge.endpoint,
  );
}

function createRoadGraph(
  baseY: number,
  bandHeight: number,
  blockIdx: number,
  templateId: CityBlockTemplateId,
  mainRoadW: number,
  mainWalkW: number,
  mainClass: StreetRoadClass,
): RoadGraph {
  const graph: RoadGraph = {
    nodes: [],
    edges: [],
    bottomX: spineBoundaryX(blockIdx),
    topX: spineBoundaryX(blockIdx + 1),
  };
  const bottomY = baseY - ROAD_OVERLAP;
  const topY = baseY + bandHeight + ROAD_OVERLAP;
  const bottom = roadNode(graph, 'main-bottom', graph.bottomX, bottomY, 'boundary');
  const top = roadNode(graph, 'main-top', graph.topX, topY, 'boundary');
  const shift = Math.abs(graph.bottomX - graph.topX);

  if (shift < 1) {
    roadEdge(graph, 'main-through', bottom, top, 'main', mainClass, mainRoadW, mainWalkW, 'through', true);
    return graph;
  }

  const turnRatio =
    templateId === 'station_front' ? 0.44 :
    templateId === 'civic_plaza' ? 0.64 :
    templateId === 'construction_edge' ? 0.58 :
    templateId === 'residential_lane' ? 0.50 :
    0.52;
  const turnY = baseY + bandHeight * turnRatio;
  const turnBottom = roadNode(graph, 'main-turn-bottom-x', graph.bottomX, turnY, 'turn');
  const turnTop = roadNode(graph, 'main-turn-top-x', graph.topX, turnY, 'turn');
  roadEdge(graph, 'main-lower', bottom, turnBottom, 'main', mainClass, mainRoadW, mainWalkW, 'through', true);
  roadEdge(graph, 'main-crank', turnBottom, turnTop, 'main', mainClass, mainRoadW, mainWalkW, 'through', true);
  roadEdge(graph, 'main-upper', turnTop, top, 'main', mainClass, mainRoadW, mainWalkW, 'through', true);
  return graph;
}

function addConnectedBranch(
  graph: RoadGraph,
  intersections: StreetIntersection[],
  role: StreetRoadRole,
  y: number,
  length: number,
  width: number,
  sidewalk: number,
  cls: StreetRoadClass,
  endpoint: StreetRoadEndpoint,
  major: boolean,
  style: StreetIntersection['style'],
  preferredDir?: number,
): void {
  const startX = roadXAtY(graph, y);
  const dir = preferredDir ?? (startX <= 0 ? 1 : -1);
  const start = roadNode(graph, `${role}-junction-${intersections.length}`, startX, y, 'junction');
  intersections.push({ x: startX, y, major, style });

  if (endpoint === 'through') {
    const leftX = C.WORLD_MIN_X + 16;
    const rightX = C.WORLD_MAX_X - 16;
    const left = roadNode(graph, `${role}-left-${intersections.length}`, leftX, y, 'terminal');
    const right = roadNode(graph, `${role}-right-${intersections.length}`, rightX, y, 'terminal');
    roadEdge(graph, `${role}-left-edge-${intersections.length}`, left, start, role, cls, width, sidewalk, 'through', false);
    roadEdge(graph, `${role}-right-edge-${intersections.length}`, start, right, role, cls, width, sidewalk, 'through', false);
    return;
  }

  const endX = clamp(startX + dir * length, C.WORLD_MIN_X + 18, C.WORLD_MAX_X - 18);
  const end = roadNode(graph, `${role}-end-${intersections.length}`, endX, y, 'terminal');
  roadEdge(graph, `${role}-edge-${intersections.length}`, start, end, role, cls, width, sidewalk, endpoint, false);
}

function streetLayoutForTemplate(baseY: number, bandHeight: number, blockIdx: number, templateId: CityBlockTemplateId): StreetLayout {
  const lean = blockIdx % 2 === 0 ? 1 : -1;
  const y = (ratio: number) => baseY + bandHeight * ratio;

  let primaryY = y(0.52);
  let secondaryY = y(0.72);
  let mainRoadH = 20;
  let mainWalkH = 6;
  let mainClass: StreetRoadClass = 'lane';
  let sideStreetW = 16;
  let sideWalkW = 5;

  switch (templateId) {
    case 'shopping_street':
      primaryY = y(0.54);
      secondaryY = y(0.76);
      mainRoadH = 22;
      mainWalkH = 9;
      sideStreetW = 18;
      sideWalkW = 6;
      break;
    case 'residential_lane':
      primaryY = y(blockIdx % 2 === 0 ? 0.42 : 0.62);
      secondaryY = y(blockIdx % 2 === 0 ? 0.72 : 0.30);
      mainRoadH = 18;
      mainWalkH = 6;
      sideStreetW = 15;
      sideWalkW = 5;
      break;
    case 'downtown_crossing':
      primaryY = y(0.52);
      secondaryY = y(blockIdx % 2 === 0 ? 0.27 : 0.75);
      mainRoadH = 30;
      mainWalkH = 9;
      sideStreetW = 30;
      sideWalkW = 8;
      break;
    case 'civic_plaza':
      primaryY = y(0.72);
      secondaryY = y(0.42);
      mainRoadH = 18;
      mainWalkH = 7;
      sideStreetW = 16;
      sideWalkW = 6;
      break;
    case 'station_front':
      primaryY = y(0.47);
      secondaryY = y(0.30);
      mainRoadH = 26;
      mainWalkH = 8;
      sideStreetW = 22;
      sideWalkW = 7;
      break;
    case 'construction_edge':
      primaryY = y(0.58);
      secondaryY = y(0.30);
      mainRoadH = 22;
      mainWalkH = 6;
      sideStreetW = 20;
      sideWalkW = 5;
      break;
  }

  const graph = createRoadGraph(baseY, bandHeight, blockIdx, templateId, mainRoadH, mainWalkH, mainClass);
  const junctions: StreetIntersection[] = [];
  const mainCorridorX = roadXAtY(graph, primaryY);
  const branchDir = mainCorridorX <= 0 ? 1 : -1;

  for (const node of graph.nodes) {
    if (node.kind === 'turn') junctions.push({ x: node.x, y: node.y, major: false, style: 'turn' });
  }

  switch (templateId) {
    case 'shopping_street':
      addConnectedBranch(graph, junctions, 'side', primaryY, 116, 18, 6, 'lane', 'dead_end', false, 't', branchDir);
      break;
    case 'residential_lane':
      addConnectedBranch(graph, junctions, 'side', primaryY, 88, 15, 5, 'lane', 'dead_end', false, 'simple', lean);
      break;
    case 'downtown_crossing':
      addConnectedBranch(graph, junctions, 'side', primaryY, 0, 34, 9, 'avenue', 'through', true, 'full');
      break;
    case 'civic_plaza':
      addConnectedBranch(graph, junctions, 'service', primaryY, 82, 15, 5, 'lane', 'plaza', false, 't', -lean);
      break;
    case 'station_front':
      addConnectedBranch(graph, junctions, 'service', primaryY, 118, 20, 7, 'street', 'plaza', true, 't', branchDir);
      addConnectedBranch(graph, junctions, 'alley', y(0.68), 84, 14, 5, 'lane', 'driveway', false, 'simple', branchDir);
      break;
    case 'construction_edge':
      addConnectedBranch(graph, junctions, 'service', primaryY, 104, 18, 5, 'lane', 'driveway', false, 't', -lean);
      break;
  }

  const roads = graph.edges.map(roadEdgeToSegment).filter((road) => road.w > 0.1 && road.h > 0.1);
  const sideStreetX = mainCorridorX;
  const serviceStreetX = mainCorridorX + branchDir * 72;
  return {
    mainCorridorX,
    primaryY,
    secondaryY,
    sideStreetX,
    serviceStreetX,
    mainRoadH,
    mainWalkH,
    alleyH: 16,
    alleyWalkH: 6,
    sideStreetW,
    sideWalkW,
    serviceStreetW: 16,
    serviceWalkW: 5,
    alleyW: 0,
    serviceHeightRatio: 0,
    roads,
    intersections: junctions,
    junctions,
    graph,
  };
}

function addRoadSurface(
  out: RoadSurface[],
  kind: RoadSurface['kind'],
  road: StreetRoadSegment,
  x: number,
  y: number,
  w: number,
  h: number,
  orientation?: RoadSurface['orientation'],
): void {
  out.push({ kind, x, y, w, h, cls: road.cls, orientation });
}

function addRoadDecal(
  out: RoadDecal[],
  kind: RoadDecal['kind'],
  x: number,
  y: number,
  w: number,
  h: number,
  rot = 0,
  alpha = 1,
  cls: RoadDecal['cls'] = 'street',
): void {
  out.push({ kind, x, y, w, h, rot, alpha, cls });
}

function roadLayerForStreet(street: StreetLayout): { surfaces: RoadSurface[]; decals: RoadDecal[] } {
  const surfaces: RoadSurface[] = [];
  const decals: RoadDecal[] = [];

  for (const road of street.roads) {
    if (road.sidewalk > 0) {
      if (road.orientation === 'h') {
        addRoadSurface(surfaces, 'sidewalk', road, road.x, road.y - road.h / 2 - road.sidewalk / 2, road.w, road.sidewalk, 'h');
        addRoadSurface(surfaces, 'sidewalk', road, road.x, road.y + road.h / 2 + road.sidewalk / 2, road.w, road.sidewalk, 'h');
      } else {
        addRoadSurface(surfaces, 'sidewalk', road, road.x - road.w / 2 - road.sidewalk / 2, road.y, road.sidewalk, road.h, 'v');
        addRoadSurface(surfaces, 'sidewalk', road, road.x + road.w / 2 + road.sidewalk / 2, road.y, road.sidewalk, road.h, 'v');
      }
    }
    addRoadSurface(surfaces, 'road', road, road.x, road.y, road.w, road.h, road.orientation);
  }

  for (const road of street.roads) {
    const curbAlpha = road.role === 'main' ? 0.72 : 0.52;
    if (road.orientation === 'h') {
      addRoadDecal(decals, 'curb', road.x, road.y - road.h / 2, road.w, 1.6, 0, curbAlpha, road.cls);
      addRoadDecal(decals, 'curb', road.x, road.y + road.h / 2, road.w, 1.6, 0, curbAlpha, road.cls);
      addRoadDecal(decals, 'lane_mark', road.x, road.y, road.w * (road.cls === 'avenue' ? 0.72 : 0.58), 1.2, 0, road.cls === 'lane' ? 0.34 : 0.56, road.cls);
      if (road.endpoint !== 'through') {
        const endSign = road.x >= street.mainCorridorX ? 1 : -1;
        addRoadDecal(decals, 'endpoint_cap', road.x + endSign * road.w / 2 - endSign * 5, road.y, 12, road.h + road.sidewalk * 1.2, 0, 0.70, road.cls);
      }
    } else {
      addRoadDecal(decals, 'curb', road.x - road.w / 2, road.y, road.h, 1.1, Math.PI / 2, curbAlpha, road.cls);
      addRoadDecal(decals, 'curb', road.x + road.w / 2, road.y, road.h, 1.1, Math.PI / 2, curbAlpha, road.cls);
      addRoadDecal(decals, 'lane_mark', road.x, road.y, road.h * (road.cls === 'avenue' ? 0.62 : 0.50), 1.0, Math.PI / 2, road.cls === 'lane' ? 0.28 : 0.46, road.cls);
    }
  }

  for (const ix of street.intersections) {
    const cls = ix.major ? 'avenue' : 'street';
    const padSize = ix.major ? 50 : ix.style === 't' ? 40 : 32;
    surfaces.push({ kind: 'junction', x: ix.x, y: ix.y, w: padSize, h: padSize, cls });
    if (ix.style === 'full') {
      addRoadDecal(decals, 'crosswalk', ix.x - 25, ix.y, 34, 13, 0, 0.66, cls);
      addRoadDecal(decals, 'crosswalk', ix.x + 25, ix.y, 34, 13, 0, 0.66, cls);
      addRoadDecal(decals, 'crosswalk', ix.x, ix.y - 25, 34, 12, Math.PI / 2, 0.58, cls);
      addRoadDecal(decals, 'crosswalk', ix.x, ix.y + 25, 34, 12, Math.PI / 2, 0.58, cls);
    } else if (ix.major || ix.style === 't') {
      addRoadDecal(decals, 'crosswalk', ix.x, ix.y, ix.major ? 42 : 30, ix.major ? 14 : 10, Math.PI / 2, ix.major ? 0.60 : 0.42, cls);
    }
  }

  return { surfaces, decals };
}

function buildingPoolForParcel(kind: CityParcelKind): readonly C.BuildingSize[] {
  switch (kind) {
    case 'shops': return SHOPPING_STREET_BUILDINGS;
    case 'homes': return SMALL_HOMES;
    case 'towers': return DOWNTOWN_BUILDINGS;
    case 'civic': return CIVIC_BUILDINGS;
    case 'station': return ['train_station', 'bus_terminal_shelter', 'parking'] as const;
    case 'construction': return ['warehouse', 'parking', 'factory_stack', 'container_stack'] as const;
    case 'park': return ['fountain_pavilion', 'library', 'cafe'] as const;
  }
}

function furnitureForParcel(kind: CityParcelKind): readonly FurnitureType[] {
  switch (kind) {
    case 'shops': return ['shop_awning', 'a_frame_sign', 'noren', 'vending', 'kerbside_vending_pair', 'bicycle_rack'];
    case 'homes': return ['mailbox', 'post_letter_box', 'wood_fence', 'hedge', 'potted_plant', 'flower_planter_row'];
    case 'towers': return ['street_lamp', 'bollard', 'guardrail_short', 'atm', 'newspaper_stand'];
    case 'civic': return ['bench', 'street_lamp', 'flower_bed', 'flag_pole', 'statue'];
    case 'station': return ['bus_stop', 'taxi_rank_sign', 'bicycle_rack', 'platform_edge', 'railway_track'];
    case 'construction': return ['traffic_cone', 'guardrail_short', 'sandbags', 'electric_box', 'pallet_stack'];
    case 'park': return ['bench', 'tree', 'flower_bed', 'street_lamp', 'play_structure'];
  }
}

function roleForParcel(kind: CityParcelKind, idx: number): PlacementRole {
  if (kind === 'towers') return idx % 3 === 0 ? 'vault' : idx % 3 === 1 ? 'bank' : 'stopper';
  if (kind === 'construction') return idx % 2 === 0 ? 'stopper' : 'vault';
  if (kind === 'homes') return idx % 3 === 1 ? 'feeder' : 'bank';
  if (kind === 'civic' || kind === 'station' || kind === 'park') return idx % 2 === 0 ? 'release' : 'bank';
  return idx % 3 === 1 ? 'feeder' : 'release';
}

function frontageSlotsForParcel(parcel: Omit<CityParcel, 'slots' | 'decor'>, count: number): FrontageSlot[] {
  const pool = buildingPoolForParcel(parcel.kind);
  const decor = furnitureForParcel(parcel.kind);
  const slots: FrontageSlot[] = [];
  const usableW = Math.max(24, parcel.w - 24);
  const usableH = Math.max(24, parcel.h - 24);
  const gapCount = Math.max(1, count - 1);

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / gapCount;
    let x = parcel.x;
    let y = parcel.y;
    if (parcel.frontageSide === 'north' || parcel.frontageSide === 'south') {
      x = parcel.x - usableW / 2 + usableW * t;
      y = parcel.y + (parcel.frontageSide === 'north' ? -parcel.h * 0.34 : parcel.h * 0.32);
    } else if (parcel.frontageSide === 'east' || parcel.frontageSide === 'west') {
      x = parcel.x + (parcel.frontageSide === 'west' ? -parcel.w * 0.32 : parcel.w * 0.32);
      y = parcel.y - usableH / 2 + usableH * t;
    }
    slots.push({
      x,
      y,
      pool,
      role: roleForParcel(parcel.kind, i),
      jitterX: parcel.kind === 'homes' ? 3 : 1.5,
      jitterY: parcel.kind === 'homes' ? 3 : 1.5,
      decor,
    });
  }
  return slots;
}

function frontageBandForParcel(
  parcel: Pick<CityParcel, 'x' | 'y' | 'w' | 'h' | 'frontageSide'>,
  inset: number,
  lengthScale = 0.82,
): { x: number; y: number; w: number; h: number; rot: number } {
  const lengthW = parcel.w * lengthScale;
  const lengthH = parcel.h * lengthScale;
  switch (parcel.frontageSide) {
    case 'north':
      return { x: parcel.x, y: parcel.y - parcel.h / 2 + inset, w: lengthW, h: 15, rot: 0 };
    case 'south':
      return { x: parcel.x, y: parcel.y + parcel.h / 2 - inset, w: lengthW, h: 15, rot: Math.PI };
    case 'west':
      return { x: parcel.x - parcel.w / 2 + inset, y: parcel.y, w: lengthH, h: 15, rot: Math.PI / 2 };
    case 'east':
      return { x: parcel.x + parcel.w / 2 - inset, y: parcel.y, w: lengthH, h: 15, rot: Math.PI / 2 };
    case 'center':
      return { x: parcel.x, y: parcel.y, w: Math.min(parcel.w, parcel.h) * 0.62, h: 16, rot: 0 };
  }
}

function decorForParcel(parcel: Omit<CityParcel, 'slots' | 'decor'>): ParcelDecorPlan[] {
  const out: ParcelDecorPlan[] = [];
  const northY = parcel.y - parcel.h / 2 + 7;
  const southY = parcel.y + parcel.h / 2 - 7;
  const westX = parcel.x - parcel.w / 2 + 7;
  const eastX = parcel.x + parcel.w / 2 - 7;
  const padAlpha = parcel.kind === 'park' ? 0.24 : 0.62;
  const frontage = frontageBandForParcel(parcel, parcel.kind === 'homes' ? 16 : 12, parcel.kind === 'towers' ? 0.72 : 0.82);

  switch (parcel.frontageSide) {
    case 'north':
      out.push({ decal: 'frontage_pad', x: parcel.x, y: northY + 5, w: parcel.w * 0.84, h: 20, alpha: padAlpha });
      out.push({ decal: 'driveway', x: parcel.x, y: northY, w: parcel.w * 0.76, h: 10, alpha: 0.62 });
      out.push({ decal: 'curb_corner', x: parcel.x - parcel.w / 2 + 8, y: northY, w: 13, h: 13, alpha: 0.58 });
      out.push({ decal: 'curb_corner', x: parcel.x + parcel.w / 2 - 8, y: northY, w: 13, h: 13, rot: Math.PI / 2, alpha: 0.58 });
      break;
    case 'south':
      out.push({ decal: 'frontage_pad', x: parcel.x, y: southY - 5, w: parcel.w * 0.84, h: 20, alpha: padAlpha });
      out.push({ decal: 'driveway', x: parcel.x, y: southY, w: parcel.w * 0.76, h: 10, alpha: 0.62 });
      out.push({ decal: 'curb_corner', x: parcel.x - parcel.w / 2 + 8, y: southY, w: 13, h: 13, rot: -Math.PI / 2, alpha: 0.58 });
      out.push({ decal: 'curb_corner', x: parcel.x + parcel.w / 2 - 8, y: southY, w: 13, h: 13, rot: Math.PI, alpha: 0.58 });
      break;
    case 'west':
      out.push({ decal: 'frontage_pad', x: westX + 5, y: parcel.y, w: 20, h: parcel.h * 0.78, alpha: padAlpha });
      out.push({ decal: 'driveway', x: westX, y: parcel.y, w: parcel.h * 0.72, h: 9, rot: Math.PI / 2, alpha: 0.58 });
      break;
    case 'east':
      out.push({ decal: 'frontage_pad', x: eastX - 5, y: parcel.y, w: 20, h: parcel.h * 0.78, alpha: padAlpha });
      out.push({ decal: 'driveway', x: eastX, y: parcel.y, w: parcel.h * 0.72, h: 9, rot: Math.PI / 2, alpha: 0.58 });
      break;
    case 'center':
      out.push({ decal: 'frontage_pad', x: parcel.x, y: parcel.y, w: parcel.w * 0.56, h: parcel.h * 0.34, alpha: parcel.kind === 'park' ? 0.16 : 0.36 });
      out.push({ decal: 'plaza', x: parcel.x, y: parcel.y, w: parcel.w * 0.60, h: parcel.h * 0.44, alpha: 0.32 });
      break;
  }

  if (parcel.kind === 'shops') {
    out.push({ decal: 'facade_row', ...frontage, alpha: 0.92 });
    out.push({ decal: 'shop_stripe', x: frontage.x, y: frontage.y, w: frontage.w * 0.88, h: 5, rot: frontage.rot, alpha: 0.58 });
  } else if (parcel.kind === 'towers' || parcel.kind === 'station' || parcel.kind === 'civic') {
    out.push({ decal: 'facade_row', ...frontage, alpha: parcel.kind === 'station' ? 0.84 : 0.78 });
  }

  if (parcel.kind === 'homes' || parcel.kind === 'park') {
    out.push({ decal: 'planter', x: parcel.x - parcel.w * 0.28, y: parcel.y, w: Math.min(34, parcel.w * 0.22), h: Math.min(20, parcel.h * 0.24), alpha: 0.70 });
    out.push({ decal: 'planter', x: parcel.x + parcel.w * 0.28, y: parcel.y + parcel.h * 0.18, w: Math.min(30, parcel.w * 0.20), h: Math.min(18, parcel.h * 0.22), alpha: 0.56 });
  } else if (parcel.kind === 'towers' || parcel.kind === 'station') {
    out.push({ decal: 'parking_stall', x: parcel.x, y: parcel.y + parcel.h * 0.22, w: Math.min(116, parcel.w * 0.70), h: 16, alpha: 0.38 });
  } else if (parcel.kind === 'construction') {
    out.push({ decal: 'danger_stripe', x: parcel.x, y: parcel.y + parcel.h * 0.24, w: Math.min(124, parcel.w * 0.76), h: 8, alpha: 0.42 });
  }
  return out;
}

function makeParcel(
  id: string,
  kind: CityParcelKind,
  frontageSide: FrontageSide,
  x: number,
  y: number,
  w: number,
  h: number,
  slots: number,
): CityParcel {
  const base = { id, kind, frontageSide, x, y, w, h };
  return {
    ...base,
    slots: frontageSlotsForParcel(base, slots),
    decor: decorForParcel(base),
  };
}

function frontageTowardRoad(parcelX: number, roadX: number): FrontageSide {
  return parcelX < roadX ? 'east' : 'west';
}

function cityParcelsForTemplate(baseY: number, bandHeight: number, blockIdx: number, templateId: CityBlockTemplateId): CityParcel[] {
  const street = streetLayoutForTemplate(baseY, bandHeight, blockIdx, templateId);
  const lean = blockIdx % 2 === 0 ? 1 : -1;
  const y = (ratio: number) => baseY + bandHeight * ratio;
  const px = (x: number, halfW = 42) => clamp(x, C.WORLD_MIN_X + halfW + 4, C.WORLD_MAX_X - halfW - 4);
  const roadAt = (yy: number) => roadXAtY(street.graph, yy);
  const sideFor = (yy: number) => (roadAt(yy) <= 0 ? 1 : -1);
  const streetX = (yy: number, offset: number, halfW = 42) => px(roadAt(yy) + offset, halfW);
  const streetFrontage = (xx: number, yy: number) => frontageTowardRoad(xx, roadAt(yy));
  const parcels: CityParcel[] = [];

  switch (templateId) {
    case 'shopping_street': {
      const leftY = y(0.36);
      const rightY = y(0.62);
      const branchDir = sideFor(street.primaryY);
      const leftX = streetX(leftY, -72, 34);
      const rightX = streetX(rightY, 72, 34);
      const sideX = streetX(street.primaryY, branchDir * 78, 58);
      parcels.push(
        makeParcel('shop-left-row', 'shops', streetFrontage(leftX, leftY), leftX, leftY, 64, 126, 4),
        makeParcel('shop-right-row', 'shops', streetFrontage(rightX, rightY), rightX, rightY, 64, 122, 4),
        makeParcel('side-street-shops', 'shops', street.primaryY < y(0.50) ? 'south' : 'north', sideX, street.primaryY + 34, 116, 42, 2),
      );
      break;
    }
    case 'residential_lane': {
      const leftY = y(0.34);
      const rightY = y(0.70);
      const parkY = y(0.54);
      const branchDir = sideFor(parkY);
      const leftX = streetX(leftY, -70, 42);
      const rightX = streetX(rightY, 72, 42);
      parcels.push(
        makeParcel('homes-left', 'homes', streetFrontage(leftX, leftY), leftX, leftY, 78, 112, 3),
        makeParcel('homes-right', 'homes', streetFrontage(rightX, rightY), rightX, rightY, 82, 112, 3),
        makeParcel('pocket-park', 'park', 'center', streetX(parkY, -branchDir * 96, 44), parkY, 86, 72, 1),
      );
      break;
    }
    case 'downtown_crossing': {
      const nwY = street.primaryY - 58;
      const seY = street.primaryY + 58;
      const branchDir = sideFor(street.primaryY);
      const nwX = streetX(nwY, -78, 58);
      const seX = streetX(seY, 78, 58);
      const retailY = street.primaryY + 54;
      const officeY = street.primaryY - 54;
      const retailX = streetX(retailY, -branchDir * 104, 42);
      const officeX = streetX(officeY, branchDir * 108, 48);
      parcels.push(
        makeParcel('tower-nw', 'towers', 'south', nwX, nwY, 112, 58, 2),
        makeParcel('tower-se', 'towers', 'north', seX, seY, 114, 58, 2),
        makeParcel('corner-retail', 'shops', streetFrontage(retailX, retailY), retailX, retailY, 78, 62, 2),
        makeParcel('office-court', 'towers', streetFrontage(officeX, officeY), officeX, officeY, 92, 54, 1),
      );
      break;
    }
    case 'civic_plaza': {
      const parkY = y(0.48);
      const hallY = y(0.20);
      const annexY = y(0.76);
      const shopsY = y(0.82);
      const parkX = streetX(parkY, -lean * 104, 82);
      const hallX = streetX(hallY, -lean * 62, 46);
      const annexX = streetX(annexY, -lean * 84, 46);
      parcels.push(
        makeParcel('central-park', 'park', 'center', parkX, parkY, 164, 96, 1),
        makeParcel('civic-hall', 'civic', streetFrontage(hallX, hallY), hallX, hallY, 88, 48, 1),
        makeParcel('civic-annex', 'civic', streetFrontage(annexX, annexY), annexX, annexY, 88, 48, 1),
        makeParcel('plaza-shops', 'shops', 'north', streetX(shopsY, -lean * 112, 70), shopsY, 138, 42, 3),
      );
      break;
    }
    case 'station_front': {
      const branchDir = sideFor(street.primaryY);
      const stationY = y(0.30);
      const taxiY = street.primaryY + 44;
      const shopsY = y(0.72);
      const stationX = streetX(stationY, branchDir * 82, 72);
      const shopsX = streetX(shopsY, -branchDir * 78, 42);
      parcels.push(
        makeParcel('station-core', 'station', streetFrontage(stationX, stationY), stationX, stationY, 142, 62, 2),
        makeParcel('taxi-bay', 'station', 'north', streetX(taxiY, branchDir * 76, 62), taxiY, 122, 42, 2),
        makeParcel('station-shops', 'shops', streetFrontage(shopsX, shopsY), shopsX, shopsY, 80, 78, 2),
      );
      break;
    }
    case 'construction_edge': {
      const workY = y(0.58);
      const heavyY = y(0.25);
      const officeY = y(0.18);
      const workX = streetX(workY, -lean * 86, 70);
      const heavyX = streetX(heavyY, -lean * 70, 54);
      const officeX = streetX(officeY, lean * 40, 40);
      parcels.push(
        makeParcel('work-yard', 'construction', streetFrontage(workX, workY), workX, workY, 140, 88, 3),
        makeParcel('heavy-block', 'towers', streetFrontage(heavyX, heavyY), heavyX, heavyY, 106, 54, 2),
        makeParcel('site-office', 'construction', streetFrontage(officeX, officeY), officeX, officeY, 76, 42, 1),
      );
      break;
    }
  }
  return parcels;
}

function placeBuilding(
  layout: RampageLayoutBand,
  rects: Rect[],
  reserved: readonly Rect[],
  baseY: number,
  bandHeight: number,
  spec: BuildingSpec,
): boolean {
  const def = C.BUILDING_DEFS[spec.size];
  const maxY = baseY + bandHeight - def.h - 8;
  const minY = baseY + 10;
  const maxX = C.WORLD_MAX_X - def.w / 2 - 6;
  const minX = C.WORLD_MIN_X + def.w / 2 + 6;
  const attempts = Math.max(1, (spec.jitterX || spec.jitterY) ? 16 : 1);

  for (let attempt = 0; attempt < attempts; attempt++) {
    const x = clamp(spec.x + rand(-(spec.jitterX ?? 0), spec.jitterX ?? 0), minX, maxX);
    const y = clamp(spec.y + rand(-(spec.jitterY ?? 0), spec.jitterY ?? 0), minY, maxY);
    const rect = makeRect(x, y, spec.size);
    if (!validPlacement(rect, reserved, rects, baseY, bandHeight)) continue;

    const building: BuildingSpawnDef = {
      x,
      y,
      size: spec.size,
      blockIdx: spec.blockIdx,
      intent: spec.intent,
      role: spec.role,
      patternId: `${spec.motifId}_${spec.role}_${layout.buildings.length}`,
    };
    layout.buildings.push(building);
    rects.push(rect);
    return true;
  }
  return false;
}

function addCrowd(
  out: RampageHumanSeed[],
  x: number,
  y: number,
  count: number,
  rx = 18,
  ry = 12,
  rewardKind: HumanRewardKind = 'runner',
  value = 1,
): void {
  for (let i = 0; i < count; i++) {
    const a = i * 2.399963229728653;
    const ring = 0.35 + (i % 5) * 0.18;
    out.push({
      x: clamp(x + Math.cos(a) * rx * ring + rand(-3, 3), C.WORLD_MIN_X + 10, C.WORLD_MAX_X - 10),
      y: y + Math.sin(a) * ry * ring + rand(-3, 3),
      rewardKind,
      value,
    });
  }
}

function capPrePlacedHumans(layout: RampageLayoutBand): void {
  if (layout.humans.length <= PREPLACED_HUMANS_PER_BAND) return;

  const selected: RampageHumanSeed[] = [];
  const vip = layout.humans.find((human) => human.rewardKind === 'vip');
  if (vip) selected.push(vip);

  const stride = layout.humans.length / PREPLACED_HUMANS_PER_BAND;
  for (let i = 0; selected.length < PREPLACED_HUMANS_PER_BAND && i < layout.humans.length; i++) {
    const candidate = layout.humans[Math.floor((i + 0.5) * stride) % layout.humans.length];
    if (!selected.includes(candidate)) selected.push(candidate);
  }

  layout.humans.splice(0, layout.humans.length, ...selected.sort((a, b) => a.y - b.y));
}

function createLayout(
  baseY: number,
  bandHeight: number,
  ctx: RampageGenerationContext,
  motifId: LayoutMotifId,
  templateId: CityBlockTemplateId,
): RampageLayoutBand {
  const intent = intentForMotif(motifId, ctx);
  const street = streetLayoutForTemplate(baseY, bandHeight, ctx.blockIdx, templateId);
  const roadLayer = roadLayerForStreet(street);
  return {
    motifId,
    intent,
    buildings: [],
    furniture: [],
    grounds: generateGroundGrid(baseY, bandHeight, ctx.blockIdx, motifId, templateId),
    groundDecals: [],
    roadSurfaces: roadLayer.surfaces,
    roadDecals: roadLayer.decals,
    humans: [],
  };
}

function parcelGroundType(parcel: CityParcel, templateId: CityBlockTemplateId, blockIdx: number): GroundTile['type'] {
  const variant = positiveMod(blockIdx + parcel.id.length, 4);
  switch (parcel.kind) {
    case 'shops':
      return variant % 2 === 0 ? 'tile' : 'stone_pavement';
    case 'homes':
      return 'residential_tile';
    case 'towers':
      return variant % 2 === 0 ? 'concrete' : 'tile';
    case 'civic':
      return templateId === 'civic_plaza' ? 'stone_pavement' : 'concrete';
    case 'station':
      return variant % 2 === 0 ? 'tile' : 'concrete';
    case 'construction':
      return variant % 2 === 0 ? 'gravel' : 'steel_plate';
    case 'park':
      return 'grass';
  }
}

function frontageGroundTile(parcel: CityParcel, type: GroundTile['type'], depth: number, lengthScale = 0.86): GroundTile {
  switch (parcel.frontageSide) {
    case 'north':
      return { type, x: parcel.x, y: parcel.y - parcel.h / 2 + depth / 2 + 4, w: parcel.w * lengthScale, h: depth };
    case 'south':
      return { type, x: parcel.x, y: parcel.y + parcel.h / 2 - depth / 2 - 4, w: parcel.w * lengthScale, h: depth };
    case 'west':
      return { type, x: parcel.x - parcel.w / 2 + depth / 2 + 4, y: parcel.y, w: depth, h: parcel.h * lengthScale };
    case 'east':
      return { type, x: parcel.x + parcel.w / 2 - depth / 2 - 4, y: parcel.y, w: depth, h: parcel.h * lengthScale };
    case 'center':
      return { type, x: parcel.x, y: parcel.y, w: parcel.w * 0.62, h: parcel.h * 0.48 };
  }
}

function parcelGroundLayers(parcel: CityParcel, templateId: CityBlockTemplateId, blockIdx: number): GroundTile[] {
  const base = parcelGroundType(parcel, templateId, blockIdx);
  const layers: GroundTile[] = [
    { type: base, x: parcel.x, y: parcel.y, w: parcel.w, h: parcel.h },
  ];

  switch (parcel.kind) {
    case 'shops':
      layers.push(frontageGroundTile(parcel, 'tile', 28, 0.92));
      layers.push({ type: 'stone_pavement', x: parcel.x, y: parcel.y, w: parcel.w * 0.52, h: parcel.h * 0.36 });
      break;
    case 'homes':
      layers[0] = { type: 'grass', x: parcel.x, y: parcel.y, w: parcel.w, h: parcel.h };
      layers.push(frontageGroundTile(parcel, 'residential_tile', 30, 0.78));
      layers.push({ type: 'dirt', x: parcel.x, y: parcel.y + parcel.h * 0.18, w: parcel.w * 0.42, h: parcel.h * 0.24 });
      break;
    case 'towers':
      layers.push(frontageGroundTile(parcel, 'tile', 32, 0.78));
      layers.push({ type: 'concrete', x: parcel.x, y: parcel.y, w: parcel.w * 0.52, h: parcel.h * 0.42 });
      break;
    case 'civic':
      layers.push(frontageGroundTile(parcel, 'stone_pavement', 30, 0.82));
      layers.push({ type: 'grass', x: parcel.x - parcel.w * 0.25, y: parcel.y + parcel.h * 0.08, w: parcel.w * 0.26, h: parcel.h * 0.42 });
      break;
    case 'station':
      layers.push(frontageGroundTile(parcel, 'checker_tile', 34, 0.84));
      layers.push({ type: 'concrete', x: parcel.x, y: parcel.y + parcel.h * 0.18, w: parcel.w * 0.70, h: parcel.h * 0.34 });
      break;
    case 'park':
      layers[0] = { type: 'grass', x: parcel.x, y: parcel.y, w: parcel.w, h: parcel.h };
      layers.push({ type: 'stone_pavement', x: parcel.x, y: parcel.y, w: parcel.w * 0.70, h: 18 });
      layers.push({ type: 'stone_pavement', x: parcel.x, y: parcel.y, w: 18, h: parcel.h * 0.66 });
      break;
    case 'construction':
      layers.push(frontageGroundTile(parcel, 'steel_plate', 30, 0.82));
      layers.push({ type: 'gravel', x: parcel.x, y: parcel.y + parcel.h * 0.18, w: parcel.w * 0.72, h: parcel.h * 0.42 });
      break;
  }

  return layers;
}

function districtGroundFields(baseY: number, bandHeight: number, blockIdx: number, templateId: CityBlockTemplateId): GroundTile[] {
  const street = streetLayoutForTemplate(baseY, bandHeight, blockIdx, templateId);
  const centerY = baseY + bandHeight * 0.50;
  const roadX = roadXAtY(street.graph, centerY);
  const leftEdge = C.WORLD_MIN_X + 10;
  const rightEdge = C.WORLD_MAX_X - 10;
  const roadGap = street.mainRoadH / 2 + street.mainWalkH + 14;
  const leftW = Math.max(0, roadX - roadGap - leftEdge);
  const rightW = Math.max(0, rightEdge - (roadX + roadGap));
  const leftX = leftEdge + leftW / 2;
  const rightX = roadX + roadGap + rightW / 2;
  const y = (ratio: number) => baseY + bandHeight * ratio;
  const fields: GroundTile[] = [];

  const addLeft = (type: GroundTile['type'], yy: number, ww = leftW * 0.92, hh = bandHeight * 0.86) => {
    if (leftW > 24) fields.push({ type, x: leftX, y: yy, w: ww, h: hh });
  };
  const addRight = (type: GroundTile['type'], yy: number, ww = rightW * 0.92, hh = bandHeight * 0.86) => {
    if (rightW > 24) fields.push({ type, x: rightX, y: yy, w: ww, h: hh });
  };

  switch (templateId) {
    case 'shopping_street':
      addLeft('city_block', y(0.45));
      addRight('tile', y(0.55), rightW * 0.90, bandHeight * 0.76);
      addRight('wood_deck', y(0.22), Math.min(86, rightW * 0.54), 34);
      break;
    case 'residential_lane':
      addLeft('grass', y(0.45));
      addRight('fallen_leaves', y(0.58), rightW * 0.88, bandHeight * 0.72);
      addLeft('residential_tile', y(0.18), Math.min(86, leftW * 0.58), 36);
      break;
    case 'downtown_crossing':
      addLeft('city_block', y(0.46), leftW * 0.92, bandHeight * 0.80);
      addRight('concrete', y(0.50), rightW * 0.88, bandHeight * 0.76);
      addRight('tile', y(0.20), Math.min(100, rightW * 0.62), 42);
      break;
    case 'civic_plaza':
      addLeft('grass', y(0.48), leftW * 0.94, bandHeight * 0.86);
      addRight('stone_pavement', y(0.52), rightW * 0.88, bandHeight * 0.76);
      addLeft('fallen_leaves', y(0.76), Math.min(104, leftW * 0.64), 42);
      break;
    case 'station_front':
      addLeft('checker_tile', y(0.44), leftW * 0.90, bandHeight * 0.72);
      addRight('city_block', y(0.54), rightW * 0.90, bandHeight * 0.76);
      addLeft('tile', y(0.20), Math.min(112, leftW * 0.64), 38);
      break;
    case 'construction_edge':
      addLeft('gravel', y(0.54), leftW * 0.92, bandHeight * 0.78);
      addRight('dirt', y(0.50), rightW * 0.88, bandHeight * 0.72);
      addLeft('steel_plate', y(0.24), Math.min(112, leftW * 0.68), 42);
      break;
  }

  return fields;
}

function generateGroundGrid(
  baseY: number,
  bandHeight: number,
  blockIdx: number,
  motifId: LayoutMotifId,
  templateId: CityBlockTemplateId,
): GroundTile[] {
  void GROUND_X;
  void motifId;
  const out: GroundTile[] = [
    { type: 'city_pavement', x: 0, y: baseY + bandHeight / 2, w: C.WORLD_MAX_X - C.WORLD_MIN_X, h: bandHeight },
  ];
  out.push(...districtGroundFields(baseY, bandHeight, blockIdx, templateId));
  const parcels = cityParcelsForTemplate(baseY, bandHeight, blockIdx, templateId);

  for (const parcel of parcels) {
    out.push(...parcelGroundLayers(parcel, templateId, blockIdx));
  }

  return out;
}

function roadEnvelopeRects(street: StreetLayout): Rect[] {
  return street.roads.map((road) => {
    const pad = road.sidewalk + 10;
    return {
      x: road.x - road.w / 2 - pad,
      y: road.y - road.h / 2 - pad,
      w: road.w + pad * 2,
      h: road.h + pad * 2,
    };
  });
}

function addStreetStructure(
  layout: RampageLayoutBand,
  baseY: number,
  bandHeight: number,
  ctx: RampageGenerationContext,
  district: DistrictKind,
  templateId: CityBlockTemplateId,
): void {
  void district;
  const street = streetLayoutForTemplate(baseY, bandHeight, ctx.blockIdx, templateId);
  const primaryY = street.primaryY;
  const secondaryY = street.secondaryY;
  const lean = ctx.blockIdx % 2 === 0 ? 1 : -1;
  const sideStreetX = street.sideStreetX;
  const mainX = street.mainCorridorX;
  const branchDir = mainX <= 0 ? 1 : -1;

  for (const ix of street.intersections) {
    if (ix.major) {
      addFurniture(layout, 'traffic_light', ix.x - 22, ix.y - 23);
      addFurniture(layout, 'traffic_light', ix.x + 22, ix.y + 23);
    }
  }

  switch (templateId) {
    case 'shopping_street':
      addFurniture(layout, 'shop_awning', mainX - 24, primaryY - 20);
      addFurniture(layout, 'a_frame_sign', mainX + branchDir * 28, primaryY + 12);
      addFurniture(layout, 'vending', mainX - branchDir * 32, primaryY + 22);
      addFurniture(layout, 'bicycle_row', mainX + branchDir * 72, primaryY + 18);
      addFurnitureSeries(layout, 'chouchin', [mainX - 12, mainX + 12, mainX + branchDir * 42], primaryY - 18);
      break;
    case 'residential_lane':
      addFurniture(layout, 'mailbox', mainX + branchDir * 36, primaryY + 12);
      addFurniture(layout, 'wood_fence', mainX - branchDir * 74, secondaryY - 10);
      addFurniture(layout, 'hedge', mainX - branchDir * 46, secondaryY + 16);
      addFurniture(layout, 'potted_plant', mainX + branchDir * 48, primaryY - 16);
      addFurniture(layout, 'tree', mainX - branchDir * 92, secondaryY + 18);
      break;
    case 'downtown_crossing':
      addFurniture(layout, 'traffic_light', sideStreetX - 24, primaryY - 24);
      addFurniture(layout, 'traffic_light', sideStreetX + 24, primaryY + 24);
      addFurniture(layout, 'bollard', mainX - 18, primaryY - 34);
      addFurniture(layout, 'bollard', mainX + 18, primaryY + 34);
      addFurniture(layout, 'newspaper_stand', mainX - branchDir * 92, secondaryY + 16);
      addFurniture(layout, 'street_lamp', mainX + branchDir * 94, secondaryY - 18);
      addDecal(layout.groundDecals, 'parking_stall', mainX - branchDir * 92, secondaryY + 20, 72, 16, 0, 0.42);
      break;
    case 'civic_plaza':
      addFurniture(layout, 'bench', mainX - lean * 108, baseY + bandHeight * 0.49);
      addFurniture(layout, 'bench', mainX - lean * 58, baseY + bandHeight * 0.58);
      addFurniture(layout, 'street_lamp', mainX - lean * 28, primaryY - 10);
      addFurniture(layout, 'flower_bed', mainX - lean * 106, baseY + bandHeight * 0.36);
      addFurniture(layout, 'statue', mainX - lean * 126, baseY + bandHeight * 0.46);
      break;
    case 'station_front':
      addFurniture(layout, 'bus_stop', mainX + branchDir * 42, primaryY - 13);
      addFurniture(layout, 'taxi_rank_sign', mainX + branchDir * 82, primaryY + 13);
      addFurniture(layout, 'bicycle_rack', mainX - branchDir * 58, secondaryY - 12);
      addFurnitureSeries(layout, 'street_lamp', [mainX + branchDir * 92, mainX + branchDir * 132], secondaryY - 13);
      addFurniture(layout, 'signal_tower', mainX + branchDir * 126, secondaryY - 18);
      addDecal(layout.groundDecals, 'parking_stall', mainX + branchDir * 70, primaryY + 30, 98, 20, 0, 0.48);
      break;
    case 'construction_edge':
      addFurniture(layout, 'traffic_cone', mainX - lean * 54, primaryY + 12);
      addFurniture(layout, 'traffic_cone', mainX - lean * 86, primaryY + 15);
      addFurniture(layout, 'guardrail_short', mainX - lean * 112, primaryY - 8);
      addFurniture(layout, 'electric_box', mainX + lean * 30, secondaryY + 18);
      addDecal(layout.groundDecals, 'danger_stripe', mainX - lean * 80, primaryY, 92, 8, 0, 0.44);
      addFurniture(layout, 'sandbags', mainX - lean * 112, secondaryY + 13);
      addFurniture(layout, 'cargo_container', mainX - lean * 130, baseY + bandHeight * 0.72);
      break;
  }
}

function addTemplateStreetWalls(
  layout: RampageLayoutBand,
  baseY: number,
  bandHeight: number,
  ctx: RampageGenerationContext,
  templateId: CityBlockTemplateId,
): void {
  const street = streetLayoutForTemplate(baseY, bandHeight, ctx.blockIdx, templateId);
  const lean = ctx.blockIdx % 2 === 0 ? 1 : -1;
  const mainTop = street.primaryY - street.mainRoadH / 2 - street.mainWalkH - 17;
  const mainBottom = street.primaryY + street.mainRoadH / 2 + street.mainWalkH + 16;
  const sideLeft = street.sideStreetX - street.sideStreetW / 2 - street.sideWalkW - 15;
  const sideRight = street.sideStreetX + street.sideStreetW / 2 + street.sideWalkW + 15;
  const backY = street.secondaryY + (street.secondaryY < street.primaryY ? -1 : 1) * (street.alleyH / 2 + street.alleyWalkH + 8);
  const addFacades = (
    xs: readonly number[],
    y: number,
    widths: readonly number[],
    h: number,
    rot = 0,
    alpha = 0.92,
  ) => {
    xs.forEach((x, i) => addDecal(layout.groundDecals, 'facade_row', x, y, widths[i % widths.length], h, rot, alpha));
  };

  switch (templateId) {
    case 'shopping_street':
      addFacades([-142, -86, -30], mainTop, [48, 58, 46], 17, 0, 0.95);
      addFacades([42, 100, 154], mainBottom, [48, 62, 42], 16, Math.PI, 0.95);
      addDecal(layout.groundDecals, 'shop_stripe', -86, street.primaryY - street.mainRoadH / 2 - 6, 118, 5, 0, 0.62);
      addDecal(layout.groundDecals, 'shop_stripe', 104, street.primaryY + street.mainRoadH / 2 + 6, 126, 5, 0, 0.58);
      break;
    case 'residential_lane':
      addFacades([-138 * lean, -88 * lean], mainTop, [42, 48], 13, 0, 0.78);
      addFacades([86 * lean, 136 * lean], mainBottom, [44, 46], 13, Math.PI, 0.78);
      addFacades([-118 * lean, -64 * lean], backY, [40, 44], 12, 0, 0.70);
      break;
    case 'downtown_crossing':
      addFacades([-146, -74, 22], mainTop, [58, 64, 54], 20, 0, 0.95);
      addFacades([-112, -24, 86, 150], mainBottom, [54, 68, 56, 42], 20, Math.PI, 0.95);
      addDecal(layout.groundDecals, 'facade_row', sideLeft, baseY + bandHeight * 0.33, 52, 17, Math.PI / 2, 0.88);
      addDecal(layout.groundDecals, 'facade_row', sideLeft, baseY + bandHeight * 0.66, 58, 17, Math.PI / 2, 0.88);
      break;
    case 'civic_plaza':
      addFacades([-132, 132], mainTop, [58, 58], 15, 0, 0.82);
      addFacades([-80, 0, 80], mainBottom, [44, 52, 44], 14, Math.PI, 0.72);
      break;
    case 'station_front':
      addFacades([-126 * lean, -58 * lean, 28 * lean], mainTop, [56, 64, 56], 18, 0, 0.92);
      addFacades([46 * lean, 112 * lean], mainBottom, [62, 54], 17, Math.PI, 0.88);
      addDecal(layout.groundDecals, 'facade_row', sideRight, baseY + bandHeight * 0.42, 48, 14, Math.PI / 2, 0.74);
      addDecal(layout.groundDecals, 'facade_row', sideRight, baseY + bandHeight * 0.58, 52, 14, Math.PI / 2, 0.74);
      break;
    case 'construction_edge':
      addFacades([-128 * lean, -64 * lean, 16 * lean], mainTop, [50, 54, 48], 17, 0, 0.78);
      addFacades([82 * lean, 138 * lean], mainBottom, [52, 44], 16, Math.PI, 0.74);
      addDecal(layout.groundDecals, 'danger_stripe', 0, street.primaryY + street.mainRoadH / 2 + 5, 230, 8, 0, 0.48);
      break;
  }
}

function addTemplateLandmarkCore(
  layout: RampageLayoutBand,
  baseY: number,
  bandHeight: number,
  ctx: RampageGenerationContext,
  templateId: CityBlockTemplateId,
): void {
  const street = streetLayoutForTemplate(baseY, bandHeight, ctx.blockIdx, templateId);
  const lean = ctx.blockIdx % 2 === 0 ? 1 : -1;
  const centerY = baseY + bandHeight * 0.50;
  const mainX = street.mainCorridorX;
  const branchDir = mainX <= 0 ? 1 : -1;
  const plazaX = mainX - lean * 126;

  switch (templateId) {
    case 'shopping_street':
      addDecal(layout.groundDecals, 'shop_stripe', mainX - 18, centerY, 132, 7, Math.PI / 2, 0.68);
      addFurniture(layout, 'parasol', mainX + branchDir * 84, street.primaryY + 18);
      addFurniture(layout, 'popcorn_cart', mainX + branchDir * 102, street.primaryY - 10);
      break;
    case 'residential_lane':
      addDecal(layout.groundDecals, 'planter', mainX - branchDir * 96, centerY, 38, 26, 0, 0.64);
      addFurniture(layout, 'play_structure', mainX - branchDir * 112, centerY + 8);
      addFurniture(layout, 'sandbox', mainX - branchDir * 82, centerY + 16);
      addFurnitureSeries(layout, 'tree', [mainX + branchDir * 76, mainX + branchDir * 112, mainX + branchDir * 148], centerY - 30, 4);
      break;
    case 'downtown_crossing':
      addRoadDecal(layout.roadDecals, 'crosswalk', mainX, street.primaryY - 30, 48, 14, Math.PI / 2, 0.50, 'avenue');
      addFurnitureSeries(layout, 'traffic_light', [mainX - 28, mainX + 28], street.primaryY + 27);
      addFurniture(layout, 'telephone_booth', mainX - branchDir * 116, street.secondaryY + 18);
      break;
    case 'civic_plaza':
      addDecal(layout.groundDecals, 'plaza', plazaX, centerY, 140, 82, 0, 0.54);
      addDecal(layout.groundDecals, 'planter', plazaX - 48, centerY, 28, 18, 0, 0.70);
      addDecal(layout.groundDecals, 'planter', plazaX + 48, centerY, 28, 18, 0, 0.70);
      addFurniture(layout, 'fountain_large', plazaX, centerY);
      addFurnitureSeries(layout, 'bench', [plazaX - 58, plazaX - 24, plazaX + 24, plazaX + 58], centerY + 30);
      addFurniture(layout, 'flag_pole', plazaX, centerY - 34);
      break;
    case 'station_front':
      addFurnitureSeries(layout, 'street_lamp', [mainX + branchDir * 88, mainX + branchDir * 128], street.secondaryY - 16);
      addFurniture(layout, 'signal_tower', mainX + branchDir * 150, street.secondaryY + 12);
      break;
    case 'construction_edge':
      addDecal(layout.groundDecals, 'danger_stripe', mainX - lean * 82, centerY, 124, 10, 0, 0.54);
      addFurniture(layout, 'cargo_container', mainX - lean * 134, centerY + 5);
      addFurniture(layout, 'pallet_stack', mainX - lean * 94, centerY + 25);
      addFurnitureSeries(layout, 'traffic_cone', [mainX - lean * 42, mainX - lean * 14, mainX + lean * 14], centerY - 8, 3);
      addFurniture(layout, 'forklift', mainX - lean * 122, centerY + 24);
      break;
  }
}

function chooseMotif(ctx: RampageGenerationContext): LayoutMotifId {
  const phase = Math.abs(ctx.blockIdx) % 6;
  if (ctx.blockIdx < -3) return 'feed_chain';
  if (ctx.blockIdx < -1) return phase % 2 === 0 ? 'panic_plaza' : 'split_reward';
  if (ctx.overdrive) return phase % 2 === 0 ? 'score_wall' : 'split_reward';
  if (ctx.combo >= 14) return phase % 2 === 0 ? 'score_wall' : 'pinball_nest';
  if (ctx.momentum < 30) return phase % 2 === 0 ? 'feed_chain' : 'panic_plaza';
  if (ctx.momentum >= 72) return phase % 2 === 0 ? 'breaker_gate' : 'score_wall';
  return (['split_reward', 'pinball_nest', 'feed_chain', 'breaker_gate', 'panic_plaza', 'score_wall'] as const)[phase];
}

function intentForMotif(motifId: LayoutMotifId, ctx: RampageGenerationContext): BlockIntent {
  if (ctx.overdrive || motifId === 'score_wall') return 'cashout';
  switch (motifId) {
    case 'feed_chain': return 'recover';
    case 'panic_plaza': return 'choice';
    case 'split_reward': return 'choice';
    case 'breaker_gate': return 'gate';
    case 'pinball_nest': return 'gate';
  }
}

function districtForMotif(motifId: LayoutMotifId, ctx: RampageGenerationContext): DistrictKind {
  if (ctx.overdrive || ctx.momentum >= 72 || motifId === 'score_wall') return 'downtown';
  switch (motifId) {
    case 'feed_chain': return ctx.blockIdx % 3 === 0 ? 'residential' : 'market';
    case 'panic_plaza': return 'market';
    case 'split_reward': return ctx.blockIdx % 2 === 0 ? 'market' : 'civic';
    case 'breaker_gate': return 'downtown';
    case 'pinball_nest': return ctx.blockIdx % 2 === 0 ? 'civic' : 'downtown';
  }
}

function furniturePoolForBuilding(building: BuildingSpawnDef, district: DistrictKind): readonly FurnitureType[] {
  if (district === 'market' || building.role === 'release' || building.role === 'feeder') return MARKET_FURNITURE;
  if (district === 'residential' || building.role === 'bank') return RESIDENTIAL_FURNITURE;
  if (district === 'civic') return CIVIC_FURNITURE;
  return DOWNTOWN_FURNITURE;
}

function addBuildingFurniture(layout: RampageLayoutBand, building: BuildingSpawnDef, district: DistrictKind, idx: number): void {
  const def = C.BUILDING_DEFS[building.size];
  const pool = furniturePoolForBuilding(building, district);
  const seed = (building.blockIdx ?? 0) * 41 + idx * 17;
  const side = hash((building.blockIdx ?? 0) * 41 + idx * 17) > 0.5 ? 1 : -1;
  const sideX = building.x + side * (def.w * 0.5 + 7);
  const otherX = building.x - side * (def.w * 0.5 + 7);
  const frontY = building.y - Math.min(18, def.h * 0.42);
  const sideY = building.y - Math.min(10, def.h * 0.28);

  const alwaysFront = building.role === 'release' || building.role === 'feeder';
  if (alwaysFront || hash(seed + 3) > 0.34) {
    addFurniture(layout, pick(pool), sideX, frontY);
  }

  if ((building.role === 'release' || building.role === 'feeder') && hash(seed + 7) > 0.24) {
    addFurniture(layout, pick(['a_frame_sign', 'vending', 'chouchin', 'noren'] as const), otherX, sideY);
  } else if (district === 'residential' && hash(seed + 11) > 0.54) {
    addFurniture(layout, pick(['mailbox', 'potted_plant', 'wood_fence', 'flower_planter_row'] as const), otherX, sideY);
  } else if (district === 'civic' && hash(seed + 13) > 0.46) {
    addFurniture(layout, pick(['bench', 'street_lamp', 'flag_pole', 'flower_bed'] as const), otherX, sideY);
  } else if (district === 'downtown' && hash(idx + def.w) > 0.62) {
    addFurniture(layout, pick(['bollard', 'street_lamp', 'atm', 'newspaper_stand'] as const), otherX, sideY);
  }

  if (hash(idx * 29 + (building.blockIdx ?? 0)) > 0.84) {
    addFurniture(layout, pick(['manhole_cover', 'bicycle', 'garbage', 'street_mirror'] as const), building.x + side * 18, building.y - 6);
  }
}

function decorateBuildings(layout: RampageLayoutBand, district: DistrictKind): void {
  layout.buildings.forEach((building, idx) => {
    const def = C.BUILDING_DEFS[building.size];
    addDecal(layout.groundDecals, 'lot_frame', building.x, building.y - def.h * 0.34, def.w + 26, def.h + 18, 0, 0.32);
    addDecal(layout.groundDecals, 'impact_mark', building.x, building.y - 2, def.w + 11, 4, 0, 0.22);
    if (building.role === 'release') {
      addDecal(layout.groundDecals, 'shop_stripe', building.x, building.y - 11, def.w + 16, 5, 0, 0.70);
      addDecal(layout.groundDecals, 'crowd_spot', building.x, building.y - 13, def.w + 24, 13, 0, 0.34);
    } else if (building.role === 'vault') {
      addDecal(layout.groundDecals, 'score_mark', building.x, building.y - 12, def.w + 30, 11, 0, 0.44);
    } else if (building.role === 'stopper') {
      addDecal(layout.groundDecals, 'danger_stripe', building.x, building.y - 13, def.w + 24, 9, 0, 0.42);
    } else if (building.role === 'feeder') {
      addDecal(layout.groundDecals, 'shop_stripe', building.x, building.y - 10, def.w + 14, 4, 0, 0.48);
    }
    addBuildingFurniture(layout, building, district, idx);
  });
}

function buildFeedChain(layout: RampageLayoutBand, rects: Rect[], reserved: Rect[], baseY: number, bandHeight: number, ctx: RampageGenerationContext): void {
  const side = ctx.blockIdx % 2 === 0 ? 1 : -1;
  const intent = layout.intent;
  const points = [
    { x: -132 * side, y: baseY + 24, size: pick(SMALL_HOMES), role: 'bank' as PlacementRole },
    { x: -82 * side, y: baseY + 44, size: pick(SMALL_SHOPS), role: 'release' as PlacementRole },
    { x: -28 * side, y: baseY + 68, size: pick(SMALL_SHOPS), role: 'feeder' as PlacementRole },
    { x: 36 * side, y: baseY + 92, size: pick(SMALL_HOMES), role: 'feeder' as PlacementRole },
    { x: 92 * side, y: baseY + 116, size: pick(SMALL_SHOPS), role: 'release' as PlacementRole },
    { x: 136 * side, y: baseY + 145, size: pick(SMALL_HOMES), role: 'bank' as PlacementRole },
    { x: 42 * side, y: baseY + 154, size: pick(SMALL_SHOPS), role: 'release' as PlacementRole },
  ];

  points.forEach((point) => {
    placeBuilding(layout, rects, reserved, baseY, bandHeight, {
      ...point,
      blockIdx: ctx.blockIdx,
      intent,
      motifId: layout.motifId,
      jitterX: 6,
      jitterY: 5,
    });
  });

  for (let i = 0; i < points.length - 1; i++) addPathMark(layout.groundDecals, points[i], points[i + 1], 0.42);
  points.forEach((point, i) => addCrowd(layout.humans, point.x, point.y - 8, i % 2 === 0 ? 5 : 8, 18, 10, i % 2 === 0 ? 'runner' : 'crowd', 1));
}

function buildPanicPlaza(layout: RampageLayoutBand, rects: Rect[], reserved: Rect[], baseY: number, bandHeight: number, ctx: RampageGenerationContext): void {
  const intent = layout.intent;
  const cy = baseY + bandHeight * 0.50;
  addDecal(layout.groundDecals, 'plaza', 0, cy, 210, 124, ctx.blockIdx % 2 === 0 ? 0.04 : -0.04, 0.76);
  addDecal(layout.groundDecals, 'crowd_spot', 0, cy - 2, 132, 66, 0, 0.46);
  addDecal(layout.groundDecals, 'feed_mark', -78, cy - 46, 92, 7, 0.50, 0.28);
  addDecal(layout.groundDecals, 'feed_mark', 78, cy + 42, 92, 7, -0.50, 0.28);

  const specs: Array<Omit<BuildingSpec, 'intent' | 'motifId' | 'blockIdx'>> = [
    { x: -126, y: baseY + 28, size: pick(SMALL_SHOPS), role: 'release', jitterX: 5, jitterY: 4 },
    { x: -76, y: baseY + 74, size: pick(STOPPER_BUILDINGS), role: 'stopper', jitterX: 4, jitterY: 4 },
    { x: -134, y: baseY + 130, size: pick(SMALL_HOMES), role: 'bank', jitterX: 7, jitterY: 6 },
    { x: 118, y: baseY + 30, size: pick(SMALL_HOMES), role: 'bank', jitterX: 7, jitterY: 6 },
    { x: 76, y: baseY + 82, size: pick(SMALL_SHOPS), role: 'release', jitterX: 6, jitterY: 5 },
    { x: 132, y: baseY + 138, size: pick(STOPPER_BUILDINGS), role: 'stopper', jitterX: 5, jitterY: 4 },
    { x: -6, y: baseY + 122, size: pick(RELEASE_BUILDINGS), role: 'release', jitterX: 8, jitterY: 5 },
  ];

  specs.forEach((spec) => placeBuilding(layout, rects, reserved, baseY, bandHeight, {
    ...spec,
    intent,
    motifId: layout.motifId,
    blockIdx: ctx.blockIdx,
  }));
  addCrowd(layout.humans, 0, cy - 10, 24, 50, 28, 'crowd', 1);
  addCrowd(layout.humans, -108, baseY + 52, 8, 20, 12, 'runner', 1);
  addCrowd(layout.humans, 110, baseY + 118, 8, 20, 12, 'runner', 1);
}

function buildScoreWall(layout: RampageLayoutBand, rects: Rect[], reserved: Rect[], baseY: number, bandHeight: number, ctx: RampageGenerationContext): void {
  const side = ctx.blockIdx % 2 === 0 ? 1 : -1;
  const intent = layout.intent;
  addDecal(layout.groundDecals, 'score_mark', 0, baseY + bandHeight * 0.56, 276, 22, 0, 0.54);
  addDecal(layout.groundDecals, 'danger_stripe', 0, baseY + bandHeight * 0.38, 252, 10, 0, 0.45);
  const wall: Array<Omit<BuildingSpec, 'intent' | 'motifId' | 'blockIdx'>> = [
    { x: -70, y: baseY + 62, size: pick(VAULT_BUILDINGS), role: 'vault', jitterX: 3, jitterY: 4 },
    { x: -20, y: baseY + 80, size: pick(STOPPER_BUILDINGS), role: 'stopper', jitterX: 3, jitterY: 4 },
    { x: 34, y: baseY + 58, size: pick(VAULT_BUILDINGS), role: 'vault', jitterX: 3, jitterY: 4 },
    { x: 86, y: baseY + 86, size: pick(STOPPER_BUILDINGS), role: 'stopper', jitterX: 3, jitterY: 4 },
    { x: -132, y: baseY + 34, size: pick(SMALL_SHOPS), role: 'release', jitterX: 6, jitterY: 6 },
    { x: 136, y: baseY + 138, size: pick(SMALL_SHOPS), role: 'release', jitterX: 6, jitterY: 6 },
    { x: -132 * side, y: baseY + 152, size: pick(SMALL_HOMES), role: 'bank', jitterX: 7, jitterY: 6 },
  ];
  wall.forEach((spec) => placeBuilding(layout, rects, reserved, baseY, bandHeight, {
    ...spec,
    intent,
    motifId: layout.motifId,
    blockIdx: ctx.blockIdx,
  }));
  addPathMark(layout.groundDecals, { x: -132, y: baseY + 38 }, { x: -70, y: baseY + 84 }, 0.35);
  addPathMark(layout.groundDecals, { x: 136, y: baseY + 142 }, { x: 86, y: baseY + 96 }, 0.35);
  addCrowd(layout.humans, -132, baseY + 28, 10, 22, 10, 'crowd', 1);
  addCrowd(layout.humans, 136, baseY + 132, 10, 22, 10, 'crowd', 1);
  addCrowd(layout.humans, 8, baseY + 52, 6, 28, 10, 'vip', 2);
}

function buildSplitReward(layout: RampageLayoutBand, rects: Rect[], reserved: Rect[], baseY: number, bandHeight: number, ctx: RampageGenerationContext): void {
  const crowdSide = ctx.blockIdx % 2 === 0 ? -1 : 1;
  const scoreSide = -crowdSide;
  const intent = layout.intent;
  addDecal(layout.groundDecals, 'crowd_spot', crowdSide * 92, baseY + 78, 132, 86, crowdSide * 0.08, 0.48);
  addDecal(layout.groundDecals, 'score_mark', scoreSide * 90, baseY + 104, 130, 52, scoreSide * 0.08, 0.54);
  addDecal(layout.groundDecals, 'feed_mark', 0, baseY + 96, 166, 7, crowdSide * 0.44, 0.40);

  const specs: Array<Omit<BuildingSpec, 'intent' | 'motifId' | 'blockIdx'>> = [
    { x: crowdSide * 134, y: baseY + 28, size: pick(SMALL_SHOPS), role: 'release', jitterX: 7, jitterY: 6 },
    { x: crowdSide * 86, y: baseY + 68, size: pick(RELEASE_BUILDINGS), role: 'release', jitterX: 5, jitterY: 4 },
    { x: crowdSide * 132, y: baseY + 126, size: pick(SMALL_HOMES), role: 'bank', jitterX: 7, jitterY: 6 },
    { x: scoreSide * 66, y: baseY + 52, size: pick(STOPPER_BUILDINGS), role: 'stopper', jitterX: 4, jitterY: 4 },
    { x: scoreSide * 122, y: baseY + 82, size: pick(VAULT_BUILDINGS), role: 'vault', jitterX: 4, jitterY: 5 },
    { x: scoreSide * 62, y: baseY + 136, size: pick(STOPPER_BUILDINGS), role: 'bank', jitterX: 5, jitterY: 5 },
    { x: 0, y: baseY + 34, size: pick(SMALL_SHOPS), role: 'feeder', jitterX: 8, jitterY: 5 },
  ];
  specs.forEach((spec) => placeBuilding(layout, rects, reserved, baseY, bandHeight, {
    ...spec,
    intent,
    motifId: layout.motifId,
    blockIdx: ctx.blockIdx,
  }));
  addCrowd(layout.humans, crowdSide * 98, baseY + 76, 22, 40, 26, 'crowd', 1);
  addCrowd(layout.humans, scoreSide * 96, baseY + 84, 7, 24, 12, 'vip', 2);
  addCrowd(layout.humans, 0, baseY + 28, 6, 18, 10, 'runner', 1);
}

function buildBreakerGate(layout: RampageLayoutBand, rects: Rect[], reserved: Rect[], baseY: number, bandHeight: number, ctx: RampageGenerationContext): void {
  const intent = layout.intent;
  addDecal(layout.groundDecals, 'danger_stripe', 0, baseY + 83, 294, 16, 0, 0.54);
  addDecal(layout.groundDecals, 'danger_stripe', 0, baseY + 126, 246, 12, 0, 0.44);
  addDecal(layout.groundDecals, 'feed_mark', 0, baseY + 38, 164, 8, 0, 0.36);
  const specs: Array<Omit<BuildingSpec, 'intent' | 'motifId' | 'blockIdx'>> = [
    { x: -48, y: baseY + 58, size: pick(STOPPER_BUILDINGS), role: 'stopper', jitterX: 3, jitterY: 4 },
    { x: 48, y: baseY + 58, size: pick(STOPPER_BUILDINGS), role: 'stopper', jitterX: 3, jitterY: 4 },
    { x: 0, y: baseY + 108, size: pick(RELEASE_BUILDINGS), role: 'release', jitterX: 5, jitterY: 4 },
    { x: -132, y: baseY + 28, size: pick(SMALL_SHOPS), role: 'feeder', jitterX: 6, jitterY: 6 },
    { x: 132, y: baseY + 30, size: pick(SMALL_SHOPS), role: 'feeder', jitterX: 6, jitterY: 6 },
    { x: -122, y: baseY + 142, size: pick(SMALL_HOMES), role: 'bank', jitterX: 7, jitterY: 6 },
    { x: 122, y: baseY + 142, size: pick(SMALL_HOMES), role: 'bank', jitterX: 7, jitterY: 6 },
  ];
  specs.forEach((spec) => placeBuilding(layout, rects, reserved, baseY, bandHeight, {
    ...spec,
    intent,
    motifId: layout.motifId,
    blockIdx: ctx.blockIdx,
  }));
  addCrowd(layout.humans, 0, baseY + 98, 16, 38, 18, 'crowd', 1);
  addCrowd(layout.humans, -132, baseY + 24, 5, 16, 8, 'runner', 1);
  addCrowd(layout.humans, 132, baseY + 24, 5, 16, 8, 'runner', 1);
}

function buildPinballNest(layout: RampageLayoutBand, rects: Rect[], reserved: Rect[], baseY: number, bandHeight: number, ctx: RampageGenerationContext): void {
  const side = ctx.blockIdx % 2 === 0 ? 1 : -1;
  const intent = layout.intent;
  const bumpers = [
    { x: -92, y: baseY + 44 },
    { x: 0, y: baseY + 70 },
    { x: 92, y: baseY + 46 },
    { x: -48, y: baseY + 126 },
    { x: 54, y: baseY + 138 },
  ];
  bumpers.forEach((point, i) => {
    addDecal(layout.groundDecals, i % 2 === 0 ? 'score_mark' : 'danger_stripe', point.x, point.y - 12, 58, 10, side * (0.18 + i * 0.03), 0.46);
    placeBuilding(layout, rects, reserved, baseY, bandHeight, {
      x: point.x,
      y: point.y,
      size: pick(PINBALL_BOUNCERS),
      role: i % 2 === 0 ? 'stopper' : 'bank',
      intent,
      motifId: layout.motifId,
      blockIdx: ctx.blockIdx,
      jitterX: 4,
      jitterY: 4,
    });
  });
  placeBuilding(layout, rects, reserved, baseY, bandHeight, {
    x: -142 * side,
    y: baseY + 32,
    size: pick(SMALL_SHOPS),
    role: 'release',
    intent,
    motifId: layout.motifId,
    blockIdx: ctx.blockIdx,
    jitterX: 7,
    jitterY: 5,
  });
  placeBuilding(layout, rects, reserved, baseY, bandHeight, {
    x: 136 * side,
    y: baseY + 148,
    size: pick(RELEASE_BUILDINGS),
    role: 'release',
    intent,
    motifId: layout.motifId,
    blockIdx: ctx.blockIdx,
    jitterX: 6,
    jitterY: 5,
  });
  for (let i = 0; i < bumpers.length - 1; i++) addPathMark(layout.groundDecals, bumpers[i], bumpers[i + 1], 0.30);
  addCrowd(layout.humans, -142 * side, baseY + 24, 10, 22, 10, 'crowd', 1);
  addCrowd(layout.humans, 136 * side, baseY + 140, 12, 24, 12, 'crowd', 1);
  addCrowd(layout.humans, 0, baseY + 90, 6, 34, 14, 'runner', 1);
}

function addFallback(layout: RampageLayoutBand, rects: Rect[], reserved: readonly Rect[], baseY: number, bandHeight: number, ctx: RampageGenerationContext): void {
  const intent = layout.intent;
  const slots = [
    { x: -138, y: baseY + 38 },
    { x: 136, y: baseY + 68 },
    { x: -72, y: baseY + 126 },
    { x: 72, y: baseY + 146 },
  ];
  for (const slot of slots) {
    if (layout.buildings.length >= 4) break;
    placeBuilding(layout, rects, reserved, baseY, bandHeight, {
      x: slot.x,
      y: slot.y,
      size: pick(SMALL_SHOPS),
      role: 'release',
      intent,
      motifId: layout.motifId,
      blockIdx: ctx.blockIdx,
      jitterX: 8,
      jitterY: 6,
    });
  }
}

function addTemplateFrontage(
  layout: RampageLayoutBand,
  rects: Rect[],
  reserved: readonly Rect[],
  baseY: number,
  bandHeight: number,
  ctx: RampageGenerationContext,
  templateId: CityBlockTemplateId,
): void {
  const street = streetLayoutForTemplate(baseY, bandHeight, ctx.blockIdx, templateId);
  const lean = ctx.blockIdx % 2 === 0 ? 1 : -1;
  const intent = layout.intent;
  type Slot = {
    x: number;
    y: number;
    pool: readonly C.BuildingSize[];
    role: PlacementRole;
    jitterX?: number;
    jitterY?: number;
  };

  const storefrontY = street.primaryY - street.mainRoadH / 2 - 24;
  const oppositeY = street.primaryY + street.mainRoadH / 2 + 14;
  const backY = street.secondaryY - street.alleyH / 2 - 18;
  const farBackY = street.secondaryY + street.alleyH / 2 + 10;
  let slots: Slot[];

  switch (templateId) {
    case 'shopping_street':
      slots = [
        { x: -154, y: storefrontY, pool: SHOPPING_STREET_BUILDINGS, role: 'release', jitterX: 2, jitterY: 2 },
        { x: -112, y: storefrontY + 3, pool: SHOPPING_STREET_BUILDINGS, role: 'feeder', jitterX: 2, jitterY: 2 },
        { x: -70, y: storefrontY + 2, pool: SHOPPING_STREET_BUILDINGS, role: 'release', jitterX: 2, jitterY: 2 },
        { x: -24, y: storefrontY + 4, pool: SMALL_SHOPS, role: 'feeder', jitterX: 3, jitterY: 2 },
        { x: 66, y: oppositeY, pool: SHOPPING_STREET_BUILDINGS, role: 'feeder', jitterX: 3, jitterY: 2 },
        { x: 112, y: oppositeY + 2, pool: SHOPPING_STREET_BUILDINGS, role: 'release', jitterX: 2, jitterY: 2 },
        { x: 154, y: oppositeY + 2, pool: RELEASE_BUILDINGS, role: 'release', jitterX: 2, jitterY: 2 },
        { x: -138, y: farBackY, pool: SMALL_SHOPS, role: 'feeder', jitterX: 4, jitterY: 3 },
      ];
      addCrowd(layout.humans, -96, storefrontY - 4, 7, 34, 8, 'crowd', 1);
      addCrowd(layout.humans, 108, oppositeY - 5, 6, 30, 8, 'runner', 1);
      break;
    case 'residential_lane':
      slots = [
        { x: -146 * lean, y: baseY + 28, pool: SMALL_HOMES, role: 'bank', jitterX: 4, jitterY: 3 },
        { x: -102 * lean, y: baseY + 68, pool: SMALL_HOMES, role: 'feeder', jitterX: 4, jitterY: 3 },
        { x: -154 * lean, y: baseY + 112, pool: SMALL_HOMES, role: 'bank', jitterX: 4, jitterY: 3 },
        { x: 96 * lean, y: baseY + 104, pool: SMALL_HOMES, role: 'bank', jitterX: 4, jitterY: 3 },
        { x: 142 * lean, y: baseY + 144, pool: SMALL_HOMES, role: 'feeder', jitterX: 4, jitterY: 3 },
        { x: -28 * lean, y: farBackY, pool: SMALL_SHOPS, role: 'release', jitterX: 5, jitterY: 4 },
        { x: 34 * lean, y: backY, pool: SMALL_HOMES, role: 'bank', jitterX: 5, jitterY: 4 },
      ];
      addCrowd(layout.humans, -128 * lean, baseY + 70, 4, 20, 10, 'runner', 1);
      break;
    case 'downtown_crossing':
      slots = [
        { x: -146, y: storefrontY, pool: DOWNTOWN_BUILDINGS, role: 'vault', jitterX: 2, jitterY: 2 },
        { x: -92, y: oppositeY, pool: STOPPER_BUILDINGS, role: 'stopper', jitterX: 2, jitterY: 2 },
        { x: 92, y: storefrontY + 2, pool: DOWNTOWN_BUILDINGS, role: 'bank', jitterX: 2, jitterY: 2 },
        { x: 146, y: oppositeY + 2, pool: VAULT_BUILDINGS, role: 'vault', jitterX: 2, jitterY: 2 },
        { x: -18, y: backY, pool: SMALL_SHOPS, role: 'release', jitterX: 4, jitterY: 3 },
        { x: 34, y: farBackY, pool: DOWNTOWN_BUILDINGS, role: 'bank', jitterX: 3, jitterY: 3 },
        { x: -150 * lean, y: farBackY, pool: VAULT_BUILDINGS, role: 'vault', jitterX: 2, jitterY: 2 },
      ];
      addCrowd(layout.humans, street.sideStreetX, street.primaryY, 5, 18, 12, 'runner', 1);
      break;
    case 'civic_plaza':
      slots = [
        { x: -136, y: baseY + 28, pool: CIVIC_BUILDINGS, role: 'bank', jitterX: 3, jitterY: 3 },
        { x: 136, y: baseY + 30, pool: CIVIC_BUILDINGS, role: 'release', jitterX: 3, jitterY: 3 },
        { x: -132, y: baseY + 132, pool: SMALL_SHOPS, role: 'feeder', jitterX: 5, jitterY: 4 },
        { x: 130, y: baseY + 136, pool: CIVIC_BUILDINGS, role: 'bank', jitterX: 4, jitterY: 4 },
        { x: 0, y: baseY + 138, pool: RELEASE_BUILDINGS, role: 'release', jitterX: 5, jitterY: 4 },
      ];
      addCrowd(layout.humans, 0, baseY + bandHeight * 0.48, 8, 54, 22, 'crowd', 1);
      break;
    case 'station_front':
      slots = [
        { x: -126 * lean, y: storefrontY, pool: ['train_station', 'bus_terminal_shelter'] as const, role: 'release', jitterX: 2, jitterY: 2 },
        { x: -62 * lean, y: oppositeY + 2, pool: SMALL_SHOPS, role: 'feeder', jitterX: 4, jitterY: 3 },
        { x: 22 * lean, y: storefrontY + 4, pool: SMALL_SHOPS, role: 'release', jitterX: 4, jitterY: 3 },
        { x: 96 * lean, y: farBackY, pool: RELEASE_BUILDINGS, role: 'release', jitterX: 3, jitterY: 3 },
        { x: 148 * lean, y: oppositeY, pool: SMALL_SHOPS, role: 'feeder', jitterX: 4, jitterY: 3 },
        { x: -146 * lean, y: farBackY + 4, pool: SMALL_SHOPS, role: 'feeder', jitterX: 4, jitterY: 3 },
        { x: 50 * lean, y: oppositeY + 18, pool: ['bus_terminal_shelter', 'parking'] as const, role: 'release', jitterX: 3, jitterY: 3 },
      ];
      addCrowd(layout.humans, -74 * lean, street.primaryY - 8, 8, 42, 12, 'crowd', 1);
      addCrowd(layout.humans, 74 * lean, street.primaryY + 8, 5, 26, 10, 'runner', 1);
      break;
    case 'construction_edge':
      slots = [
        { x: -136 * lean, y: baseY + 30, pool: ['warehouse', 'parking', 'supermarket'] as const, role: 'stopper', jitterX: 3, jitterY: 3 },
        { x: -68 * lean, y: baseY + 76, pool: STOPPER_BUILDINGS, role: 'stopper', jitterX: 3, jitterY: 3 },
        { x: 26 * lean, y: baseY + 110, pool: PINBALL_BOUNCERS, role: 'bank', jitterX: 4, jitterY: 3 },
        { x: 104 * lean, y: baseY + 142, pool: RELEASE_BUILDINGS, role: 'release', jitterX: 4, jitterY: 3 },
        { x: 150 * lean, y: baseY + 70, pool: DOWNTOWN_BUILDINGS, role: 'vault', jitterX: 3, jitterY: 3 },
        { x: -146 * lean, y: baseY + 132, pool: ['warehouse', 'parking'] as const, role: 'stopper', jitterX: 3, jitterY: 3 },
        { x: 64 * lean, y: baseY + 36, pool: ['factory_stack', 'container_stack', 'warehouse'] as const, role: 'vault', jitterX: 4, jitterY: 3 },
      ];
      addCrowd(layout.humans, 94 * lean, baseY + 128, 5, 24, 10, 'runner', 1);
      break;
  }

  slots.forEach((slot) => {
    placeBuilding(layout, rects, reserved, baseY, bandHeight, {
      x: slot.x,
      y: slot.y,
      size: pick(slot.pool),
      role: slot.role,
      intent,
      motifId: layout.motifId,
      blockIdx: ctx.blockIdx,
      jitterX: slot.jitterX,
      jitterY: slot.jitterY,
    });
  });
}

function addCityParcelDetails(
  layout: RampageLayoutBand,
  baseY: number,
  bandHeight: number,
  ctx: RampageGenerationContext,
  templateId: CityBlockTemplateId,
): void {
  const street = streetLayoutForTemplate(baseY, bandHeight, ctx.blockIdx, templateId);
  const parcels = cityParcelsForTemplate(baseY, bandHeight, ctx.blockIdx, templateId);
  for (const parcel of parcels) {
    const frameAlpha =
      parcel.kind === 'park' ? 0.16 :
      parcel.kind === 'construction' ? 0.34 :
      0.28;
    addDecal(layout.groundDecals, 'lot_frame', parcel.x, parcel.y, parcel.w, parcel.h, 0, frameAlpha);
    for (const plan of parcel.decor) {
      addDecal(layout.groundDecals, plan.decal, plan.x, plan.y, plan.w, plan.h, plan.rot ?? 0, plan.alpha ?? 1);
    }
    addParcelSignatureFurniture(layout, parcel, ctx.blockIdx);
    if (parcel.frontageSide === 'east' || parcel.frontageSide === 'west') {
      const parcelEdgeX = parcel.x + (parcel.frontageSide === 'east' ? parcel.w / 2 : -parcel.w / 2);
      const roadEdgeSign = parcelEdgeX < street.mainCorridorX ? -1 : 1;
      const roadEdgeX = street.mainCorridorX + roadEdgeSign * (street.mainRoadH / 2 + street.mainWalkH + 1);
      const connectorW = Math.abs(roadEdgeX - parcelEdgeX);
      if (connectorW > 8 && connectorW < 94) {
        addDecal(layout.groundDecals, 'driveway', (roadEdgeX + parcelEdgeX) / 2, parcel.y, connectorW, parcel.kind === 'towers' || parcel.kind === 'station' ? 11 : 8, 0, parcel.kind === 'park' ? 0.34 : 0.50);
      }
    }
  }
}

function parcelFrontPoint(parcel: CityParcel, along = 0, inset = 14): { x: number; y: number } {
  switch (parcel.frontageSide) {
    case 'north':
      return { x: parcel.x + along * parcel.w * 0.42, y: parcel.y - parcel.h / 2 + inset };
    case 'south':
      return { x: parcel.x + along * parcel.w * 0.42, y: parcel.y + parcel.h / 2 - inset };
    case 'west':
      return { x: parcel.x - parcel.w / 2 + inset, y: parcel.y + along * parcel.h * 0.42 };
    case 'east':
      return { x: parcel.x + parcel.w / 2 - inset, y: parcel.y + along * parcel.h * 0.42 };
    case 'center':
      return { x: parcel.x + along * parcel.w * 0.24, y: parcel.y + inset * 0.18 };
  }
}

function addParcelSignatureFurniture(layout: RampageLayoutBand, parcel: CityParcel, blockIdx: number): void {
  const phase = positiveMod(blockIdx + parcel.id.length, 4);
  const frontA = parcelFrontPoint(parcel, -0.34, 12);
  const frontB = parcelFrontPoint(parcel, 0.34, 12);
  const frontC = parcelFrontPoint(parcel, 0, 18);

  switch (parcel.kind) {
    case 'shops':
      addFurniture(layout, phase % 2 === 0 ? 'chouchin' : 'noren', frontA.x, frontA.y);
      addFurniture(layout, phase % 3 === 0 ? 'kerbside_vending_pair' : 'vending', frontB.x, frontB.y);
      addFurniture(layout, 'bicycle_row', frontC.x, frontC.y);
      break;
    case 'homes': {
      const yardA = parcelFrontPoint(parcel, -0.38, 22);
      const yardB = parcelFrontPoint(parcel, 0.38, 22);
      addFurniture(layout, 'wood_fence', frontA.x, frontA.y);
      addFurniture(layout, phase % 2 === 0 ? 'mailbox' : 'post_letter_box', frontC.x, frontC.y);
      addFurniture(layout, phase % 2 === 0 ? 'tree' : 'flower_planter_row', yardB.x, yardB.y);
      addFurniture(layout, 'potted_plant', yardA.x, yardA.y);
      break;
    }
    case 'towers':
      addFurniture(layout, 'bollard', frontA.x, frontA.y);
      addFurniture(layout, 'bollard', frontB.x, frontB.y);
      addFurniture(layout, phase % 2 === 0 ? 'atm' : 'newspaper_stand', frontC.x, frontC.y);
      break;
    case 'civic':
      addFurniture(layout, 'flag_pole', frontC.x, frontC.y);
      addFurniture(layout, 'bench', frontA.x, frontA.y);
      addFurniture(layout, 'flower_bed', frontB.x, frontB.y);
      break;
    case 'station':
      addFurniture(layout, 'platform_edge', frontC.x, frontC.y);
      addFurniture(layout, 'bus_stop', frontA.x, frontA.y);
      addFurniture(layout, 'taxi_rank_sign', frontB.x, frontB.y);
      break;
    case 'park':
      addFurniture(layout, phase % 2 === 0 ? 'fountain_large' : 'play_structure', parcel.x, parcel.y);
      addFurniture(layout, 'bench', frontA.x, frontA.y);
      addFurniture(layout, 'flower_bed', frontB.x, frontB.y);
      break;
    case 'construction':
      addFurniture(layout, 'traffic_cone', frontA.x, frontA.y);
      addFurniture(layout, 'traffic_cone', frontC.x, frontC.y);
      addFurniture(layout, phase % 2 === 0 ? 'cargo_container' : 'pallet_stack', parcel.x, parcel.y + parcel.h * 0.18);
      addFurniture(layout, 'sandbags', frontB.x, frontB.y);
      break;
  }
}

function furniturePointForSlot(slot: FrontageSlot, parcel: CityParcel, itemIndex: number): { x: number; y: number } {
  const laneOffset = itemIndex % 2 === 0 ? -7 : 7;
  switch (parcel.frontageSide) {
    case 'north':
      return { x: slot.x + laneOffset, y: slot.y - 13 };
    case 'south':
      return { x: slot.x + laneOffset, y: slot.y + 13 };
    case 'west':
      return { x: slot.x - 13, y: slot.y + laneOffset };
    case 'east':
      return { x: slot.x + 13, y: slot.y + laneOffset };
    case 'center':
      return { x: slot.x + laneOffset, y: slot.y + 12 };
  }
}

function addParcelFrontages(
  layout: RampageLayoutBand,
  rects: Rect[],
  reserved: readonly Rect[],
  baseY: number,
  bandHeight: number,
  ctx: RampageGenerationContext,
  templateId: CityBlockTemplateId,
): void {
  const parcels = cityParcelsForTemplate(baseY, bandHeight, ctx.blockIdx, templateId);
  const intent = layout.intent;

  for (const parcel of parcels) {
    parcel.slots.forEach((slot, idx) => {
      placeBuilding(layout, rects, reserved, baseY, bandHeight, {
        x: slot.x,
        y: slot.y,
        size: pick(slot.pool),
        role: slot.role,
        intent,
        motifId: layout.motifId,
        blockIdx: ctx.blockIdx,
        jitterX: slot.jitterX,
        jitterY: slot.jitterY,
      });

      const decor = slot.decor ?? furnitureForParcel(parcel.kind);
      const primary = decor[idx % decor.length];
      const p = furniturePointForSlot(slot, parcel, idx);
      addFurniture(layout, primary, p.x, p.y);
      if (idx % 2 === 0 && parcel.kind !== 'towers') {
        const secondary = decor[(idx + 2) % decor.length];
        const q = furniturePointForSlot(slot, parcel, idx + 1);
        addFurniture(layout, secondary, q.x, q.y);
      }
    });

    if (parcel.kind === 'shops' || parcel.kind === 'station') {
      addCrowd(layout.humans, parcel.x, parcel.y, parcel.kind === 'station' ? 8 : 6, parcel.w * 0.26, parcel.h * 0.22, 'crowd', 1);
    } else if (parcel.kind === 'homes') {
      addCrowd(layout.humans, parcel.x, parcel.y, 3, parcel.w * 0.22, parcel.h * 0.22, 'runner', 1);
    } else if (parcel.kind === 'park') {
      addCrowd(layout.humans, parcel.x, parcel.y, 5, parcel.w * 0.22, parcel.h * 0.20, 'runner', 1);
    }
  }
}

function addDistrictAmenities(
  layout: RampageLayoutBand,
  baseY: number,
  bandHeight: number,
  ctx: RampageGenerationContext,
  district: DistrictKind,
  templateId: CityBlockTemplateId,
): void {
  const centerY = baseY + bandHeight * 0.52;
  const street = streetLayoutForTemplate(baseY, bandHeight, ctx.blockIdx, templateId);
  const mainX = roadXAtY(street.graph, centerY);
  const amenityDir = mainX <= 0 ? 1 : -1;
  const x = clamp(mainX + amenityDir * 106, C.WORLD_MIN_X + 54, C.WORLD_MAX_X - 54);
  const plazaX = clamp(mainX + amenityDir * 118, C.WORLD_MIN_X + 70, C.WORLD_MAX_X - 70);

  if (templateId === 'station_front') {
    addDecal(layout.groundDecals, 'parking_stall', x, centerY + 28, 110, 18, 0, 0.58);
    addRoadDecal(layout.roadDecals, 'crosswalk', mainX, centerY + 8, 82, 18, 0, 0.62, 'street');
    addFurniture(layout, 'bus_stop', x - 26 * amenityDir, centerY - 26);
    addFurniture(layout, 'taxi_rank_sign', x + 30 * amenityDir, centerY + 28);
    addFurniture(layout, 'bicycle_rack', x - 10 * amenityDir, centerY - 34);
    addCrowd(layout.humans, x - 18 * amenityDir, centerY - 6, 6, 22, 9, 'crowd', 1);
  } else if (templateId === 'construction_edge') {
    addDecal(layout.groundDecals, 'danger_stripe', x, centerY - 18, 112, 8, 0, 0.42);
    addFurniture(layout, 'traffic_cone', x - 46, centerY - 8);
    addFurniture(layout, 'traffic_cone', x - 18, centerY - 8);
    addFurniture(layout, 'traffic_cone', x + 10, centerY - 8);
    addFurniture(layout, 'guardrail_short', x + 44, centerY + 14);
    addFurniture(layout, 'electric_box', x - 42, centerY + 18);
  } else if (templateId === 'civic_plaza') {
    addDecal(layout.groundDecals, 'plaza', plazaX, centerY, 132, 72, 0, 0.42);
    addRoadDecal(layout.roadDecals, 'crosswalk', mainX, centerY, 46, 16, Math.PI / 2, 0.44, 'lane');
    addFurniture(layout, 'fountain_large', plazaX, centerY);
    addFurniture(layout, 'bench', plazaX - 38, centerY - 18);
    addFurniture(layout, 'bench', plazaX + 38, centerY + 18);
    addFurniture(layout, 'street_lamp', plazaX - 62, centerY + 24);
    addFurniture(layout, 'street_lamp', plazaX + 62, centerY - 24);
  } else if (district === 'market') {
    addDecal(layout.groundDecals, 'plaza', x, centerY, 104, 48, amenityDir * 0.04, 0.34);
    addDecal(layout.groundDecals, 'shop_stripe', x, centerY - 20, 96, 5, 0, 0.42);
    addFurniture(layout, 'shop_awning', x - 32, centerY - 18);
    addFurniture(layout, 'a_frame_sign', x + 5, centerY - 18);
    addFurniture(layout, 'vending', x + 34, centerY - 17);
    addFurniture(layout, 'bicycle_rack', x - 42, centerY + 17);
    addCrowd(layout.humans, x + 14, centerY - 10, 5, 18, 8, 'crowd', 1);
  } else if (district === 'residential') {
    addDecal(layout.groundDecals, 'plaza', x, centerY, 92, 52, 0, 0.22);
    addFurniture(layout, 'tree', x - 28, centerY + 10);
    addFurniture(layout, 'bench', x + 4, centerY + 14);
    addFurniture(layout, 'flower_planter_row', x + 30, centerY - 14);
    addFurniture(layout, 'mailbox', x - 34, centerY - 15);
  } else if (district === 'civic') {
    addDecal(layout.groundDecals, 'plaza', plazaX, centerY, 132, 72, 0, 0.46);
    addRoadDecal(layout.roadDecals, 'crosswalk', mainX, centerY, 46, 16, Math.PI / 2, 0.44, 'lane');
    addFurniture(layout, 'fountain_large', plazaX, centerY);
    addFurniture(layout, 'bench', plazaX - 38, centerY - 18);
    addFurniture(layout, 'bench', plazaX + 38, centerY + 18);
    addFurniture(layout, 'street_lamp', plazaX - 62, centerY + 24);
    addFurniture(layout, 'street_lamp', plazaX + 62, centerY - 24);
  } else {
    addDecal(layout.groundDecals, 'parking_stall', x, centerY, 118, 36, 0, 0.72);
    addDecal(layout.groundDecals, 'danger_stripe', x, centerY - 24, 112, 7, 0, 0.26);
    addFurniture(layout, 'car', x - 30, centerY + 4);
    addFurniture(layout, 'taxi_rank_sign', x + 36, centerY - 16);
    addFurniture(layout, 'street_lamp', x - 58, centerY - 18);
    addFurniture(layout, 'bollard', x + 58, centerY + 17);
  }
}

export interface RampageRoadDebug {
  blockIdx: number;
  templateId: string;
  bottomX: number;
  topX: number;
  roads: Array<{
    role: StreetRoadRole;
    orientation: 'h' | 'v';
    x: number;
    y: number;
    w: number;
    h: number;
    endpoint: StreetRoadEndpoint;
  }>;
  roadSurfaces: Array<{
    kind: RoadSurface['kind'];
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  roadDecals: Array<{
    kind: RoadDecal['kind'];
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  grounds: Array<{ type: GroundTile['type']; x: number; y: number; w: number; h: number }>;
  groundDecals: Array<{ kind: GroundDecal['kind']; x: number; y: number; w: number; h: number }>;
  edges: Array<{
    role: StreetRoadRole;
    from: { x: number; y: number };
    to: { x: number; y: number };
    endpoint: StreetRoadEndpoint;
    mainPath: boolean;
  }>;
}

export function debugRampageRoadLayoutBand(
  baseY: number,
  bandHeight: number,
  ctx: RampageGenerationContext,
): RampageRoadDebug {
  const motifId = chooseMotif(ctx);
  const district = districtForMotif(motifId, ctx);
  const templateId = chooseCityBlockTemplate(motifId, district, ctx);
  const street = streetLayoutForTemplate(baseY, bandHeight, ctx.blockIdx, templateId);
  const layout = generateRampageLayoutBand(baseY, bandHeight, ctx);
  return {
    blockIdx: ctx.blockIdx,
    templateId,
    bottomX: street.graph.bottomX,
    topX: street.graph.topX,
    roads: street.roads.map((road) => ({
      role: road.role,
      orientation: road.orientation,
      x: road.x,
      y: road.y,
      w: road.w,
      h: road.h,
      endpoint: road.endpoint,
    })),
    roadSurfaces: layout.roadSurfaces.map((surface) => ({
      kind: surface.kind,
      x: surface.x,
      y: surface.y,
      w: surface.w,
      h: surface.h,
    })),
    roadDecals: layout.roadDecals.map((decal) => ({
      kind: decal.kind,
      x: decal.x,
      y: decal.y,
      w: decal.w,
      h: decal.h,
    })),
    grounds: layout.grounds.map((ground) => ({
      type: ground.type,
      x: ground.x,
      y: ground.y,
      w: ground.w,
      h: ground.h,
    })),
    groundDecals: layout.groundDecals.map((decal) => ({
      kind: decal.kind,
      x: decal.x,
      y: decal.y,
      w: decal.w,
      h: decal.h,
    })),
    edges: street.graph.edges.map((edge) => ({
      role: edge.role,
      from: { x: edge.from.x, y: edge.from.y },
      to: { x: edge.to.x, y: edge.to.y },
      endpoint: edge.endpoint,
      mainPath: edge.mainPath,
    })),
  };
}

export function generateRampageLayoutBand(
  baseY: number,
  bandHeight: number,
  ctx: RampageGenerationContext,
): RampageLayoutBand {
  const motifId = chooseMotif(ctx);
  const district = districtForMotif(motifId, ctx);
  const templateId = chooseCityBlockTemplate(motifId, district, ctx);
  const layout = createLayout(baseY, bandHeight, ctx, motifId, templateId);
  const rects: Rect[] = [];
  const street = streetLayoutForTemplate(baseY, bandHeight, ctx.blockIdx, templateId);
  const reserved = [...noBuildZones(baseY, ctx.blockIdx), ...roadEnvelopeRects(street)];
  addStreetStructure(layout, baseY, bandHeight, ctx, district, templateId);
  addCityParcelDetails(layout, baseY, bandHeight, ctx, templateId);
  addTemplateLandmarkCore(layout, baseY, bandHeight, ctx, templateId);
  addParcelFrontages(layout, rects, reserved, baseY, bandHeight, ctx, templateId);

  switch (motifId) {
    case 'feed_chain':
      buildFeedChain(layout, rects, reserved, baseY, bandHeight, ctx);
      break;
    case 'panic_plaza':
      buildPanicPlaza(layout, rects, reserved, baseY, bandHeight, ctx);
      break;
    case 'score_wall':
      buildScoreWall(layout, rects, reserved, baseY, bandHeight, ctx);
      break;
    case 'split_reward':
      buildSplitReward(layout, rects, reserved, baseY, bandHeight, ctx);
      break;
    case 'breaker_gate':
      buildBreakerGate(layout, rects, reserved, baseY, bandHeight, ctx);
      break;
    case 'pinball_nest':
      buildPinballNest(layout, rects, reserved, baseY, bandHeight, ctx);
      break;
  }

  addFallback(layout, rects, reserved, baseY, bandHeight, ctx);
  addDistrictAmenities(layout, baseY, bandHeight, ctx, district, templateId);
  decorateBuildings(layout, district);
  trimRoadOverlappingGroundDecals(layout, roadEnvelopeRects(street));
  capPrePlacedHumans(layout);
  return layout;
}

export function generateInitialRampageLayout(): RampageLayoutBand[] {
  const out: RampageLayoutBand[] = [];
  for (
    let baseY = C.WORLD_MIN_Y + 10, blockIdx = -4;
    baseY < C.WORLD_MAX_Y - 20;
    baseY += C.CHUNK_HEIGHT, blockIdx++
  ) {
    out.push(generateRampageLayoutBand(baseY, C.CHUNK_HEIGHT, {
      blockIdx,
      momentum: blockIdx < -2 ? 22 : 38,
      overdrive: false,
      combo: 0,
    }));
  }
  return out;
}

export function generateInitialRampageCity(): BuildingSpawnDef[] {
  return generateInitialRampageLayout().flatMap((band) => band.buildings);
}

export function generateRampageBand(
  baseY: number,
  bandHeight: number,
  ctx: RampageGenerationContext,
): BuildingSpawnDef[] {
  return generateRampageLayoutBand(baseY, bandHeight, ctx).buildings;
}
