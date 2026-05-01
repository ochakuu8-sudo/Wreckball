import * as C from './constants';
import { writeInst } from './renderer';

export interface RampageBuildingVisual {
  kind: C.BuildingSize;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  tier: number;
  active: boolean;
  flash: number;
  color: readonly [number, number, number];
}

export interface RampageBuildingDrawOptions {
  currentPower: number;
  overdrive: boolean;
}

type VisualCategory = 'residential' | 'shop' | 'apartment' | 'office' | 'industrial' | 'landmark';
type RGB = readonly [number, number, number];

const RESIDENTIAL = new Set<C.BuildingSize>(['house', 'townhouse', 'garage', 'bungalow', 'duplex', 'mansion', 'kominka', 'machiya', 'shed', 'greenhouse']);
const SHOP = new Set<C.BuildingSize>(['shop', 'convenience', 'restaurant', 'cafe', 'bakery', 'ramen', 'izakaya', 'bookstore', 'pharmacy', 'florist', 'laundromat', 'snack', 'yatai', 'wagashi', 'kimono_shop', 'sushi_ya', 'chaya']);
const APARTMENT = new Set<C.BuildingSize>(['apartment', 'supermarket', 'bank', 'library', 'museum', 'business_hotel', 'capsule_hotel', 'parking', 'karaoke', 'pachinko', 'game_center', 'love_hotel', 'club', 'ryokan', 'onsen_inn']);
const INDUSTRIAL = new Set<C.BuildingSize>(['warehouse', 'factory_stack', 'container_stack', 'gas_station', 'silo', 'crane_gantry']);
const LANDMARK = new Set<C.BuildingSize>(['train_station', 'stadium', 'ferris_wheel', 'roller_coaster', 'castle', 'clock_tower', 'radio_tower', 'school', 'hospital', 'city_hall', 'fire_station', 'police_station', 'department_store', 'shrine', 'temple', 'pagoda', 'tahoto', 'carousel', 'big_tent', 'water_tower', 'fountain_pavilion', 'bus_terminal_shelter']);

function category(kind: C.BuildingSize): VisualCategory {
  if (RESIDENTIAL.has(kind)) return 'residential';
  if (SHOP.has(kind)) return 'shop';
  if (APARTMENT.has(kind)) return 'apartment';
  if (INDUSTRIAL.has(kind)) return 'industrial';
  if (LANDMARK.has(kind)) return 'landmark';
  return 'office';
}

function darken(c: RGB, m: number): RGB { return [c[0] * m, c[1] * m, c[2] * m]; }
function brighten(c: RGB, m: number): RGB { return [Math.min(1, c[0] * m), Math.min(1, c[1] * m), Math.min(1, c[2] * m)]; }
function stripeColor(cat: VisualCategory, base: RGB): RGB {
  if (cat === 'industrial') return [0.92, 0.72, 0.16];
  if (cat === 'shop') return brighten(base, 1.35);
  if (cat === 'landmark') return [0.95, 0.82, 0.34];
  return brighten(base, 1.18);
}
function deterministic(x: number, y: number, salt: number): number {
  const v = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
  return v - Math.floor(v);
}

export function drawRampageGround(buf: Float32Array, n: number, cameraY: number): number {
  const base = Math.floor((cameraY + C.WORLD_MIN_Y) / 80) * 80;
  for (let y = base; y < cameraY + C.WORLD_MAX_Y + 80; y += 80) {
    for (let i = 0; i < 8; i++) {
      const x = -170 + i * 48 + deterministic(i, y, 3) * 18;
      const yy = y + deterministic(i, y, 9) * 70;
      const s = 1.5 + deterministic(i, y, 18) * 3.5;
      writeInst(buf, n++, x, yy, s, s, 0.15, 0.14, 0.15, 0.32);
    }
    if (deterministic(y, 0, 5) > 0.58) {
      const x = -150 + deterministic(y, 0, 6) * 300;
      const yy = y + 16 + deterministic(y, 0, 7) * 48;
      writeInst(buf, n++, x, yy, 34, 2, 0.20, 0.19, 0.18, 0.18, deterministic(y, 0, 8) * 0.6 - 0.3);
    }
  }
  return n;
}

export function drawRampageBuilding(buf: Float32Array, n: number, b: RampageBuildingVisual, opts: RampageBuildingDrawOptions): number {
  if (!b.active) return n;
  const cat = category(b.kind);
  const canBreak = opts.currentPower >= b.tier;
  const base = b.flash > 0 ? [1, 1, 1] as RGB : (canBreak ? b.color : darken(b.color, 0.58));
  n = drawShadow(buf, n, b);
  n = drawOutline(buf, n, b, canBreak, opts.overdrive);
  switch (cat) {
    case 'residential': return drawResidential(buf, n, b, base, canBreak);
    case 'shop': return drawShop(buf, n, b, base, canBreak);
    case 'apartment': return drawApartment(buf, n, b, base, canBreak);
    case 'office': return drawOffice(buf, n, b, base, canBreak);
    case 'industrial': return drawIndustrial(buf, n, b, base, canBreak);
    case 'landmark': return drawLandmark(buf, n, b, base, canBreak);
  }
}

function drawShadow(buf: Float32Array, n: number, b: RampageBuildingVisual): number {
  writeInst(buf, n++, b.x + 3, b.y + 2, b.w + 7, 7, 0.02, 0.018, 0.018, 0.34);
  return n;
}
function drawOutline(buf: Float32Array, n: number, b: RampageBuildingVisual, canBreak: boolean, overdrive: boolean): number {
  const c: RGB = overdrive ? [1, 0.88, 0.22] : canBreak ? [0.95, 0.73, 0.18] : [0.44, 0.10, 0.10];
  writeInst(buf, n++, b.x, b.y + b.h / 2, b.w + 4, b.h + 4, c[0], c[1], c[2], canBreak || overdrive ? 0.75 : 0.72);
  return n;
}
function facade(buf: Float32Array, n: number, b: RampageBuildingVisual, c: RGB): number {
  writeInst(buf, n++, b.x, b.y + b.h / 2, b.w, b.h, c[0], c[1], c[2], 1);
  writeInst(buf, n++, b.x - b.w * 0.36, b.y + b.h / 2, b.w * 0.08, b.h, c[0] * 0.78, c[1] * 0.78, c[2] * 0.78, 0.92);
  writeInst(buf, n++, b.x + b.w * 0.40, b.y + b.h / 2, b.w * 0.05, b.h, 1, 1, 1, 0.08);
  return n;
}
function windows(buf: Float32Array, n: number, b: RampageBuildingVisual, rows: number, cols: number, lit = 0.55): number {
  const marginX = Math.max(3, b.w * 0.12);
  const marginTop = 7;
  const marginBot = Math.min(12, b.h * 0.22);
  const usableW = Math.max(1, b.w - marginX * 2);
  const usableH = Math.max(1, b.h - marginTop - marginBot);
  const cellW = usableW / Math.max(1, cols);
  const cellH = usableH / Math.max(1, rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (deterministic(b.x + c, b.y + r, 22) > lit) continue;
      const wx = b.x - usableW / 2 + cellW * (c + 0.5);
      const wy = b.y + marginBot + cellH * (r + 0.5);
      writeInst(buf, n++, wx, wy, Math.min(3.6, cellW * 0.48), Math.min(4.2, cellH * 0.45), 0.95, 0.84, 0.42, 0.92);
    }
  }
  return n;
}
function door(buf: Float32Array, n: number, b: RampageBuildingVisual): number {
  writeInst(buf, n++, b.x, b.y + 5, Math.min(10, b.w * 0.28), 10, 0.10, 0.075, 0.055, 1);
  return n;
}
function drawResidential(buf: Float32Array, n: number, b: RampageBuildingVisual, base: RGB, canBreak: boolean): number {
  n = facade(buf, n, b, base);
  const roof: RGB = canBreak ? [0.46, 0.18, 0.12] : [0.25, 0.09, 0.08];
  writeInst(buf, n++, b.x, b.y + b.h + 4, b.w + 8, 8, roof[0], roof[1], roof[2], 1);
  writeInst(buf, n++, b.x, b.y + b.h + 8, b.w * 0.72, 2, roof[0] * 1.25, roof[1] * 1.25, roof[2] * 1.25, 0.9);
  n = windows(buf, n, b, Math.max(1, Math.floor(b.h / 18)), Math.max(2, Math.floor(b.w / 14)), 0.34);
  return door(buf, n, b);
}
function drawShop(buf: Float32Array, n: number, b: RampageBuildingVisual, base: RGB, canBreak: boolean): number {
  n = facade(buf, n, b, base);
  const sign = stripeColor('shop', base);
  writeInst(buf, n++, b.x, b.y + b.h - 6, b.w - 4, 8, sign[0], sign[1], sign[2], canBreak ? 1 : 0.55);
  writeInst(buf, n++, b.x - b.w * 0.18, b.y + b.h * 0.38, b.w * 0.38, b.h * 0.24, 0.18, 0.28, 0.34, 0.9);
  writeInst(buf, n++, b.x + b.w * 0.23, b.y + b.h * 0.38, b.w * 0.28, b.h * 0.24, 0.18, 0.28, 0.34, 0.9);
  return door(buf, n, b);
}
function drawApartment(buf: Float32Array, n: number, b: RampageBuildingVisual, base: RGB, canBreak: boolean): number {
  n = facade(buf, n, b, base);
  n = windows(buf, n, b, Math.max(2, Math.floor(b.h / 13)), Math.max(2, Math.floor(b.w / 11)), canBreak ? 0.36 : 0.56);
  writeInst(buf, n++, b.x, b.y + b.h - 3, b.w - 4, 4, base[0] * 0.72, base[1] * 0.72, base[2] * 0.72, 1);
  return door(buf, n, b);
}
function drawOffice(buf: Float32Array, n: number, b: RampageBuildingVisual, base: RGB, canBreak: boolean): number {
  n = facade(buf, n, b, base);
  n = windows(buf, n, b, Math.max(3, Math.floor(b.h / 10)), Math.max(2, Math.floor(b.w / 10)), canBreak ? 0.26 : 0.48);
  writeInst(buf, n++, b.x + b.w * 0.32, b.y + b.h / 2, 3, b.h - 5, 0.78, 0.90, 1.0, canBreak ? 0.22 : 0.08);
  writeInst(buf, n++, b.x, b.y + b.h + 3, b.w * 0.65, 5, base[0] * 0.55, base[1] * 0.55, base[2] * 0.55, 1);
  return n;
}
function drawIndustrial(buf: Float32Array, n: number, b: RampageBuildingVisual, base: RGB, canBreak: boolean): number {
  n = facade(buf, n, b, base);
  writeInst(buf, n++, b.x, b.y + 10, b.w * 0.62, 15, 0.18, 0.18, 0.17, 1);
  writeInst(buf, n++, b.x, b.y + b.h - 7, b.w - 6, 5, 0.92, 0.72, 0.14, canBreak ? 1 : 0.55);
  if (b.h > 34) writeInst(buf, n++, b.x + b.w * 0.32, b.y + b.h + 9, 7, 18, 0.22, 0.22, 0.20, 1);
  return n;
}
function drawLandmark(buf: Float32Array, n: number, b: RampageBuildingVisual, base: RGB, canBreak: boolean): number {
  n = facade(buf, n, b, base);
  const accent = stripeColor('landmark', base);
  writeInst(buf, n++, b.x, b.y + b.h - 8, b.w - 4, 9, accent[0], accent[1], accent[2], canBreak ? 1 : 0.5);
  n = windows(buf, n, b, Math.max(2, Math.floor(b.h / 14)), Math.max(3, Math.floor(b.w / 12)), canBreak ? 0.34 : 0.54);
  if (b.kind === 'castle') {
    writeInst(buf, n++, b.x - b.w * 0.32, b.y + b.h + 10, b.w * 0.18, 18, base[0], base[1], base[2], 1);
    writeInst(buf, n++, b.x + b.w * 0.32, b.y + b.h + 10, b.w * 0.18, 18, base[0], base[1], base[2], 1);
  }
  return n;
}
