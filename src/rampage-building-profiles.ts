import * as C from './constants';

export type RampageBuildingClass = 'small' | 'medium' | 'large' | 'huge';

export interface RampageBuildingProfile {
  klass: RampageBuildingClass;
  /** Relative chance when random-scattering buildings. Small buildings should dominate. */
  spawnWeight: number;
  /** Damage tuning hook for non-small buildings. */
  hpScale: number;
  /** Clamp for humans emitted when this building is destroyed. */
  minBurst: number;
  maxBurst: number;
  /** Small buildings are the main food loop and should break in one hit. */
  guaranteedOneShot: boolean;
}

const SMALL = new Set<C.BuildingSize>([
  'house', 'townhouse', 'garage', 'shed', 'greenhouse', 'bungalow', 'duplex',
  'shop', 'convenience', 'restaurant', 'cafe', 'bakery', 'bookstore', 'pharmacy',
  'laundromat', 'florist', 'ramen', 'izakaya', 'snack', 'yatai', 'kominka',
  'chaya', 'kura', 'dojo', 'wagashi', 'kimono_shop', 'sushi_ya',
]);

const MEDIUM = new Set<C.BuildingSize>([
  'apartment', 'parking', 'supermarket', 'karaoke', 'pachinko', 'game_center',
  'bank', 'library', 'museum', 'fire_station', 'police_station', 'movie_theater',
  'shrine', 'temple', 'machiya', 'ryokan', 'onsen_inn', 'warehouse',
  'container_stack', 'bus_terminal_shelter', 'shotengai_arcade', 'fountain_pavilion',
  'love_hotel', 'club', 'capsule_hotel',
]);

const LARGE = new Set<C.BuildingSize>([
  'office', 'apartment_tall', 'city_hall', 'business_hotel', 'train_station',
  'school', 'hospital', 'department_store', 'factory_stack', 'silo', 'crane_gantry',
  'pagoda', 'tahoto', 'carousel', 'big_tent', 'gas_station',
]);

const HUGE = new Set<C.BuildingSize>([
  'tower', 'skyscraper', 'clock_tower', 'radio_tower', 'ferris_wheel',
  'roller_coaster', 'stadium', 'castle',
]);

export function getRampageBuildingClass(size: C.BuildingSize): RampageBuildingClass {
  if (SMALL.has(size)) return 'small';
  if (MEDIUM.has(size)) return 'medium';
  if (LARGE.has(size)) return 'large';
  if (HUGE.has(size)) return 'huge';
  return 'medium';
}

export function getRampageBuildingProfile(size: C.BuildingSize): RampageBuildingProfile {
  const klass = getRampageBuildingClass(size);
  switch (klass) {
    case 'small':
      return { klass, spawnWeight: 80, hpScale: 1.0, minBurst: 3, maxBurst: 9, guaranteedOneShot: true };
    case 'medium':
      return { klass, spawnWeight: 15, hpScale: 1.0, minBurst: 6, maxBurst: 24, guaranteedOneShot: false };
    case 'large':
      return { klass, spawnWeight: 4, hpScale: 1.35, minBurst: 15, maxBurst: 48, guaranteedOneShot: false };
    case 'huge':
      return { klass, spawnWeight: 1, hpScale: 2.0, minBurst: 30, maxBurst: 78, guaranteedOneShot: false };
  }
}

export function computeRampageDamage(size: C.BuildingSize, momentum: number, overdrive: boolean): number {
  const profile = getRampageBuildingProfile(size);
  if (profile.guaranteedOneShot) return Number.POSITIVE_INFINITY;

  const t = Math.max(0, Math.min(1, momentum / 100));
  const base = 1 + Math.floor(t * 2);
  const overdriveBonus = overdrive ? 2 : 0;
  return Math.max(1, base + overdriveBonus);
}

export function clampHumanBurst(size: C.BuildingSize, requested: number): number {
  const profile = getRampageBuildingProfile(size);
  return Math.max(profile.minBurst, Math.min(profile.maxBurst, requested));
}

export function isSmallRampageBuilding(size: C.BuildingSize): boolean {
  return getRampageBuildingClass(size) === 'small';
}
