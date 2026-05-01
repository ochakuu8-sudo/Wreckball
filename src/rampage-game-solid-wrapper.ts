import * as C from './constants';
import { RampageGame as AnimatedRampageGame } from './rampage-game-animated';

const MAX_BALL_SPEED = 17.5;
const FLIPPER_HIT_COOLDOWN = 0.09;
const FLIPPER_COLLISION_PAD = 8;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Thin runtime wrapper around rampage-game-animated.
 *
 * The animated flipper version can still let fast balls tunnel through because
 * the ball is advanced once per frame and then tested against the flipper line.
 * This wrapper keeps the same game mode, but replaces the ball step and flipper
 * response with:
 * - ball substeps based on current travel distance
 * - thicker flipper capsule
 * - one strong swing impulse per cooldown window
 * - a hard ball speed cap after impulses
 */
export class RampageGame extends AnimatedRampageGame {
  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.installSolidFlipperPatch();
  }

  private installSolidFlipperPatch(): void {
    const game = this as unknown as Record<string, any>;
    const originalUpdateFlippers = game.updateFlippers.bind(game);

    game.capBall = () => {
      const ball = game.ball;
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed <= MAX_BALL_SPEED) return;
      const m = MAX_BALL_SPEED / speed;
      ball.vx *= m;
      ball.vy *= m;
    };

    // Base update() calls updateFlippers before updateBall. We no-op that call
    // and advance flippers inside each physics substep instead.
    game.updateFlippers = (_dt: number) => {};

    game.updateBall = (dt: number) => {
      const ball = game.ball;
      const travelPx = Math.hypot(ball.vx, ball.vy) * 60 * dt;
      const steps = clamp(Math.ceil(travelPx / 7), 2, 8);
      const subDt = dt / steps;
      for (let i = 0; i < steps; i++) {
        originalUpdateFlippers(subDt);
        const flL = game.flipper(false);
        const flR = game.flipper(true);

        ball.vy -= C.GRAVITY * 74 * subDt;
        ball.x += ball.vx * 60 * subDt;
        ball.y += ball.vy * 60 * subDt;
        ball.vx *= 0.993;
        ball.vy *= 0.993;

        if (ball.x < C.WORLD_MIN_X + ball.r) {
          ball.x = C.WORLD_MIN_X + ball.r;
          ball.vx = Math.abs(ball.vx) * 0.72;
        }
        if (ball.x > C.WORLD_MAX_X - ball.r) {
          ball.x = C.WORLD_MAX_X - ball.r;
          ball.vx = -Math.abs(ball.vx) * 0.72;
        }
        if (ball.y > game.cameraY + C.WORLD_MAX_Y - ball.r) {
          ball.y = game.cameraY + C.WORLD_MAX_Y - ball.r;
          ball.vy = -Math.abs(ball.vy) * 0.62;
        }

        for (const s of game.inlanes()) game.resolveSeg(s);
        game.resolveFlipper(flL);
        game.resolveFlipper(flR);
        game.checkBuildings();
        game.capBall();

        if (ball.y < game.cameraY + C.FALLOFF_Y - 26) {
          game.addMomentum(-20);
          game.combo = 0;
          game.comboTimer = 0;
          game.ball = { x: -145, y: game.cameraY - 120, vx: 0.5, vy: 0, r: C.BALL_RADIUS };
          break;
        }
      }
    };

    game.resolveFlipper = (f: any) => {
      const ball = game.ball;
      const dx = f.bx - f.ax;
      const dy = f.by - f.ay;
      const lenSq = dx * dx + dy * dy;
      const t = clamp(((ball.x - f.ax) * dx + (ball.y - f.ay) * dy) / lenSq, 0, 1);
      const px = f.ax + dx * t;
      const py = f.ay + dy * t;
      const ox = ball.x - px;
      const oy = ball.y - py;
      const dist = Math.hypot(ox, oy) || 1;
      const minDist = ball.r + FLIPPER_COLLISION_PAD;
      if (dist >= minDist) return;

      const nx = ox / dist;
      const ny = oy / dist;
      ball.x = px + nx * minDist;
      ball.y = py + ny * minDist;

      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        ball.vx -= 1.1 * vn * nx;
        ball.vy -= 1.1 * vn * ny;
      }

      const rising = f.right ? f.state.angularVel < -0.25 : f.state.angularVel > 0.25;
      if (rising && f.state.cooldown <= 0) {
        const swing = clamp(Math.abs(f.state.angularVel) / 14, 0, 0.9);
        const kick = 5.5 + swing * 7.5;
        ball.vx += (f.right ? -2.2 : 2.2) + nx * kick * 0.45;
        ball.vy += 7.5 + swing * 5.5 + Math.max(0, ny) * kick * 0.35;
        f.state.cooldown = FLIPPER_HIT_COOLDOWN;
        game.capBall();
      }
    };
  }
}
