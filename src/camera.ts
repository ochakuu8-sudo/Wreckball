import * as C from './constants';

export class Camera {
  y = 0;
  scrollSpeed = 0;
  lockY: number | null = null;

  update(dt: number) {
    this.y += this.scrollSpeed * dt;
    if (this.lockY !== null && this.y >= this.lockY) {
      this.y = this.lockY;
    }
  }

  get distanceMeters(): number {
    return Math.floor(this.y / 10);
  }

  get bottom(): number {
    return this.y + C.WORLD_MIN_Y;
  }

  get top(): number {
    return this.y + C.WORLD_MAX_Y;
  }

  reset() {
    this.y = 0;
    this.scrollSpeed = 0;
    this.lockY = null;
  }
}
