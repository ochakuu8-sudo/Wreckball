import * as C from './constants';
import { Renderer, writeInst, INST_F } from './renderer';
import { InputManager } from './input';
import { gameplayStart, gameplayStop } from './sdk';

type State = 'title' | 'running' | 'game_over';
type WreckPower = 1 | 2 | 3 | 4 | 5;
type DistrictKind = 'residential' | 'shopping' | 'station' | 'office' | 'industrial' | 'highrise' | 'crowd';

interface Building {
  id: number;
  kind: C.BuildingSize;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  score: number;
  humans: number;
  tier: WreckPower;
  active: boolean;
  flash: number;
  color: readonly [number, number, number];
}

interface Human {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  value: number;
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: readonly [number, number, number];
}

interface BallBody { x: number; y: number; vx: number; vy: number; r: number; }
interface Segment { ax: number; ay: number; bx: number; by: number; hw: number; kick: number; }

const MOMENTUM_MAX = 100;
const MOMENTUM_INITIAL = 35;
const MOMENTUM_DRAIN_PER_SEC = 4.2;
const MOMENTUM_DRAIN_OVERDRIVE_SCALE = 0.45;
const MOMENTUM_GAIN_PER_HUMAN = 1.05;
const MOMENTUM_GAIN_COMBO_SCALE = 0.035;
const MOMENTUM_LOW_THRESHOLD = 18;
const MOMENTUM_CRIT_THRESHOLD = 10;
const LOW_MOMENTUM_GRACE_SEC = 3.0;
const MOMENTUM_PENALTY_HARD_IMPACT = 8;
const MOMENTUM_PENALTY_BALL_LOST = 20;
const OVERDRIVE_COMBO_THRESHOLD = 24;
const OVERDRIVE_DURATION_SEC = 3.0;
const HUMAN_BURST_SCALE = 0.28;
const CHUNK_H = 240;
const FIELD_W = C.CANVAS_WIDTH;
const FIELD_H = C.CANVAS_HEIGHT;
const WORLD_LEFT = C.WORLD_MIN_X;
const WORLD_RIGHT = C.WORLD_MAX_X;
const SHARED_BUF = new Float32Array(60000 * INST_F);

const BUILDING_COLORS: Partial<Record<C.BuildingSize, readonly [number, number, number]>> = {
  house: [0.72, 0.42, 0.30], townhouse: [0.78, 0.55, 0.36], garage: [0.46, 0.46, 0.44],
  shop: [0.42, 0.62, 0.82], convenience: [0.36, 0.78, 0.48], ramen: [0.84, 0.32, 0.22], izakaya: [0.74, 0.35, 0.24],
  apartment: [0.48, 0.58, 0.70], supermarket: [0.62, 0.82, 0.50], train_station: [0.86, 0.74, 0.45],
  office: [0.45, 0.70, 0.90], business_hotel: [0.78, 0.82, 0.90], apartment_tall: [0.54, 0.66, 0.80],
  warehouse: [0.48, 0.47, 0.42], factory_stack: [0.56, 0.48, 0.42], gas_station: [0.90, 0.78, 0.22],
  tower: [0.40, 0.72, 0.92], skyscraper: [0.34, 0.64, 0.88], department_store: [0.92, 0.75, 0.42],
  stadium: [0.70, 0.64, 0.54], castle: [0.96, 0.90, 0.92],
};

const DISTRICTS: ReadonlyArray<{ kind: DistrictKind; buildings: C.BuildingSize[]; density: number; humans: number }> = [
  { kind: 'residential', buildings: ['house', 'house', 'townhouse', 'garage', 'convenience'], density: 9, humans: 6 },
  { kind: 'shopping', buildings: ['shop', 'ramen', 'izakaya', 'convenience', 'supermarket', 'apartment'], density: 10, humans: 10 },
  { kind: 'station', buildings: ['train_station', 'shop', 'convenience', 'apartment', 'ramen'], density: 7, humans: 18 },
  { kind: 'office', buildings: ['office', 'business_hotel', 'apartment_tall', 'shop', 'bank'], density: 8, humans: 10 },
  { kind: 'industrial', buildings: ['warehouse', 'factory_stack', 'gas_station', 'garage', 'shop'], density: 7, humans: 5 },
  { kind: 'highrise', buildings: ['tower', 'skyscraper', 'office', 'department_store', 'apartment_tall'], density: 6, humans: 10 },
  { kind: 'crowd', buildings: ['stadium', 'train_station', 'department_store', 'shop'], density: 5, humans: 28 },
];

const TIER_1 = new Set<C.BuildingSize>([
  'house', 'townhouse', 'garage', 'shed', 'greenhouse', 'bungalow', 'duplex', 'shop', 'convenience',
  'restaurant', 'cafe', 'bakery', 'bookstore', 'pharmacy', 'laundromat', 'florist', 'ramen', 'izakaya',
  'snack', 'yatai', 'kominka', 'chaya', 'kura', 'dojo', 'wagashi', 'kimono_shop', 'sushi_ya',
]);
const TIER_2 = new Set<C.BuildingSize>([
  'apartment', 'parking', 'supermarket', 'karaoke', 'pachinko', 'game_center', 'bank', 'library', 'museum',
  'fire_station', 'police_station', 'movie_theater', 'shrine', 'temple', 'machiya', 'ryokan', 'onsen_inn',
  'warehouse', 'container_stack', 'bus_terminal_shelter', 'shotengai_arcade', 'fountain_pavilion', 'love_hotel', 'club', 'capsule_hotel',
]);
const TIER_3 = new Set<C.BuildingSize>([
  'office', 'apartment_tall', 'city_hall', 'business_hotel', 'train_station', 'school', 'hospital',
  'department_store', 'factory_stack', 'silo', 'crane_gantry', 'pagoda', 'tahoto', 'carousel', 'big_tent', 'gas_station',
]);
const TIER_4 = new Set<C.BuildingSize>(['tower', 'skyscraper', 'clock_tower', 'radio_tower', 'ferris_wheel', 'roller_coaster']);

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function rand(min: number, max: number): number { return min + Math.random() * (max - min); }
function randInt(min: number, max: number): number { return Math.floor(rand(min, max + 1)); }
function pick<T>(items: readonly T[]): T { return items[Math.floor(Math.random() * items.length)]; }
function roman(power: WreckPower): string { return ['', 'I', 'II', 'III', 'IV', 'V'][power] ?? 'V'; }
function buildingColor(kind: C.BuildingSize): readonly [number, number, number] { return BUILDING_COLORS[kind] ?? [0.62, 0.58, 0.50]; }
function requiredWreckTier(kind: C.BuildingSize): WreckPower {
  if (TIER_1.has(kind)) return 1;
  if (TIER_2.has(kind)) return 2;
  if (TIER_3.has(kind)) return 3;
  if (TIER_4.has(kind)) return 4;
  return 5;
}
function circleAabb(cx: number, cy: number, r: number, bx: number, by: number, bw: number, bh: number): boolean {
  const nx = clamp(cx, bx - bw / 2, bx + bw / 2);
  const ny = clamp(cy, by, by + bh);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

export class RampageGame {
  private renderer: Renderer;
  private input: InputManager;
  private state: State = 'title';
  private lastTime = performance.now();
  private cameraY = 0;
  private nextChunkY = -120;
  private momentum = MOMENTUM_INITIAL;
  private lowMomentumTimer = 0;
  private comboCount = 0;
  private comboTimer = 0;
  private maxCombo = 0;
  private overdriveTimer = 0;
  private score = 0;
  private bestScore = 0;
  private buildings: Building[] = [];
  private humans: Human[] = [];
  private particles: Particle[] = [];
  private ball: BallBody = { x: C.BALL_START_X, y: C.BALL_START_Y, vx: 0.5, vy: 0, r: C.BALL_RADIUS };
  private buildingId = 1;

  private titleEl = document.getElementById('title');
  private gameoverEl = document.getElementById('gameover');
  private scoreEl = document.getElementById('score-display');
  private bestEl = document.getElementById('best-display');
  private lifeFillEl = document.getElementById('life-fill') as HTMLElement | null;
  private lifeWrapEl = document.getElementById('life-wrap') as HTMLElement | null;
  private zoneEl = document.getElementById('zone-display');
  private distanceEl = document.getElementById('distance-display');
  private finalScoreEl = document.getElementById('final-score');
  private finalBestEl = document.getElementById('final-best');
  private finalStatsEl = document.getElementById('final-stats');
  private finalRecordEl = document.getElementById('final-record');

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new InputManager(canvas);
    this.resetRun();
    this.setupDom();
    this.startLoop();
  }

  private setupDom(): void {
    this.titleEl?.classList.add('show');
    const titleText = this.titleEl?.querySelector('h1');
    if (titleText) titleText.innerHTML = 'RAMPAGE<br>PINBALL';
    const titleSub = document.getElementById('title-sub');
    if (titleSub) titleSub.innerHTML = 'CRUSH THE CITY.<br>STOMP FOR SPEED.';
    const start = (e?: Event) => {
      e?.preventDefault();
      if (this.state === 'running') return;
      if (this.state === 'game_over') this.resetRun();
      this.state = 'running';
      this.titleEl?.classList.remove('show');
      this.gameoverEl?.classList.remove('show');
      gameplayStart();
      this.lastTime = performance.now();
    };
    this.titleEl?.addEventListener('click', start);
    this.titleEl?.addEventListener('touchstart', start, { passive: false });
    this.gameoverEl?.addEventListener('click', start);
    this.gameoverEl?.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('keydown', (e) => { if (this.state !== 'running' && !e.ctrlKey && !e.metaKey && !e.altKey) start(e); });
  }

  private resetRun(): void {
    this.state = 'title';
    this.cameraY = 0;
    this.nextChunkY = -120;
    this.momentum = MOMENTUM_INITIAL;
    this.lowMomentumTimer = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.overdriveTimer = 0;
    this.score = 0;
    this.buildings = [];
    this.humans = [];
    this.particles = [];
    this.ball = { x: -145, y: this.cameraY - 110, vx: 0.7, vy: 0, r: C.BALL_RADIUS };
    while (this.nextChunkY < 1700) this.spawnDistrict(this.nextChunkY);
    this.updateHud();
  }

  private startLoop(): void { requestAnimationFrame((now) => this.loop(now)); }
  private loop(now: number): void {
    const rawDt = Math.min(0.033, (now - this.lastTime) / 1000 || 0);
    this.lastTime = now;
    if (this.state === 'running') this.update(rawDt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    this.updateMomentum(dt);
    this.cameraY += this.scrollSpeedForMomentum() * dt;
    while (this.nextChunkY < this.cameraY + 1200) this.spawnDistrict(this.nextChunkY);
    this.updateBall(dt);
    this.updateBuildings(dt);
    this.updateHumans(dt);
    this.updateParticles(dt);
    this.updateCombo(dt);
    this.updateFailure(dt);
    this.cleanupWorld();
    this.updateHud();
  }

  private updateMomentum(dt: number): void {
    const drain = this.overdriveTimer > 0 ? MOMENTUM_DRAIN_PER_SEC * MOMENTUM_DRAIN_OVERDRIVE_SCALE : MOMENTUM_DRAIN_PER_SEC;
    this.addMomentum(-drain * dt);
    this.overdriveTimer = Math.max(0, this.overdriveTimer - dt);
  }

  private slopeSegments(): Segment[] {
    const y = this.cameraY;
    return [
      { ax: -176, ay: y - 144, bx: -82, by: y - 214, hw: 8, kick: 1.8 },
      { ax:  176, ay: y - 144, bx:  82, by: y - 214, hw: 8, kick: 1.8 },
      // Short inner guide rails just above the flippers. These stop the ball from draining straight through the middle too easily.
      { ax: -62, ay: y - 238, bx: -18, by: y - 264, hw: 5, kick: 1.2 },
      { ax:  62, ay: y - 238, bx:  18, by: y - 264, hw: 5, kick: 1.2 },
    ];
  }

  private updateBall(dt: number): void {
    const flL = this.flipper(false), flR = this.flipper(true);
    this.ball.vy -= C.GRAVITY * 74 * dt;
    this.ball.x += this.ball.vx * 60 * dt;
    this.ball.y += this.ball.vy * 60 * dt;
    this.ball.vx *= 0.993;
    this.ball.vy *= 0.993;
    if (this.ball.x < WORLD_LEFT + this.ball.r) { this.ball.x = WORLD_LEFT + this.ball.r; this.ball.vx = Math.abs(this.ball.vx) * 0.72; }
    if (this.ball.x > WORLD_RIGHT - this.ball.r) { this.ball.x = WORLD_RIGHT - this.ball.r; this.ball.vx = -Math.abs(this.ball.vx) * 0.72; }
    if (this.ball.y > this.cameraY + C.WORLD_MAX_Y - this.ball.r) { this.ball.y = this.cameraY + C.WORLD_MAX_Y - this.ball.r; this.ball.vy = -Math.abs(this.ball.vy) * 0.62; }
    for (const s of this.slopeSegments()) this.resolveSegment(s);
    this.resolveFlipper(flL);
    this.resolveFlipper(flR);
    this.checkBuildingHits();
    if (this.ball.y < this.cameraY + C.FALLOFF_Y - 26) {
      this.addMomentum(-MOMENTUM_PENALTY_BALL_LOST);
      this.comboCount = 0; this.comboTimer = 0;
      this.ball.x = -145; this.ball.y = this.cameraY - 120; this.ball.vx = 0.5; this.ball.vy = 0;
    }
  }

  private resolveSegment(s: Segment): void {
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const lenSq = dx * dx + dy * dy;
    const t = clamp(((this.ball.x - s.ax) * dx + (this.ball.y - s.ay) * dy) / lenSq, 0, 1);
    const px = s.ax + dx * t, py = s.ay + dy * t;
    const ox = this.ball.x - px, oy = this.ball.y - py;
    const dist = Math.hypot(ox, oy) || 1;
    const minDist = this.ball.r + s.hw;
    if (dist >= minDist) return;
    const nx = ox / dist, ny = oy / dist;
    this.ball.x = px + nx * minDist;
    this.ball.y = py + ny * minDist;
    const vn = this.ball.vx * nx + this.ball.vy * ny;
    if (vn < 0) {
      this.ball.vx -= (1.35 * vn) * nx;
      this.ball.vy -= (1.35 * vn) * ny;
    }
    // Give the ball a mild upward/centerward helper so slopes feel like inlanes, not dead bumpers.
    this.ball.vy += s.kick;
    this.ball.vx += (px < 0 ? 0.45 : -0.45) * s.kick;
  }

  private flipper(right: boolean): { ax: number; ay: number; bx: number; by: number; pressed: boolean; right: boolean } {
    const pressed = right ? this.input.rightPressed : this.input.leftPressed;
    const pivotX = right ? C.FLIPPER_PIVOT_X : -C.FLIPPER_PIVOT_X;
    const pivotY = this.cameraY + C.FLIPPER_PIVOT_Y;
    const restDeg = right ? 205 : -25, activeDeg = right ? 150 : 30;
    const a = (pressed ? activeDeg : restDeg) * Math.PI / 180;
    return { ax: pivotX, ay: pivotY, bx: pivotX + Math.cos(a) * C.FLIPPER_W, by: pivotY + Math.sin(a) * C.FLIPPER_W, pressed, right };
  }

  private resolveFlipper(f: ReturnType<RampageGame['flipper']>): void {
    const dx = f.bx - f.ax, dy = f.by - f.ay;
    const lenSq = dx * dx + dy * dy;
    const t = clamp(((this.ball.x - f.ax) * dx + (this.ball.y - f.ay) * dy) / lenSq, 0, 1);
    const px = f.ax + dx * t, py = f.ay + dy * t;
    const ox = this.ball.x - px, oy = this.ball.y - py;
    const dist = Math.hypot(ox, oy) || 1;
    const minDist = this.ball.r + 5;
    if (dist >= minDist) return;
    const nx = ox / dist, ny = oy / dist;
    this.ball.x = px + nx * minDist;
    this.ball.y = py + ny * minDist;
    const kick = f.pressed ? 12.5 : 4.5;
    this.ball.vx += nx * kick + (f.right ? -2.2 : 2.2);
    this.ball.vy += Math.max(2.8, ny * kick) + (f.pressed ? 8.5 : 1.5);
  }

  private checkBuildingHits(): void {
    for (const b of this.buildings) {
      if (!b.active) continue;
      if (b.y + b.h < this.cameraY + C.WORLD_MIN_Y - 80 || b.y > this.cameraY + C.WORLD_MAX_Y + 160) continue;
      if (!circleAabb(this.ball.x, this.ball.y, this.ball.r, b.x, b.y, b.w, b.h)) continue;
      const power = this.getWreckPower();
      if (power < b.tier) {
        const shortage = b.tier - power;
        this.addMomentum(-(MOMENTUM_PENALTY_HARD_IMPACT + shortage * 4));
        this.comboCount = 0; this.comboTimer = 0;
        this.bounceFromBuilding(b, 0.65);
        this.spawnPopup(b.x, b.y + b.h, `NEED POWER ${roman(b.tier)}`);
        b.flash = 0.1;
        return;
      }
      const damage = 1 + Math.max(0, power - b.tier);
      b.hp -= damage;
      b.flash = 0.08;
      this.bounceFromBuilding(b, power > b.tier ? 0.35 : 0.55);
      if (b.hp <= 0) this.destroyBuilding(b);
      return;
    }
  }

  private bounceFromBuilding(b: Building, restitution: number): void {
    const dx = this.ball.x - b.x, dy = this.ball.y - (b.y + b.h / 2);
    if (Math.abs(dx) > Math.abs(dy)) this.ball.vx = Math.sign(dx || 1) * Math.max(4, Math.abs(this.ball.vx)) * restitution;
    else this.ball.vy = Math.sign(dy || 1) * Math.max(4, Math.abs(this.ball.vy)) * restitution;
  }

  private destroyBuilding(b: Building): void {
    b.active = false;
    this.score += Math.floor(b.score * (1 + this.comboCount * 0.08) * (1 + this.momentum / 180));
    this.addMomentum(b.tier * 0.7);
    this.comboTimer = Math.max(this.comboTimer, 1.1);
    this.spawnHumansFromBuilding(b);
    for (let i = 0; i < 16 + b.tier * 8; i++) this.particles.push({ x: b.x + rand(-b.w / 2, b.w / 2), y: b.y + rand(0, b.h), vx: rand(-70, 70), vy: rand(-20, 90), life: rand(0.35, 0.75), size: rand(2, 5), color: b.color });
  }

  private spawnHumansFromBuilding(b: Building): void {
    const count = clamp(Math.floor(b.humans * HUMAN_BURST_SCALE), 2, 55);
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2), speed = rand(22, 68) + b.tier * 7;
      const away = Math.sign((b.x - this.ball.x) || rand(-1, 1));
      this.humans.push({ x: b.x + Math.cos(a) * rand(4, 16), y: b.y + b.h * rand(0.2, 0.8), vx: Math.cos(a) * speed + away * 18, vy: Math.sin(a) * speed + 18, life: rand(3.5, 6.0), value: 1 + b.tier * 0.22, active: true });
    }
    this.spawnPopup(b.x, b.y + b.h + 10, `PANIC +${count}`);
  }

  private updateBuildings(dt: number): void { for (const b of this.buildings) b.flash = Math.max(0, b.flash - dt); }
  private updateHumans(dt: number): void {
    for (const h of this.humans) {
      if (!h.active) continue;
      h.life -= dt; h.x += h.vx * dt; h.y += h.vy * dt;
      h.vx += (h.x >= this.ball.x ? 1 : -1) * 10 * dt; h.vy += 5 * dt;
      if (h.x < WORLD_LEFT + 6 || h.x > WORLD_RIGHT - 6) h.vx *= -0.65;
      if (h.life <= 0 || h.y < this.cameraY + C.WORLD_MIN_Y - 70) { h.active = false; continue; }
      const dx = h.x - this.ball.x, dy = h.y - this.ball.y;
      if (dx * dx + dy * dy <= (this.ball.r + 5) * (this.ball.r + 5)) this.crushHuman(h);
    }
  }
  private crushHuman(h: Human): void {
    h.active = false;
    this.comboCount += 1; this.maxCombo = Math.max(this.maxCombo, this.comboCount); this.comboTimer = 1.35;
    const comboMult = 1 + Math.min(this.comboCount, 50) * MOMENTUM_GAIN_COMBO_SCALE;
    this.addMomentum(MOMENTUM_GAIN_PER_HUMAN * h.value * comboMult);
    this.score += Math.floor(10 * comboMult);
    if (this.comboCount >= OVERDRIVE_COMBO_THRESHOLD) this.overdriveTimer = Math.max(this.overdriveTimer, OVERDRIVE_DURATION_SEC);
    this.particles.push({ x: h.x, y: h.y, vx: 0, vy: 38, life: 0.32, size: 7, color: [1, 0.25, 0.15] });
  }
  private updateParticles(dt: number): void {
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 55 * dt; p.life -= dt; }
    this.particles = this.particles.filter(p => p.life > 0);
  }
  private updateCombo(dt: number): void { if (this.comboTimer > 0) this.comboTimer -= dt; if (this.comboTimer <= 0) this.comboCount = 0; }
  private updateFailure(dt: number): void {
    if (this.momentum <= MOMENTUM_CRIT_THRESHOLD) this.lowMomentumTimer += dt; else this.lowMomentumTimer = 0;
    if (this.lowMomentumTimer >= LOW_MOMENTUM_GRACE_SEC) this.onGameOver();
  }
  private onGameOver(): void {
    this.state = 'game_over'; gameplayStop(); this.bestScore = Math.max(this.bestScore, this.score);
    this.finalScoreEl && (this.finalScoreEl.textContent = `SCORE ${this.score.toLocaleString()}`);
    this.finalBestEl && (this.finalBestEl.textContent = `${Math.floor(this.cameraY / 10).toLocaleString()} m | MAX COMBO ${this.maxCombo}`);
    this.finalStatsEl && (this.finalStatsEl.textContent = `POWER ${roman(this.getWreckPower())} | MOMENTUM ${Math.round(this.momentum)}%`);
    this.finalRecordEl && (this.finalRecordEl.textContent = `BEST ${this.bestScore.toLocaleString()}`);
    this.gameoverEl?.classList.add('show');
  }
  private cleanupWorld(): void {
    const bottom = this.cameraY + C.WORLD_MIN_Y - 240;
    this.buildings = this.buildings.filter(b => b.active || b.y + b.h > bottom);
    this.humans = this.humans.filter(h => h.active && h.y > bottom);
  }
  private addMomentum(amount: number): void { this.momentum = clamp(this.momentum + amount, 0, MOMENTUM_MAX); }
  private getWreckPower(): WreckPower {
    if (this.overdriveTimer > 0) return 5;
    if (this.momentum >= 95) return 5;
    if (this.momentum >= 75) return 4;
    if (this.momentum >= 50) return 3;
    if (this.momentum >= 25) return 2;
    return 1;
  }
  private scrollSpeedForMomentum(): number { const t = clamp(this.momentum / MOMENTUM_MAX, 0, 1); return 22 + (96 - 22) * t; }
  private spawnDistrict(baseY: number): void {
    const district = this.pickDistrict();
    const lanes = [-138, -84, -30, 30, 84, 138];
    for (let i = 0; i < district.density; i++) {
      const kind = pick(district.buildings), def = C.BUILDING_DEFS[kind];
      this.buildings.push({ id: this.buildingId++, kind, x: pick(lanes) + rand(-8, 8), y: baseY + rand(18, CHUNK_H - 26), w: def.w, h: def.h, hp: def.hp, maxHp: def.hp, score: def.score, humans: randInt(def.humanMin, def.humanMax) + district.humans, tier: requiredWreckTier(kind), active: true, flash: 0, color: buildingColor(kind) });
    }
    const ambientHumans = district.kind === 'residential' ? 5 : Math.floor(district.humans * 0.35);
    for (let i = 0; i < ambientHumans; i++) this.humans.push({ x: rand(WORLD_LEFT + 18, WORLD_RIGHT - 18), y: baseY + rand(12, CHUNK_H - 10), vx: rand(-22, 22), vy: rand(-8, 18), life: rand(5, 9), value: 0.65, active: true });
    this.nextChunkY = baseY + CHUNK_H;
  }
  private pickDistrict(): typeof DISTRICTS[number] {
    if (this.nextChunkY < 480) return DISTRICTS[Math.random() < 0.65 ? 0 : 1];
    if (this.momentum < 22 && Math.random() < 0.55) return DISTRICTS[0];
    if (this.comboCount >= 12 && Math.random() < 0.25) return DISTRICTS[6];
    if (this.momentum > 70 && Math.random() < 0.35) return pick([DISTRICTS[2], DISTRICTS[4], DISTRICTS[5], DISTRICTS[6]]);
    return pick(DISTRICTS);
  }
  private spawnPopup(x: number, y: number, text: string): void {
    const popup = document.createElement('div'); popup.className = 'world-popup score'; popup.textContent = text;
    popup.style.left = `${x + FIELD_W / 2}px`; popup.style.top = `${FIELD_H / 2 - (y - this.cameraY)}px`;
    document.getElementById('popup-layer')?.appendChild(popup); setTimeout(() => popup.remove(), 850);
  }
  private updateHud(): void {
    const pct = clamp(this.momentum, 0, 100);
    if (this.lifeFillEl) this.lifeFillEl.style.width = `${pct}%`;
    if (this.lifeWrapEl) { this.lifeWrapEl.classList.toggle('low', this.momentum <= MOMENTUM_LOW_THRESHOLD && this.momentum > MOMENTUM_CRIT_THRESHOLD); this.lifeWrapEl.classList.toggle('crit', this.momentum <= MOMENTUM_CRIT_THRESHOLD); }
    const power = this.getWreckPower();
    this.zoneEl && (this.zoneEl.textContent = `${this.overdriveTimer > 0 ? 'OVERDRIVE' : `POWER ${roman(power)}`} / CHAIN ${this.comboCount}`);
    this.distanceEl && (this.distanceEl.textContent = `${Math.max(0, Math.floor(this.cameraY / 10)).toLocaleString()} m`);
    this.scoreEl && (this.scoreEl.textContent = `SCORE ${this.score.toLocaleString()}`);
    if (this.bestEl) { if (this.bestScore > 0) { this.bestEl.textContent = `BEST ${this.bestScore.toLocaleString()}`; this.bestEl.classList.remove('hidden'); } else this.bestEl.classList.add('hidden'); }
  }
  private render(): void {
    const power = this.getWreckPower(); this.renderer.updateProjection(this.cameraY);
    const t = clamp(this.momentum / 100, 0, 1); this.renderer.drawBackground(0.10 + t * 0.10, 0.12 + t * 0.05, 0.18, 0.05, 0.04, 0.05);
    let n = 0; n = this.drawRoads(n); n = this.drawBuildings(n, power); n = this.drawHumans(n); n = this.drawParticles(n); n = this.drawSlopes(n); n = this.drawFlippers(n); n = this.drawBall(n);
    this.renderer.drawInstances(SHARED_BUF, n);
  }
  private drawRoads(n: number): number {
    const start = Math.floor((this.cameraY + C.WORLD_MIN_Y) / CHUNK_H) * CHUNK_H;
    for (let y = start; y < this.cameraY + C.WORLD_MAX_Y + CHUNK_H; y += CHUNK_H) {
      writeInst(SHARED_BUF, n++, 0, y, 360, 8, 0.24, 0.23, 0.23, 1);
      writeInst(SHARED_BUF, n++, 0, y + CHUNK_H * 0.48, 360, 12, 0.20, 0.20, 0.21, 1);
      writeInst(SHARED_BUF, n++, 0, y + CHUNK_H * 0.78, 360, 6, 0.22, 0.21, 0.20, 1);
      writeInst(SHARED_BUF, n++, 0, y + CHUNK_H * 0.24, 8, CHUNK_H * 0.5, 0.18, 0.18, 0.19, 1);
    }
    return n;
  }
  private drawBuildings(n: number, power: WreckPower): number {
    for (const b of this.buildings) {
      if (!b.active || b.y + b.h < this.cameraY + C.WORLD_MIN_Y - 80 || b.y > this.cameraY + C.WORLD_MAX_Y + 120) continue;
      const col = b.flash > 0 ? [1, 1, 1] as const : b.color, canBreak = power >= b.tier;
      writeInst(SHARED_BUF, n++, b.x, b.y + b.h / 2, b.w, b.h, col[0], col[1], col[2], 1);
      writeInst(SHARED_BUF, n++, b.x, b.y + b.h - 5, Math.max(4, b.w - 5), 3, canBreak ? 1 : 0.35, canBreak ? 0.82 : 0.10, canBreak ? 0.12 : 0.10, 1);
      if (b.maxHp > 1) for (let i = 0; i < Math.max(0, b.hp); i++) writeInst(SHARED_BUF, n++, b.x - b.w / 2 + 5 + i * 5, b.y + b.h + 5, 3, 3, 1, 0.25, 0.15, 1);
    }
    return n;
  }
  private drawHumans(n: number): number { for (const h of this.humans) if (h.active && h.y >= this.cameraY + C.WORLD_MIN_Y - 20 && h.y <= this.cameraY + C.WORLD_MAX_Y + 20) writeInst(SHARED_BUF, n++, h.x, h.y, C.HUMAN_W, C.HUMAN_H, 1.0, 0.82, 0.52, 1); return n; }
  private drawParticles(n: number): number { for (const p of this.particles) if (p.y >= this.cameraY + C.WORLD_MIN_Y - 20 && p.y <= this.cameraY + C.WORLD_MAX_Y + 20) writeInst(SHARED_BUF, n++, p.x, p.y, p.size, p.size, p.color[0], p.color[1], p.color[2], clamp(p.life * 2, 0, 1)); return n; }
  private drawSlopes(n: number): number {
    for (const s of this.slopeSegments()) {
      const cx = (s.ax + s.bx) / 2, cy = (s.ay + s.by) / 2;
      const len = Math.hypot(s.bx - s.ax, s.by - s.ay);
      const angle = Math.atan2(s.by - s.ay, s.bx - s.ax);
      writeInst(SHARED_BUF, n++, cx, cy, len, s.hw * 2, 0.88, 0.58, 0.18, 1, angle);
      writeInst(SHARED_BUF, n++, cx, cy + 2, len * 0.92, 2, 1.00, 0.86, 0.28, 1, angle);
    }
    return n;
  }
  private drawFlippers(n: number): number { const l = this.flipper(false), r = this.flipper(true); const drawOne = (f: ReturnType<RampageGame['flipper']>) => { const cx = (f.ax + f.bx) / 2, cy = (f.ay + f.by) / 2, angle = Math.atan2(f.by - f.ay, f.bx - f.ax); writeInst(SHARED_BUF, n++, cx, cy, C.FLIPPER_W, 8, 1, 0.82, 0.12, 1, angle); }; drawOne(l); drawOne(r); return n; }
  private drawBall(n: number): number { const hot = this.overdriveTimer > 0; writeInst(SHARED_BUF, n++, this.ball.x, this.ball.y, this.ball.r * 2, this.ball.r * 2, 1, hot ? 0.88 : 0.22, hot ? 0.18 : 0.10, 1, 0, 1); writeInst(SHARED_BUF, n++, this.ball.x - 5, this.ball.y + 5, 6, 6, 1, 0.75, 0.55, 1, 0, 1); return n; }
}
