import * as B from './rampage-balance';
import type { RampageBuildingClass } from './rampage-building-profiles';

export type WreckPower = 1 | 2 | 3 | 4 | 5;
export type SpeedPhase = 'launch' | 'recover' | 'cruise' | 'boost' | 'redline' | 'overdrive';

export interface HumanCrushReward {
  momentumGain: number;
  combo: number;
  overdriveStarted: boolean;
}

export class RampageRules {
  momentum = B.MOMENTUM_INITIAL;
  raceSpeed = 0;
  runTime = 0;
  combo = 0;
  maxCombo = 0;
  comboTimer = 0;
  overdriveTimer = 0;

  reset(): void {
    this.momentum = B.MOMENTUM_INITIAL;
    this.raceSpeed = B.SCROLL_SPEED_MIN;
    this.runTime = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.overdriveTimer = 0;
  }

  update(dt: number): void {
    this.runTime += dt;
    let drain = B.MOMENTUM_DRAIN_PER_SEC;
    if (this.runTime < B.LAUNCH_FAIL_GRACE_SEC) drain *= B.LAUNCH_DRAIN_SCALE;
    if (this.momentum >= B.MOMENTUM_DRAIN_HIGH_SPEED_THRESHOLD) drain *= B.MOMENTUM_DRAIN_HIGH_SPEED_SCALE;
    if (this.overdriveTimer > 0) drain *= B.MOMENTUM_DRAIN_OVERDRIVE_SCALE;
    this.addMomentum(-drain * dt);
    this.overdriveTimer = Math.max(0, this.overdriveTimer - dt);
    this.updateRaceSpeed(dt);
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer <= 0) this.combo = 0;
    }
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
    return this.raceSpeed;
  }

  speedPercent(): number {
    return clamp01(this.raceSpeed / B.SCROLL_SPEED_MAX) * 100;
  }

  private targetScrollSpeed(): number {
    const p = this.momentum;
    const launch = smoothstep(clamp01(this.runTime / B.LAUNCH_RAMP_SEC));
    let target = B.SCROLL_SPEED_MIN;

    if (p > B.SCROLL_MOMENTUM_ROLL_THRESHOLD && p < B.SCROLL_MOMENTUM_CRUISE_THRESHOLD) {
      const t = smoothstep(clamp01(
        (p - B.SCROLL_MOMENTUM_ROLL_THRESHOLD) /
        (B.SCROLL_MOMENTUM_CRUISE_THRESHOLD - B.SCROLL_MOMENTUM_ROLL_THRESHOLD),
      ));
      target = lerp(B.SCROLL_SPEED_MIN, B.SCROLL_SPEED_ROLL, t);
    } else if (p >= B.SCROLL_MOMENTUM_CRUISE_THRESHOLD && p < B.SCROLL_MOMENTUM_BOOST_THRESHOLD) {
      const t = smoothstep(clamp01(
        (p - B.SCROLL_MOMENTUM_CRUISE_THRESHOLD) /
        (B.SCROLL_MOMENTUM_BOOST_THRESHOLD - B.SCROLL_MOMENTUM_CRUISE_THRESHOLD),
      ));
      target = lerp(B.SCROLL_SPEED_ROLL, B.SCROLL_SPEED_CRUISE, t);
    } else if (p >= B.SCROLL_MOMENTUM_BOOST_THRESHOLD) {
      const t = smoothstep(clamp01(
        (p - B.SCROLL_MOMENTUM_BOOST_THRESHOLD) /
        (B.MOMENTUM_MAX - B.SCROLL_MOMENTUM_BOOST_THRESHOLD),
      ));
      target = lerp(B.SCROLL_SPEED_CRUISE, B.SCROLL_SPEED_MAX, t);
    }

    return Math.max(B.SCROLL_SPEED_MIN, target * launch);
  }

  private updateRaceSpeed(dt: number): void {
    const target = this.targetScrollSpeed();
    const rate = target > this.raceSpeed
      ? B.SCROLL_SPEED_RISE_PER_SEC
      : B.SCROLL_SPEED_FALL_PER_SEC;
    const maxStep = rate * dt;
    const delta = Math.max(-maxStep, Math.min(maxStep, target - this.raceSpeed));
    this.raceSpeed = Math.max(B.SCROLL_SPEED_MIN, Math.min(B.SCROLL_SPEED_MAX, this.raceSpeed + delta));
  }

  private kickRaceSpeed(amount: number): void {
    this.raceSpeed = Math.max(this.raceSpeed, this.targetScrollSpeed());
    this.raceSpeed = Math.min(B.SCROLL_SPEED_MAX, this.raceSpeed + amount);
  }

  speedPhase(): SpeedPhase {
    if (this.overdriveTimer > 0) return 'overdrive';
    if (this.runTime < B.LAUNCH_RAMP_SEC && this.raceSpeed < B.SCROLL_SPEED_ROLL * 0.5) return 'launch';
    if (this.raceSpeed >= B.SCROLL_SPEED_MAX * 0.82) return 'redline';
    if (this.raceSpeed >= B.SCROLL_SPEED_CRUISE) return 'boost';
    if (this.raceSpeed >= B.SCROLL_SPEED_ROLL) return 'cruise';
    return 'recover';
  }

  speedPhaseLabel(): string {
    switch (this.speedPhase()) {
      case 'launch': return 'LAUNCH';
      case 'recover': return 'RECOVER';
      case 'cruise': return 'CRUISE';
      case 'boost': return 'BOOST';
      case 'redline': return 'REDLINE';
      case 'overdrive': return 'OVERDRIVE';
    }
  }

  onHumanCrushed(value = 1): HumanCrushReward {
    if (this.comboTimer <= 0) this.combo = 0;
    this.combo += 1;
    this.comboTimer = B.CHAIN_WINDOW_SEC;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const comboMult = 1 + Math.min(this.combo, 50) * B.HUMAN_COMBO_GAIN_SCALE;
    const momentumGain = B.HUMAN_MOMENTUM_GAIN * value * comboMult;
    this.addMomentum(momentumGain);
    this.kickRaceSpeed(B.HUMAN_SPEED_KICK * value * Math.min(comboMult, 2.5));
    let overdriveStarted = false;
    if (this.combo >= B.OVERDRIVE_COMBO_THRESHOLD) {
      overdriveStarted = this.overdriveTimer <= 0;
      this.overdriveTimer = Math.max(this.overdriveTimer, B.OVERDRIVE_DURATION_SEC);
    }
    return { momentumGain, combo: this.combo, overdriveStarted };
  }

  onBuildingDestroyed(klass: RampageBuildingClass): void {
    const gain =
      klass === 'small' ? B.BUILDING_DESTROY_MOMENTUM_GAIN_SMALL :
      klass === 'medium' ? B.BUILDING_DESTROY_MOMENTUM_GAIN_MEDIUM :
      klass === 'large' ? B.BUILDING_DESTROY_MOMENTUM_GAIN_LARGE :
      B.BUILDING_DESTROY_MOMENTUM_GAIN_HUGE;
    this.addMomentum(gain);
    const kick =
      klass === 'small' ? B.BUILDING_SPEED_KICK_SMALL :
      klass === 'medium' ? B.BUILDING_SPEED_KICK_MEDIUM :
      klass === 'large' ? B.BUILDING_SPEED_KICK_LARGE :
      B.BUILDING_SPEED_KICK_HUGE;
    this.kickRaceSpeed(kick);
  }

  onHardBuildingImpact(): void {
    this.addMomentum(-B.HARD_BUILDING_IMPACT_PENALTY);
    this.raceSpeed = Math.max(B.SCROLL_SPEED_MIN, this.raceSpeed - B.HARD_IMPACT_SPEED_DROP);
    this.combo = 0;
    this.comboTimer = 0;
  }

  onBallLost(): void {
    this.addMomentum(-B.BALL_LOST_PENALTY);
    this.raceSpeed = Math.max(B.SCROLL_SPEED_MIN, this.raceSpeed - B.BALL_LOST_SPEED_DROP);
    this.combo = 0;
    this.comboTimer = 0;
  }

  isOverdrive(): boolean {
    return this.overdriveTimer > 0;
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
