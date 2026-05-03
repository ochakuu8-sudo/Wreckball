import type { HumanRewardKind } from './humans';

export type RaceSpeedPhase = 'launch' | 'recover' | 'cruise' | 'boost' | 'redline' | 'overdrive';

export interface HumanEatReward {
  chargeGain: number;
  chain: number;
  gear: number;
  shiftedUp: boolean;
  overdriveStarted: boolean;
}

const MIN_GEAR = 1;
const MAX_GEAR = 5;

const MAX_SCROLL_SPEED = 600;
const MIN_SCROLL_SPEED = 30;
const GEAR_SPEED_MIN = [0, MIN_SCROLL_SPEED, 88, 170, 300, 440];
const GEAR_SPEED_MAX = [0, 90, 180, 320, 470, MAX_SCROLL_SPEED];
const GEAR_SHIFT_BOOST = [0, 18, 32, 48, 66, 82];
const CHARGE_INITIAL = 28;
const GEAR_UP_THRESHOLD = 100;
const GEAR_DOWN_THRESHOLD = 10;
const DOWNSHIFT_RECOVERY_CHARGE = 58;
const CHARGE_DECAY_GRACE_SEC = 1.35;
const CHARGE_DECAY_BASE_PER_SEC = 6.8;
const CHARGE_DECAY_GEAR_SCALE = 1.25;
const SPEED_DECAY_BASE_PER_SEC = 5;
const SPEED_DECAY_RATIO_PER_SEC = 0.16;
const HUMAN_SPEED_KICK = 3;
const CHAIN_WINDOW_SEC = 2.8;
const OVERDRIVE_DURATION_SEC = 3.8;
const CHECKPOINT_CHARGE_GAIN = 8;
const BALL_LOST_CHARGE_DROP = 34;
const BALL_LOST_SPEED_DROP = 62;

const HUMAN_REWARD: Record<HumanRewardKind, { charge: number; boost: number; chainScale: number }> = {
  runner:  { charge: 22, boost: 9, chainScale: 0.92 },
  crowd:   { charge: 14, boost: 6, chainScale: 0.70 },
  vip:     { charge: 40, boost: 18, chainScale: 1.10 },
  marshal: { charge: 26, boost: 11, chainScale: 0.96 },
};

export class RaceSpeedSystem {
  gear = MIN_GEAR;
  gearCharge = CHARGE_INITIAL;
  raceSpeed = MIN_SCROLL_SPEED;
  runTime = 0;
  humanChain = 0;
  maxHumanChain = 0;
  chainTimer = 0;
  timeSinceHuman = 99;
  overdriveTimer = 0;

  reset(): void {
    this.gear = MIN_GEAR;
    this.gearCharge = CHARGE_INITIAL;
    this.raceSpeed = MIN_SCROLL_SPEED;
    this.runTime = 0;
    this.humanChain = 0;
    this.maxHumanChain = 0;
    this.chainTimer = 0;
    this.timeSinceHuman = 99;
    this.overdriveTimer = 0;
  }

  update(dt: number): void {
    this.runTime += dt;
    this.timeSinceHuman += dt;
    this.overdriveTimer = Math.max(0, this.overdriveTimer - dt);

    if (this.chainTimer > 0) {
      this.chainTimer = Math.max(0, this.chainTimer - dt);
      if (this.chainTimer <= 0) this.humanChain = 0;
    }

    if (this.timeSinceHuman > CHARGE_DECAY_GRACE_SEC) {
      const gearPressure = 1 + (this.gear - 1) * CHARGE_DECAY_GEAR_SCALE;
      this.gearCharge = Math.max(0, this.gearCharge - CHARGE_DECAY_BASE_PER_SEC * gearPressure * dt);
      if (this.gear > MIN_GEAR && this.gearCharge < GEAR_DOWN_THRESHOLD) {
        this.shiftDown();
      }
    }

    this.updateRaceSpeed(dt);
  }

  onHumanEaten(kind: HumanRewardKind = 'runner', value = 1): HumanEatReward {
    const reward = HUMAN_REWARD[kind] ?? HUMAN_REWARD.runner;
    if (this.chainTimer <= 0) this.humanChain = 0;
    this.humanChain++;
    this.maxHumanChain = Math.max(this.maxHumanChain, this.humanChain);
    this.chainTimer = CHAIN_WINDOW_SEC;
    this.timeSinceHuman = 0;

    const chainMult = 1 + Math.min(this.humanChain, 40) * 0.025 * reward.chainScale;
    const chargeGain = reward.charge * value * chainMult;
    this.gearCharge += chargeGain;
    this.addSpeedKick(HUMAN_SPEED_KICK);

    let shiftedUp = false;
    let overdriveStarted = false;
    while (this.gearCharge >= GEAR_UP_THRESHOLD && this.gear < MAX_GEAR) {
      const overflow = this.gearCharge - GEAR_UP_THRESHOLD;
      this.gear++;
      this.gearCharge = Math.min(82, 20 + overflow * 0.45);
      shiftedUp = true;
    }

    if (this.gear >= MAX_GEAR && this.gearCharge >= GEAR_UP_THRESHOLD) {
      this.gearCharge = GEAR_UP_THRESHOLD;
      overdriveStarted = this.overdriveTimer <= 0;
      this.overdriveTimer = Math.max(this.overdriveTimer, OVERDRIVE_DURATION_SEC);
    }

    return {
      chargeGain,
      chain: this.humanChain,
      gear: this.gear,
      shiftedUp,
      overdriveStarted,
    };
  }

  onCheckpointReached(): { shiftedUp: boolean } {
    const before = this.gear;
    this.gearCharge = Math.min(GEAR_UP_THRESHOLD, this.gearCharge + CHECKPOINT_CHARGE_GAIN);
    if (this.gearCharge >= GEAR_UP_THRESHOLD && this.gear < MAX_GEAR) {
      this.gear++;
      this.gearCharge = 32;
    }
    return { shiftedUp: this.gear > before };
  }

  addRushBoost(amount: number): void {
    void amount;
  }

  onBallLost(): { shiftedDown: boolean } {
    const before = this.gear;
    this.gearCharge = Math.max(0, this.gearCharge - BALL_LOST_CHARGE_DROP);
    this.raceSpeed = Math.max(MIN_SCROLL_SPEED, this.raceSpeed - BALL_LOST_SPEED_DROP);
    this.humanChain = 0;
    this.chainTimer = 0;
    if (this.gear > MIN_GEAR) {
      this.shiftDown();
    }
    return { shiftedDown: this.gear < before };
  }

  ensureChargeAtLeast(charge: number): void {
    this.gearCharge = Math.max(this.gearCharge, clamp(charge, 0, GEAR_UP_THRESHOLD));
  }

  scrollSpeed(): number {
    return this.raceSpeed;
  }

  speedPercent(): number {
    return clamp01(this.raceSpeed / this.maxScrollSpeed()) * 100;
  }

  gearChargePercent(): number {
    return clamp(this.gearCharge, 0, GEAR_UP_THRESHOLD);
  }

  gearDownThreshold(): number {
    return GEAR_DOWN_THRESHOLD;
  }

  powerPercent(): number {
    if (this.isOverdrive()) return 100;
    return clamp((this.gear - 1) * 24 + this.gearCharge * 0.20, 0, 100);
  }

  phase(): RaceSpeedPhase {
    if (this.isOverdrive()) return 'overdrive';
    if (this.runTime < 1.4 && this.raceSpeed < 12) return 'launch';
    if (this.gear >= 5) return 'redline';
    if (this.gear >= 4) return 'boost';
    if (this.gear >= 2) return 'cruise';
    return this.gearCharge > GEAR_DOWN_THRESHOLD ? 'recover' : 'launch';
  }

  phaseLabel(): string {
    switch (this.phase()) {
      case 'launch': return 'LAUNCH';
      case 'recover': return 'RECOVER';
      case 'cruise': return 'CRUISE';
      case 'boost': return 'BOOST';
      case 'redline': return 'REDLINE';
      case 'overdrive': return 'OVERDRIVE';
    }
  }

  isOverdrive(): boolean {
    return this.overdriveTimer > 0;
  }

  private shiftDown(): void {
    this.gear = Math.max(MIN_GEAR, this.gear - 1);
    this.gearCharge = this.gear > MIN_GEAR ? DOWNSHIFT_RECOVERY_CHARGE : Math.max(this.gearCharge, 0);
    this.raceSpeed = Math.max(MIN_SCROLL_SPEED, Math.min(this.raceSpeed, this.speedLimit()));
  }

  private speedLimit(): number {
    const t = smoothstep(clamp01(this.gearCharge / GEAR_UP_THRESHOLD));
    const base = lerp(GEAR_SPEED_MIN[this.gear], GEAR_SPEED_MAX[this.gear], t);
    const overdriveBonus = this.isOverdrive() ? 48 : 0;
    return Math.max(MIN_SCROLL_SPEED, Math.min(this.maxScrollSpeed(), base + overdriveBonus));
  }

  private addSpeedKick(amount: number): void {
    const limit = this.speedLimit();
    const cap = Math.max(this.raceSpeed, limit);
    this.raceSpeed = clamp(this.raceSpeed + Math.max(0, amount), MIN_SCROLL_SPEED, cap);
  }

  private updateRaceSpeed(dt: number): void {
    const limit = this.speedLimit();
    const decay = SPEED_DECAY_BASE_PER_SEC + this.raceSpeed * SPEED_DECAY_RATIO_PER_SEC;
    const decayedSpeed = Math.max(MIN_SCROLL_SPEED, this.raceSpeed - decay * dt);
    this.raceSpeed = Math.min(decayedSpeed, limit);
  }

  private maxScrollSpeed(): number {
    return MAX_SCROLL_SPEED;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
