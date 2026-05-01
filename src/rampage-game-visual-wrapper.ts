import { RampageGame as SolidRampageGame } from './rampage-game-solid-wrapper';
import { Renderer, writeInst, INST_F } from './renderer';
import { drawRampageBuilding, drawRampageGround } from './rampage-building-visuals';

const VISUAL_BUF = new Float32Array(60000 * INST_F);

/**
 * Visual-only wrapper.
 *
 * Keeps the current rampage physics/rules intact and replaces only render()
 * with old-source-inspired building details and a non-road ground texture.
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
      n = game.drawHumans(n);
      n = game.drawParticles(n);
      n = game.drawInlanes(n);
      n = game.drawFlippers(n);
      n = game.drawBall(n);
      renderer.drawInstances(VISUAL_BUF, n);
    };
  }

  private drawVisualBuildings(n: number, power: number): number {
    const game = this as unknown as Record<string, any>;
    for (const b of game.buildings) {
      if (!b.active) continue;
      if (b.y + b.h < game.cameraY + (-290) - 80 || b.y > game.cameraY + 290 + 120) continue;
      n = drawRampageBuilding(VISUAL_BUF, n, b, {
        currentPower: power,
        overdrive: game.od > 0,
      });
    }
    return n;
  }
}
