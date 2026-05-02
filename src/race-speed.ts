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

const GEAR_SPEED_MIN = [0, 0, 22, 40, 62, 86];
const GEAR_SPEED_MAX = [0, 34, 55, 78, 104, 128];
const GEAR_SHIFT_BOOST = [0, 10, 14, 18, 22, 28];
const CHARGE_INITIAL = 28;
const GEAR_UP_THRESHOLD = 100;
const GEAR_DOWN_THRESHOLD = 12;
const DOWNSHIFT_RECOVERY_CHARGE = 58;
const CHARGE_DECAY_GRACE_SEC = 1.15;
const CHARGE_DECAY_BASE_PER_SEC = 7.5;
const CHARGE_DECAY_GEAR_SCALE = 1.35;
const BOOST_DECAY_PER_SEC = 24;
const SPEED_RISE_PER_SEC = 220;
const SPEED_FALL_PER_SEC = 18;
const CHAIN_WINDOW_SEC = 2.35;
const OVERDRIVE_DURATION_SEC = 3.0;
const CHECKPOINT_CHARGE_GAIN = 8;
const CHECKPOINT_BOOST = 8;
const BALL_LOST_CHARGE_DROP = 34;
const BALL_LOST_SPEED_DROP = 48;

const HUMAN_REWARD: Record<HumanRewardKind, { charge: number; boost: number; chainScale: number }> = {
  runner:  { charge: 18, boost: 16, chainScale: 0.85 },
  crowd:   { charge: 12, boost: 12, chainScale: 0.65 },
  vip:     { charge: 34, boost: 28, chainScale: 1.05 },
  marshal: { charge: 22, boost: 18, chainScale: 0.90 },
};

export class RaceSpeedSystem {
  gear = MIN_GEAR;
  gearCharge = CHARGE_INITIAL;
  raceSpeed = 0;
  boostSpeed = 0;
  runTime = 0;
  humanChain = 0;
  maxHumanChain = 0;
  chainTimer = 0;
  timeSinceHuman = 99;
  overdriveTimer = 0;

  reset(): void {
    this.gear = MIN_GEAR;
    this.gearCharge = CHARGE_INITIAL;
    this.raceSpeed = 0;
    this.boostSpeed = 0;
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
    this.boostSpeed = Math.max(0, this.boostSpeed - BOOST_DECAY_PER_SEC * dt);

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
    this.boostSpeed += reward.boost * value * Math.min(1.9, chainMult);

    let shiftedUp = false;
    let overdriveStarted = false;
    while (this.gearCharge >= GEAR_UP_THRESHOLD && this.gear < MAX_GEAR) {
      const overflow = this.gearCharge - GEAR_UP_THRESHOLD;
      this.gear++;
      this.gearCharge = Math.min(82, 20 + overflow * 0.45);
      this.boostSpeed += GEAR_SHIFT_BOOST[this.gear];
      shiftedUp = true;
    }

    if (this.gear >= MAX_GEAR && this.gearCharge >= GEAR_UP_THRESHOLD) {
      this.gearCharge = GEAR_UP_THRESHOLD;
      overdriveStarted = this.overdriveTimer <= 0;
      this.overdriveTimer = Math.max(this.overdriveTimer, OVERDRIVE_DURATION_SEC);
      this.boostSpeed += 18;
    }

    this.raceSpeed = Math.max(this.raceSpeed, this.targetSpeed() * 0.78);
    this.raceSpeed = Math.min(this.maxScrollSpeed(), this.raceSpeed + reward.boost * 0.55);

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
    this.boostSpeed += CHECKPOINT_BOOST;
    if (this.gearCharge >= GEAR_UP_THRESHOLD && this.gear < MAX_GEAR) {
      this.gear++;
      this.gearCharge = 24;
      this.boostSpeed += GEAR_SHIFT_BOOST[this.gear];
    }
    return { shiftedUp: this.gear > before };
  }

  onBallLost(): { shiftedDown: boolean } {
    const before = this.gear;
    this.gearCharge = Math.max(0, this.gearCharge - BALL_LOST_CHARGE_DROP);
    this.boostSpeed = 0;
    this.raceSpeed = Math.max(0, this.raceSpeed - BALL_LOST_SPEED_DROP);
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
    this.raceSpeed = Math.min(this.raceSpeed, this.targetSpeed());
  }

  private targetSpeed(): number {
    const t = smoothstep(clamp01(this.gearCharge / GEAR_UP_THRESHOLD));
    const base = lerp(GEAR_SPEED_MIN[this.gear], GEAR_SPEED_MAX[this.gear], t);
    const overdriveBonus = this.isOverdrive() ? 18 : 0;
    return Math.min(this.maxScrollSpeed(), base + this.boostSpeed + overdriveBonus);
  }

  private updateRaceSpeed(dt: number): void {
    const target = this.targetSpeed();
    const rate = target > this.raceSpeed ? SPEED_RISE_PER_SEC : SPEED_FALL_PER_SEC;
    const maxStep = rate * dt;
    const delta = clamp(target - this.raceSpeed, -maxStep, maxStep);
    this.raceSpeed = clamp(this.raceSpeed + delta, 0, this.maxScrollSpeed());
  }

  private maxScrollSpeed(): number {
    return GEAR_SPEED_MAX[MAX_GEAR] + 26;
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
