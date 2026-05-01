import { Game } from './game';
import { RampageRules } from './rampage-rules';

/**
 * Legacy-derived rampage integration layer.
 *
 * This keeps the existing Game, Ball, Flipper, BuildingManager, HumanManager,
 * Renderer and visual quality intact. It only installs the new rampage economy
 * on top of the legacy game loop:
 * - fuel is treated as SPEED / momentum
 * - momentum decays over time
 * - camera speed follows momentum
 * - low momentum can end the run in later phases
 *
 * Later phases should move these hooks directly into game.ts once the behavior
 * is stable. Keeping this layer thin lets us avoid a risky full rewrite of the
 * large legacy Game file.
 */
export class RampageGame extends Game {
  private readonly rampageRules = new RampageRules();

  constructor(canvas: HTMLCanvasElement, opts?: { screenshotMode?: boolean; screenshotChunkId?: number | null }) {
    super(canvas, opts);
    this.installRampageRulesPatch();
  }

  private installRampageRulesPatch(): void {
    const game = this as unknown as Record<string, any>;
    const rules = this.rampageRules;

    const syncMomentumToLegacyFuel = () => {
      game.fuel = rules.momentum;
      if (game.ui?.setFuel) game.ui.setFuel(rules.momentum);
    };

    const originalInitRun = typeof game.initRun === 'function' ? game.initRun.bind(game) : null;
    if (originalInitRun) {
      game.initRun = (...args: unknown[]) => {
        const result = originalInitRun(...args);
        rules.reset();
        syncMomentumToLegacyFuel();
        return result;
      };
    }

    const originalRestart = typeof game.restart === 'function' ? game.restart.bind(game) : null;
    if (originalRestart) {
      game.restart = (...args: unknown[]) => {
        rules.reset();
        const result = originalRestart(...args);
        syncMomentumToLegacyFuel();
        return result;
      };
    }

    const originalUpdate = typeof game.update === 'function' ? game.update.bind(game) : null;
    if (originalUpdate) {
      game.update = (dt: number, ...args: unknown[]) => {
        // Do not drain SPEED on title/pause/game over style states.
        if (!game.titleActive && !game.paused && game.state !== 'game_over' && game.state !== 'clear') {
          rules.update(dt);
          syncMomentumToLegacyFuel();
          if (game.camera) game.camera.scrollSpeed = rules.scrollSpeed();
        }
        return originalUpdate(dt, ...args);
      };
    }

    // Initial sync after the base constructor has already called initRun().
    rules.reset();
    syncMomentumToLegacyFuel();
    if (game.camera) game.camera.scrollSpeed = rules.scrollSpeed();
  }
}
