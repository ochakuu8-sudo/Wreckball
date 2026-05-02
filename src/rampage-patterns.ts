import * as C from './constants';

export type BlockIntent = 'recover' | 'choice' | 'gate' | 'cashout' | 'breather';
export type PlacementRole = 'feeder' | 'bank' | 'stopper' | 'vault' | 'release';
export type PatternLane = 'leftOuter' | 'leftInner' | 'center' | 'rightInner' | 'rightOuter';

export interface PatternPlacement {
  lane: PatternLane;
  y: number;
  sizes: readonly C.BuildingSize[];
  role: PlacementRole;
  xOffset?: number;
  xJitter?: number;
  yJitter?: number;
}

export interface BlockPattern {
  id: string;
  intent: BlockIntent;
  height: number;
  danger: number;
  reward: number;
  placements: readonly PatternPlacement[];
}

export const LANE_X: Record<PatternLane, number> = {
  leftOuter: -145,
  leftInner: -82,
  center: 0,
  rightInner: 82,
  rightOuter: 145,
};

const SMALL_SHOPS: C.BuildingSize[] = [
  'shop', 'convenience', 'restaurant', 'cafe', 'bakery', 'bookstore',
  'pharmacy', 'ramen', 'izakaya', 'yatai', 'wagashi', 'sushi_ya',
];

const SMALL_HOMES: C.BuildingSize[] = [
  'house', 'townhouse', 'garage', 'shed', 'greenhouse', 'bungalow',
  'duplex', 'kominka', 'chaya', 'kura', 'dojo',
];

const MEDIUM_STOPS: C.BuildingSize[] = [
  'apartment', 'supermarket', 'karaoke', 'game_center', 'bank',
  'library', 'movie_theater', 'warehouse', 'shotengai_arcade',
];

const RELEASE_BUILDINGS: C.BuildingSize[] = [
  'school', 'hospital', 'train_station', 'department_store',
  'bus_terminal_shelter', 'supermarket', 'game_center',
];

const VAULT_BUILDINGS: C.BuildingSize[] = [
  'office', 'apartment_tall', 'city_hall', 'business_hotel',
  'tower', 'skyscraper', 'stadium', 'ferris_wheel',
];

export const RAMPAGE_PATTERNS: readonly BlockPattern[] = [
  {
    id: 'recover_banks',
    intent: 'recover',
    height: 200,
    danger: 1,
    reward: 2,
    placements: [
      { lane: 'leftOuter', y: 0.18, sizes: SMALL_HOMES, role: 'bank', xJitter: 8, yJitter: 8 },
      { lane: 'leftOuter', y: 0.46, sizes: SMALL_SHOPS, role: 'bank', xJitter: 8, yJitter: 8 },
      { lane: 'rightOuter', y: 0.32, sizes: SMALL_HOMES, role: 'bank', xJitter: 8, yJitter: 8 },
      { lane: 'rightOuter', y: 0.70, sizes: SMALL_SHOPS, role: 'release', xJitter: 8, yJitter: 8 },
      { lane: 'leftInner', y: 0.76, sizes: SMALL_SHOPS, role: 'feeder', xJitter: 5, yJitter: 5 },
      { lane: 'rightInner', y: 0.55, sizes: SMALL_HOMES, role: 'feeder', xJitter: 5, yJitter: 5 },
      { lane: 'center', y: 0.38, sizes: SMALL_SHOPS, role: 'feeder', xJitter: 6, yJitter: 6 },
      { lane: 'leftOuter', y: 0.90, sizes: SMALL_HOMES, role: 'bank', xJitter: 8, yJitter: 6 },
    ],
  },
  {
    id: 'choice_safe_left_reward_right',
    intent: 'choice',
    height: 200,
    danger: 2,
    reward: 3,
    placements: [
      { lane: 'leftOuter', y: 0.20, sizes: SMALL_HOMES, role: 'bank', xJitter: 7, yJitter: 7 },
      { lane: 'leftOuter', y: 0.48, sizes: SMALL_SHOPS, role: 'bank', xJitter: 7, yJitter: 7 },
      { lane: 'leftInner', y: 0.74, sizes: SMALL_SHOPS, role: 'feeder', xJitter: 4, yJitter: 5 },
      { lane: 'rightInner', y: 0.32, sizes: MEDIUM_STOPS, role: 'stopper', xOffset: 10, xJitter: 3, yJitter: 5 },
      { lane: 'rightOuter', y: 0.62, sizes: RELEASE_BUILDINGS, role: 'release', xJitter: 7, yJitter: 6 },
      { lane: 'rightOuter', y: 0.86, sizes: SMALL_SHOPS, role: 'bank', xJitter: 7, yJitter: 6 },
      { lane: 'leftInner', y: 0.35, sizes: SMALL_HOMES, role: 'feeder', xOffset: -8, xJitter: 4, yJitter: 5 },
      { lane: 'center', y: 0.56, sizes: SMALL_SHOPS, role: 'feeder', xJitter: 7, yJitter: 5 },
    ],
  },
  {
    id: 'choice_mirror_reward_left',
    intent: 'choice',
    height: 200,
    danger: 2,
    reward: 3,
    placements: [
      { lane: 'rightOuter', y: 0.20, sizes: SMALL_HOMES, role: 'bank', xJitter: 7, yJitter: 7 },
      { lane: 'rightOuter', y: 0.48, sizes: SMALL_SHOPS, role: 'bank', xJitter: 7, yJitter: 7 },
      { lane: 'rightInner', y: 0.74, sizes: SMALL_SHOPS, role: 'feeder', xJitter: 4, yJitter: 5 },
      { lane: 'leftInner', y: 0.32, sizes: MEDIUM_STOPS, role: 'stopper', xOffset: -10, xJitter: 3, yJitter: 5 },
      { lane: 'leftOuter', y: 0.62, sizes: RELEASE_BUILDINGS, role: 'release', xJitter: 7, yJitter: 6 },
      { lane: 'leftOuter', y: 0.86, sizes: SMALL_SHOPS, role: 'bank', xJitter: 7, yJitter: 6 },
      { lane: 'rightInner', y: 0.35, sizes: SMALL_HOMES, role: 'feeder', xOffset: 8, xJitter: 4, yJitter: 5 },
      { lane: 'center', y: 0.56, sizes: SMALL_SHOPS, role: 'feeder', xJitter: 7, yJitter: 5 },
    ],
  },
  {
    id: 'gate_twin_stoppers',
    intent: 'gate',
    height: 200,
    danger: 4,
    reward: 4,
    placements: [
      { lane: 'leftInner', y: 0.36, sizes: MEDIUM_STOPS, role: 'stopper', xOffset: -12, yJitter: 4 },
      { lane: 'rightInner', y: 0.36, sizes: MEDIUM_STOPS, role: 'stopper', xOffset: 12, yJitter: 4 },
      { lane: 'leftOuter', y: 0.17, sizes: SMALL_SHOPS, role: 'bank', xJitter: 8, yJitter: 6 },
      { lane: 'rightOuter', y: 0.68, sizes: RELEASE_BUILDINGS, role: 'release', xJitter: 8, yJitter: 7 },
      { lane: 'rightOuter', y: 0.18, sizes: SMALL_HOMES, role: 'bank', xJitter: 8, yJitter: 6 },
      { lane: 'leftOuter', y: 0.82, sizes: SMALL_SHOPS, role: 'release', xJitter: 8, yJitter: 7 },
      { lane: 'center', y: 0.58, sizes: SMALL_SHOPS, role: 'feeder', xJitter: 5, yJitter: 4 },
    ],
  },
  {
    id: 'cashout_overdrive_bank',
    intent: 'cashout',
    height: 200,
    danger: 5,
    reward: 6,
    placements: [
      { lane: 'leftInner', y: 0.38, sizes: VAULT_BUILDINGS, role: 'vault', xOffset: -26, xJitter: 2, yJitter: 5 },
      { lane: 'rightOuter', y: 0.28, sizes: RELEASE_BUILDINGS, role: 'release', xJitter: 7, yJitter: 7 },
      { lane: 'rightInner', y: 0.72, sizes: MEDIUM_STOPS, role: 'stopper', xJitter: 4, yJitter: 5 },
      { lane: 'leftOuter', y: 0.78, sizes: SMALL_SHOPS, role: 'bank', xJitter: 8, yJitter: 7 },
      { lane: 'rightOuter', y: 0.88, sizes: SMALL_HOMES, role: 'bank', xJitter: 8, yJitter: 6 },
      { lane: 'leftOuter', y: 0.18, sizes: SMALL_SHOPS, role: 'feeder', xJitter: 8, yJitter: 6 },
      { lane: 'center', y: 0.55, sizes: MEDIUM_STOPS, role: 'stopper', xJitter: 4, yJitter: 5 },
    ],
  },
  {
    id: 'breather_open_road',
    intent: 'breather',
    height: 200,
    danger: 0,
    reward: 1,
    placements: [
      { lane: 'leftOuter', y: 0.26, sizes: SMALL_HOMES, role: 'bank', xJitter: 10, yJitter: 8 },
      { lane: 'rightOuter', y: 0.68, sizes: SMALL_SHOPS, role: 'release', xJitter: 10, yJitter: 8 },
      { lane: 'leftInner', y: 0.78, sizes: SMALL_SHOPS, role: 'feeder', xOffset: -8, xJitter: 5, yJitter: 6 },
      { lane: 'center', y: 0.46, sizes: SMALL_HOMES, role: 'bank', xJitter: 8, yJitter: 7 },
    ],
  },
];

export function patternsForIntent(intent: BlockIntent): readonly BlockPattern[] {
  return RAMPAGE_PATTERNS.filter((pattern) => pattern.intent === intent);
}
