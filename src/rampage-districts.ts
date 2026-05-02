import type { RampageGenerationContext, LayoutMotifId } from './rampage-generation';

type SeededRampageGenerationContext = RampageGenerationContext & { runSeed?: number };

export type RampageDistrictKind =
  | 'residential'
  | 'shopping'
  | 'station'
  | 'downtown'
  | 'civic'
  | 'construction'
  | 'park';

export type RampageCityBlockTemplateId =
  | 'shopping_street'
  | 'residential_lane'
  | 'downtown_crossing'
  | 'civic_plaza'
  | 'station_front'
  | 'construction_edge';

export interface RampageDistrictSpan {
  kind: RampageDistrictKind;
  startBlock: number;
  endBlock: number;
  intensity: number;
  spanIndex: number;
}

export interface RampageSkylineBudget {
  smallMin: number;
  smallMax: number;
  mediumMin: number;
  mediumMax: number;
  largeMin: number;
  largeMax: number;
  hugeMax: number;
}

export const RAMPAGE_SKYLINE_BUDGETS: Record<RampageDistrictKind, RampageSkylineBudget> = {
  residential: { smallMin: 8, smallMax: 14, mediumMin: 0, mediumMax: 2, largeMin: 0, largeMax: 0, hugeMax: 0 },
  shopping: { smallMin: 10, smallMax: 16, mediumMin: 1, mediumMax: 3, largeMin: 0, largeMax: 1, hugeMax: 0 },
  station: { smallMin: 6, smallMax: 10, mediumMin: 2, mediumMax: 4, largeMin: 1, largeMax: 1, hugeMax: 0 },
  downtown: { smallMin: 5, smallMax: 10, mediumMin: 3, mediumMax: 6, largeMin: 1, largeMax: 2, hugeMax: 1 },
  civic: { smallMin: 4, smallMax: 8, mediumMin: 2, mediumMax: 4, largeMin: 0, largeMax: 1, hugeMax: 0 },
  construction: { smallMin: 3, smallMax: 6, mediumMin: 3, mediumMax: 5, largeMin: 1, largeMax: 2, hugeMax: 0 },
  park: { smallMin: 1, smallMax: 4, mediumMin: 0, mediumMax: 1, largeMin: 0, largeMax: 0, hugeMax: 0 },
};

const DISTRICT_SEQUENCE: readonly RampageDistrictKind[] = [
  'residential',
  'shopping',
  'station',
  'shopping',
  'downtown',
  'civic',
  'park',
  'construction',
  'downtown',
  'shopping',
];

function positiveMod(v: number, mod: number): number {
  return ((v % mod) + mod) % mod;
}

export function rampageNoise(seed: number, salt: number): number {
  const v = Math.sin(seed * 91.721 + salt * 17.13) * 43758.5453;
  return v - Math.floor(v);
}

export function rampageBandSeed(ctx: SeededRampageGenerationContext): number {
  const runSeed = ctx.runSeed ?? 1337;
  return runSeed + ctx.blockIdx * 1009;
}

export function rampageBandRand(ctx: SeededRampageGenerationContext, salt: number): number {
  return rampageNoise(rampageBandSeed(ctx), salt);
}

export function rampageRandRange(ctx: SeededRampageGenerationContext, salt: number, min: number, max: number): number {
  return min + rampageBandRand(ctx, salt) * (max - min);
}

export function rampagePickSeeded<T>(items: readonly T[], ctx: SeededRampageGenerationContext, salt: number): T {
  if (items.length === 0) throw new Error('rampagePickSeeded requires at least one item');
  return items[Math.floor(rampageBandRand(ctx, salt) * items.length)];
}

function spanLengthFor(index: number, seed: number): number {
  const n = rampageNoise(seed + index * 31, 7);
  return 2 + Math.floor(n * 4); // 2..5 bands
}

export function getRampageDistrictSpan(blockIdx: number, runSeed = 1337): RampageDistrictSpan {
  let cursor = -4;
  let spanIndex = 0;

  while (cursor <= blockIdx + 64) {
    const len = spanLengthFor(spanIndex, runSeed);
    const startBlock = cursor;
    const endBlock = cursor + len - 1;
    if (blockIdx >= startBlock && blockIdx <= endBlock) {
      const sequenceOffset = Math.floor(rampageNoise(runSeed, 19) * DISTRICT_SEQUENCE.length);
      const kind = DISTRICT_SEQUENCE[positiveMod(spanIndex + sequenceOffset, DISTRICT_SEQUENCE.length)];
      return {
        kind,
        startBlock,
        endBlock,
        intensity: 0.35 + rampageNoise(runSeed + spanIndex * 47, 23) * 0.65,
        spanIndex,
      };
    }
    cursor += len;
    spanIndex += 1;
  }

  return { kind: 'shopping', startBlock: blockIdx, endBlock: blockIdx, intensity: 0.5, spanIndex };
}

export function templateForDistrict(
  district: RampageDistrictKind,
  motifId?: LayoutMotifId,
  overdrive = false,
): RampageCityBlockTemplateId {
  if (motifId === 'breaker_gate') return 'construction_edge';
  if (overdrive || motifId === 'score_wall') return 'downtown_crossing';
  if (motifId === 'panic_plaza') return district === 'station' ? 'station_front' : 'shopping_street';
  if (motifId === 'split_reward' && (district === 'station' || district === 'civic')) return 'station_front';

  switch (district) {
    case 'residential': return 'residential_lane';
    case 'shopping': return 'shopping_street';
    case 'station': return 'station_front';
    case 'downtown': return 'downtown_crossing';
    case 'civic': return 'civic_plaza';
    case 'construction': return 'construction_edge';
    case 'park': return 'civic_plaza';
  }
}

export function skylineBudgetForDistrict(district: RampageDistrictKind): RampageSkylineBudget {
  return RAMPAGE_SKYLINE_BUDGETS[district];
}

export function describeRampageDistrict(span: RampageDistrictSpan): string {
  return `${span.kind} blocks ${span.startBlock}..${span.endBlock} intensity=${span.intensity.toFixed(2)}`;
}
