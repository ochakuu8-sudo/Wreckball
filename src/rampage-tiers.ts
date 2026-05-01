import * as C from './constants';
import type { WreckPower } from './rampage-rules';

const TIER_1 = new Set<C.BuildingSize>([
  'house', 'townhouse', 'garage', 'shed', 'greenhouse', 'bungalow', 'duplex',
  'shop', 'convenience', 'restaurant', 'cafe', 'bakery', 'bookstore', 'pharmacy',
  'laundromat', 'florist', 'ramen', 'izakaya', 'snack', 'yatai', 'kominka',
  'chaya', 'kura', 'dojo', 'wagashi', 'kimono_shop', 'sushi_ya',
]);

const TIER_2 = new Set<C.BuildingSize>([
  'apartment', 'parking', 'supermarket', 'karaoke', 'pachinko', 'game_center',
  'bank', 'library', 'museum', 'fire_station', 'police_station', 'movie_theater',
  'shrine', 'temple', 'machiya', 'ryokan', 'onsen_inn', 'warehouse',
  'container_stack', 'bus_terminal_shelter', 'shotengai_arcade', 'fountain_pavilion',
  'love_hotel', 'club', 'capsule_hotel',
]);

const TIER_3 = new Set<C.BuildingSize>([
  'office', 'apartment_tall', 'city_hall', 'business_hotel', 'train_station',
  'school', 'hospital', 'department_store', 'factory_stack', 'silo', 'crane_gantry',
  'pagoda', 'tahoto', 'carousel', 'big_tent', 'gas_station',
]);

const TIER_4 = new Set<C.BuildingSize>([
  'tower', 'skyscraper', 'clock_tower', 'radio_tower', 'ferris_wheel', 'roller_coaster',
]);

export function getRequiredWreckTier(size: C.BuildingSize): WreckPower {
  if (TIER_1.has(size)) return 1;
  if (TIER_2.has(size)) return 2;
  if (TIER_3.has(size)) return 3;
  if (TIER_4.has(size)) return 4;
  return 5;
}

export function humanValueForTier(tier: WreckPower): number {
  return 1 + tier * 0.22;
}
