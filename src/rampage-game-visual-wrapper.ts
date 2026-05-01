import * as C from './constants';
import { RampageGame as SolidRampageGame } from './rampage-game-solid-wrapper';
import { Renderer, writeInst, INST_F } from './renderer';
import { drawRampageBuilding, drawRampageGround } from './rampage-building-visuals';

const VISUAL_BUF = new Float32Array(60000 * INST_F);

/**
 * Visual-only wrapper.
 *
 * Keeps the current rampage physics/rules intact and replaces only render()
 * with old-source-inspired building details and a non-road ground texture.
 *
 * Important: every entity must be written into VISUAL_BUF. The base game has
 * its own module-local draw buffer, so calling base drawHumans/drawFlippers/etc.
 * would increment the instance count while writing into the wrong buffer.
 */
export class RampageGame extends SolidRampageGame {
  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.installVisualPatch();
  }

  private installVisualPatch(): void {
    const game = this as unknown as Record<string, any>;

    game.render = () => {
      const renderer = game.renderer as Renderer;
      const power = game.power();
      renderer.updateProjection(game.cameraY);
      const t = Math.max(0, Math.min(1, game.momentum / 100));
      renderer.drawBackground(0.08 + t * 0.10, 0.07 + t * 0.04, 0.11 + t * 0.07, 0.04, 0.035, 0.04);

      let n = 0;
      n = drawRampageGround(VISUAL_BUF, n, game.cameraY);
      n = this.drawVisualBuildings(n, power);
      n = this.drawVisualHumans(n);
      n = this.drawVisualParticles(n);
      n = this.drawVisualInlanes(n);
      n = this.drawVisualFlippers(n);
      n = this.drawVisualBall(n);
      renderer.drawInstances(VISUAL_BUF, n);
    };
  }

  private drawVisualBuildings(n: number, power: number): number {
    const game = this as unknown as Record<string, any>;
    for (const b of game.buildings) {
      if (!b.active) continue;
      if (b.y + b.h < game.cameraY + C.WORLD_MIN_Y - 80 || b.y > game.cameraY + C.WORLD_MAX_Y + 120) continue;
      n = drawRampageBuilding(VISUAL_BUF, n, b, {
        currentPower: power,
        overdrive: game.od > 0,
      });
    }
    return n;
  }

  private drawVisualHumans(n: number): number {
    const game = this as unknown as Record<string, any>;
    for (const h of game.humans) {
      if (!h.active) continue;
      if (h.y < game.cameraY + C.WORLD_MIN_Y - 20 || h.y > game.cameraY + C.WORLD_MAX_Y + 20) continue;
      writeInst(VISUAL_BUF, n++, h.x, h.y, C.HUMAN_W, C.HUMAN_H, 1.0, 0.82, 0.52, 1);
    }
    return n;
  }

  private drawVisualParticles(n: number): number {
    const game = this as unknown as Record<string, any>;
    for (const p of game.particles) {
      if (p.y < game.cameraY + C.WORLD_MIN_Y - 20 || p.y > game.cameraY + C.WORLD_MAX_Y + 20) continue;
      const a = Math.max(0, Math.min(1, p.life * 2));
      writeInst(VISUAL_BUF, n++, p.x, p.y, p.size, p.size, p.color[0], p.color[1], p.color[2], a);
    }
    return n;
  }

  private drawVisualInlanes(n: number): number {
    const game = this as unknown as Record<string, any>;
    for (const s of game.inlanes()) {
      const cx = (s.ax + s.bx) / 2;
      const cy = (s.ay + s.by) / 2;
      const len = Math.hypot(s.bx - s.ax, s.by - s.ay);
      const angle = Math.atan2(s.by - s.ay, s.bx - s.ax);
      writeInst(VISUAL_BUF, n++, cx, cy, len, s.hw * 2, 0.88, 0.58, 0.18, 1, angle);
      writeInst(VISUAL_BUF, n++, cx, cy + 2, len * 0.84, 2, 1.0, 0.86, 0.28, 1, angle);
    }
    return n;
  }

  private drawVisualFlippers(n: number): number {
    const game = this as unknown as Record<string, any>;
    for (const f of [game.flipper(false), game.flipper(true)]) {
      const cx = (f.ax + f.bx) / 2;
      const cy = (f.ay + f.by) / 2;
      const angle = Math.atan2(f.by - f.ay, f.bx - f.ax);
      writeInst(VISUAL_BUF, n++, cx, cy, C.FLIPPER_W, 8, 1, 0.82, 0.12, 1, angle);
    }
    return n;
  }

  private drawVisualBall(n: number): number {
    const game = this as unknown as Record<string, any>;
    const ball = game.ball;
    const hot = game.od > 0;
    writeInst(VISUAL_BUF, n++, ball.x, ball.y, ball.r * 2, ball.r * 2, 1, hot ? 0.88 : 0.22, hot ? 0.18 : 0.10, 1, 0, 1);
    writeInst(VISUAL_BUF, n++, ball.x - 5, ball.y + 5, 6, 6, 1, 0.75, 0.55, 1, 0, 1);
    return n;
  }
}
