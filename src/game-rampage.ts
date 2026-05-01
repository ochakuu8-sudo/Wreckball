import * as C from './constants';
import { Game } from './game';
import { RampageRules } from './rampage-rules';
import {
  clampHumanBurst,
  computeRampageDamage,
  getRampageBuildingProfile,
} from './rampage-building-profiles';

interface ScatterDef {
  x: number;
  y: number;
  size: C.BuildingSize;
  blockIdx?: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SMALL_POOL: C.BuildingSize[] = [
  'house', 'townhouse', 'garage', 'shed', 'bungalow', 'duplex',
  'shop', 'convenience', 'cafe', 'bakery', 'ramen', 'izakaya', 'yatai',
  'kominka', 'chaya', 'wagashi', 'sushi_ya',
];

const MEDIUM_POOL: C.BuildingSize[] = [
  'apartment', 'parking', 'supermarket', 'karaoke', 'pachinko', 'game_center',
  'bank', 'library', 'museum', 'warehouse', 'machiya', 'ryokan',
];

const LARGE_POOL: C.BuildingSize[] = [
  'office', 'apartment_tall', 'business_hotel', 'train_station', 'school',
  'hospital', 'department_store', 'factory_stack', 'gas_station',
];

const HUGE_POOL: C.BuildingSize[] = [
  'tower', 'skyscraper', 'clock_tower', 'radio_tower', 'ferris_wheel',
  'roller_coaster', 'stadium',
];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickRampageBuilding(): C.BuildingSize {
  const r = Math.random() * 100;
  if (r < 80) return pick(SMALL_POOL);
  if (r < 95) return pick(MEDIUM_POOL);
  if (r < 99) return pick(LARGE_POOL);
  return pick(HUGE_POOL);
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function makeRect(x: number, y: number, size: C.BuildingSize): Rect {
  const def = C.BUILDING_DEFS[size];
  const profile = getRampageBuildingProfile(size);
  const pad = profile.klass === 'small' ? 6 : profile.klass === 'medium' ? 9 : profile.klass === 'large' ? 13 : 18;
  return { x: x - def.w / 2 - pad, y: y - pad, w: def.w + pad * 2, h: def.h + pad * 2 };
}

function makeScatterBand(baseY: number, height: number, count: number, blockIdx: number): ScatterDef[] {
  const out: ScatterDef[] = [];
  const rects: Rect[] = [];
  const left = C.WORLD_MIN_X + 18;
  const right = C.WORLD_MAX_X - 18;
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const size = pickRampageBuilding();
      const def = C.BUILDING_DEFS[size];
      const x = rand(left + def.w / 2, right - def.w / 2);
      const y = baseY + rand(16, height - def.h - 10);
      // Do not seal the immediate lower flipper/drain area in the first band.
      if (baseY < 120 && y < 70 && Math.abs(x) < 70) continue;
      const rect = makeRect(x, y, size);
      if (rects.some(r => rectsOverlap(rect, r))) continue;
      rects.push(rect);
      out.push({ x, y, size, blockIdx });
      break;
    }
  }
  return out;
}

function makeInitialScatter(): ScatterDef[] {
  const defs: ScatterDef[] = [];
  let bandY = -180;
  let block = -1;
  while (bandY < C.WORLD_MAX_Y + C.CHUNK_HEIGHT * 2) {
    defs.push(...makeScatterBand(bandY, 300, 18, block));
    bandY += 300;
    block--;
  }
  return defs;
}

/**
 * Legacy-derived rampage integration layer.
 *
 * Keeps the existing Game/Ball/Flipper/BuildingManager/HumanManager/Renderer
 * intact and replaces the economy/flow with:
 * - SPEED/momentum instead of fuel
 * - no stage clear / no goal clear
 * - random scattered buildings instead of road/cell layout
 * - small buildings as one-hit food
 * - speed-based HP damage for larger buildings
 * - building destruction as the source of human bursts
 */
export class RampageGame extends Game {
  private readonly rampageRules = new RampageRules();
  private rampagePatched = false;

  constructor(canvas: HTMLCanvasElement, opts?: { screenshotMode?: boolean; screenshotChunkId?: number | null }) {
    super(canvas, opts);
    this.installRampageRulesPatch();
  }

  private installRampageRulesPatch(): void {
    if (this.rampagePatched) return;
    this.rampagePatched = true;

    const game = this as unknown as Record<string, any>;
    const rules = this.rampageRules;

    const showPopup = (x: number, y: number, text: string, kind: 'fuel' | 'boom' | 'pierce' | 'score' = 'score') => {
      if (game.ui?.showWorldPopup) game.ui.showWorldPopup(x, y, text, kind);
    };

    const syncMomentumToLegacyFuel = () => {
      game.fuel = rules.momentum;
      if (game.ui?.setFuel) game.ui.setFuel(rules.momentum);
      if (game.ui?.setZone) {
        const label = rules.overdriveTimer > 0 ? `OVERDRIVE / CHAIN ${rules.combo}` : `CHAIN ${rules.combo}`;
        game.ui.setZone(-1, label);
      }
    };

    const resetRampage = () => {
      rules.reset();
      syncMomentumToLegacyFuel();
      if (game.camera) game.camera.scrollSpeed = rules.scrollSpeed();
    };

    this.patchStageFlow(game);
    this.patchCityGeneration(game);
    this.patchBuildingDamage(game, rules, showPopup);
    this.patchHumanCrushRewards(game, rules, syncMomentumToLegacyFuel, showPopup);

    const originalInitRun = typeof game.initRun === 'function' ? game.initRun.bind(game) : null;
    if (originalInitRun) {
      game.initRun = (...args: unknown[]) => {
        const result = originalInitRun(...args);
        resetRampage();
        return result;
      };
    }

    const originalRestart = typeof game.restart === 'function' ? game.restart.bind(game) : null;
    if (originalRestart) {
      game.restart = (...args: unknown[]) => {
        const result = originalRestart(...args);
        resetRampage();
        if (game.buildings?.load) game.buildings.load(makeInitialScatter());
        return result;
      };
    }

    const originalUpdate = typeof game.update === 'function' ? game.update.bind(game) : null;
    if (originalUpdate) {
      game.update = (dt: number, ...args: unknown[]) => {
        if (!game.titleActive && !game.paused && game.state !== 'game_over') {
          rules.update(dt);
          syncMomentumToLegacyFuel();
          if (game.camera) game.camera.scrollSpeed = rules.scrollSpeed();
          if (rules.updateFailureTimer(dt)) {
            game.state = 'game_over';
            if (game.ui?.showGameOver) {
              const dist = Math.max(0, Math.floor((game.camera?.y ?? 0) / 10));
              game.ui.showGameOver(dist, game.totalScore ?? 0, game.totalDestroys ?? 0, game.totalHumans ?? 0, game.bestScore ?? 0);
            }
          }
        }
        const result = originalUpdate(dt, ...args);
        if (game.state === 'stage_clear' || game.state === 'clear') game.state = 'playing';
        return result;
      };
    }

    resetRampage();
    if (game.buildings?.load) game.buildings.load(makeInitialScatter());
  }

  private patchStageFlow(game: Record<string, any>): void {
    game.clearTriggered = false;
    game.currentStageIndex = 0;
    game.pendingStageIndex = 0;
    if (game.ui?.hideStageClear) game.ui.hideStageClear();
    if (game.ui?.hideClear) game.ui.hideClear();

    const block = () => undefined;
    if (typeof game.setupStageClearContinue === 'function') game.setupStageClearContinue = block;
    if (typeof game.continueToNextStage === 'function') game.continueToNextStage = block;
  }

  private patchCityGeneration(game: Record<string, any>): void {
    // Remove visible road/cell sources and keep generation as scattered buildings.
    game.initialCityGrounds = [];
    if (game.loadedChunks?.clear) game.loadedChunks.clear();
    game.nextChunkId = 0;

    const scatterChunk = (chunkId: number) => {
      const baseY = C.WORLD_MAX_Y + chunkId * C.CHUNK_HEIGHT;
      const count = 14 + Math.floor(Math.random() * 8);
      const defs = makeScatterBand(baseY, C.CHUNK_HEIGHT, count, chunkId);
      if (game.buildings?.loadChunk) game.buildings.loadChunk(defs);
      game.nextChunkId = Math.max(game.nextChunkId ?? 0, chunkId + 1);
    };

    game._spawnChunk = scatterChunk;
    game.spawnChunk = scatterChunk;
  }

  private patchBuildingDamage(
    game: Record<string, any>,
    rules: RampageRules,
    showPopup: (x: number, y: number, text: string, kind?: 'fuel' | 'boom' | 'pierce' | 'score') => void,
  ): void {
    const bm = game.buildings;
    if (!bm || typeof bm.damage !== 'function') return;
    const originalDamage = bm.damage.bind(bm);

    bm.damage = (building: any, requestedDamage = 1) => {
      const size = building.size as C.BuildingSize;
      const profile = getRampageBuildingProfile(size);
      const overdrive = rules.overdriveTimer > 0;
      const rampageDamage = computeRampageDamage(size, rules.momentum, overdrive);
      const damage = profile.guaranteedOneShot
        ? Math.max(building.hp ?? 1, requestedDamage)
        : Math.max(requestedDamage, rampageDamage);

      const destroyed = originalDamage(building, damage);
      if (destroyed) {
        rules.onBuildingDestroyed(profile.klass === 'small' ? 1 : profile.klass === 'medium' ? 2 : profile.klass === 'large' ? 3 : 4);
        showPopup(building.x + building.w / 2, building.y + building.h, profile.guaranteedOneShot ? 'SMASH' : `DMG x${damage}`, 'boom');
        this.spawnPanicHumans(game, building);
      }
      return destroyed;
    };
  }

  private spawnPanicHumans(game: Record<string, any>, building: any): void {
    const humans = game.humans;
    if (!humans) return;

    const size = building.size as C.BuildingSize;
    const baseCount = randInt(building.humanMin ?? 1, building.humanMax ?? 4);
    const speedBonus = 1 + Math.min(1, this.rampageRules.momentum / 100) * 0.35;
    const count = clampHumanBurst(size, Math.floor(baseCount * 0.25 * speedBonus));
    const cx = building.x + building.w / 2;
    const cy = building.y + building.h * 0.45;

    // Prefer an existing public method if the legacy manager exposes one.
    const candidates = [
      'spawnPanicHumansFromBuilding',
      'spawnPanicHumans',
      'spawnHumans',
      'addHumans',
    ];
    for (const name of candidates) {
      if (typeof humans[name] === 'function') {
        try {
          humans[name](cx, cy, count, size);
          return;
        } catch {}
        try {
          humans[name](building, count);
          return;
        } catch {}
      }
    }

    // Fallback for the SoA-style legacy HumanManager. Keep this deliberately
    // defensive because field names are implementation details.
    const xs = humans.xs ?? humans.x;
    const ys = humans.ys ?? humans.y;
    const vxs = humans.vxs ?? humans.vx;
    const vys = humans.vys ?? humans.vy;
    const states = humans.states ?? humans.state;
    if (!xs || !ys || !states) return;

    for (let i = 0; i < count; i++) {
      let idx = -1;
      for (let j = 0; j < states.length; j++) {
        if (states[j] === 0) { idx = j; break; }
      }
      if (idx < 0) break;
      const a = Math.random() * Math.PI * 2;
      xs[idx] = cx + Math.cos(a) * rand(3, 16);
      ys[idx] = cy + Math.sin(a) * rand(3, 18);
      if (vxs) vxs[idx] = Math.cos(a) * rand(20, 70);
      if (vys) vys[idx] = Math.sin(a) * rand(15, 65);
      states[idx] = 1;
      if (humans.mode) humans.mode[idx] = 2;
      if (humans.life) humans.life[idx] = rand(3.5, 6.0);
    }
  }

  private patchHumanCrushRewards(
    game: Record<string, any>,
    rules: RampageRules,
    syncMomentumToLegacyFuel: () => void,
    showPopup: (x: number, y: number, text: string, kind?: 'fuel' | 'boom' | 'pierce' | 'score') => void,
  ): void {
    const humans = game.humans;
    if (!humans) return;

    let lastRewardTime = 0;
    const getCrushTotal = (): number => typeof game.totalHumans === 'number' ? game.totalHumans : 0;

    const maybeReward = (beforeTotal: number, args: unknown[]) => {
      const afterTotal = getCrushTotal();
      const delta = afterTotal - beforeTotal;
      if (delta <= 0) return;

      const now = performance.now();
      // Guard against multiple wrapped methods observing the same stomp in the
      // same frame. The legacy game already increments totalHumans once per
      // stomp, so this is only a duplicate-popup guard.
      if (now - lastRewardTime < 30) return;
      lastRewardTime = now;

      let reward = rules.onHumanCrushed(1);
      for (let i = 1; i < delta; i++) reward = rules.onHumanCrushed(1);
      syncMomentumToLegacyFuel();

      const x = typeof args[0] === 'number' ? args[0] as number : 0;
      const y = typeof args[1] === 'number' ? args[1] as number : 0;
      showPopup(x, y, reward.overdriveStarted ? 'OVERDRIVE' : `+SPEED x${reward.combo}`, 'fuel');
    };

    const wrapResultReward = (name: string) => {
      if (typeof humans[name] !== 'function') return;
      const original = humans[name].bind(humans);
      humans[name] = (...args: unknown[]) => {
        const beforeTotal = getCrushTotal();
        const result = original(...args);
        maybeReward(beforeTotal, args);
        return result;
      };
    };

    // Cover likely legacy crush/check method names without relying on their
    // return values. Reward only when Game.totalHumans actually increases.
    for (const name of ['checkCrush', 'checkBallHit', 'checkBallCrush', 'crushAt', 'crush', 'stompAt']) {
      wrapResultReward(name);
    }
  }
}
