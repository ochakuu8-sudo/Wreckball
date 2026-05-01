import * as B from './rampage-balance';

export type WreckPower = 1 | 2 | 3 | 4 | 5;

export interface HumanCrushReward {
  momentumGain: number;
  combo: number;
  overdriveStarted: boolean;
}

export class RampageRules {
  momentum = B.MOMENTUM_INITIAL;
  combo = 0;
  maxCombo = 0;
  overdriveTimer = 0;
  lowMomentumTimer = 0;

  reset(): void {
    this.momentum = B.MOMENTUM_INITIAL;
    this.combo = 0;
    this.maxCombo = 0;
    this.overdriveTimer = 0;
    this.lowMomentumTimer = 0;
  }

  update(dt: number): void {
    const drain = this.overdriveTimer > 0
      ? B.MOMENTUM_DRAIN_PER_SEC * B.MOMENTUM_DRAIN_OVERDRIVE_SCALE
      : B.MOMENTUM_DRAIN_PER_SEC;
    this.addMomentum(-drain * dt);
    this.overdriveTimer = Math.max(0, this.overdriveTimer - dt);
  }

  updateFailureTimer(dt: number): boolean {
    if (this.momentum <= B.CRIT_MOMENTUM_THRESHOLD) this.lowMomentumTimer += dt;
    else this.lowMomentumTimer = 0;
    return this.lowMomentumTimer >= B.LOW_MOMENTUM_GRACE_SEC;
  }

  addMomentum(amount: number): void {
    this.momentum = Math.max(0, Math.min(B.MOMENTUM_MAX, this.momentum + amount));
  }

  currentPower(): WreckPower {
    if (this.overdriveTimer > 0) return 5;
    if (this.momentum >= 95) return 5;
    if (this.momentum >= 75) return 4;
    if (this.momentum >= 50) return 3;
    if (this.momentum >= 25) return 2;
    return 1;
  }

  scrollSpeed(): number {
    const t = Math.max(0, Math.min(1, this.momentum / B.MOMENTUM_MAX));
    return B.SCROLL_SPEED_MIN + (B.SCROLL_SPEED_MAX - B.SCROLL_SPEED_MIN) * t;
  }

  onHumanCrushed(value = 1): HumanCrushReward {
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const comboMult = 1 + Math.min(this.combo, 50) * B.HUMAN_COMBO_GAIN_SCALE;
    const momentumGain = B.HUMAN_MOMENTUM_GAIN * value * comboMult;
    this.addMomentum(momentumGain);
    let overdriveStarted = false;
    if (this.combo >= B.OVERDRIVE_COMBO_THRESHOLD) {
      overdriveStarted = this.overdriveTimer <= 0;
      this.overdriveTimer = Math.max(this.overdriveTimer, B.OVERDRIVE_DURATION_SEC);
    }
    return { momentumGain, combo: this.combo, overdriveStarted };
  }

  onBuildingDestroyed(tier: WreckPower): void {
    this.addMomentum(tier * B.BUILDING_DESTROY_MOMENTUM_GAIN_PER_TIER);
  }

  onHardBuildingImpact(requiredTier: WreckPower): void {
    const shortage = Math.max(0, requiredTier - this.currentPower());
    this.addMomentum(-(B.HARD_BUILDING_IMPACT_PENALTY + shortage * 4));
    this.combo = 0;
  }

  onBallLost(): void {
    this.addMomentum(-B.BALL_LOST_PENALTY);
    this.combo = 0;
  }
}
