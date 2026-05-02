import { getRampageBuildingProfile } from './rampage-building-profiles';
import type { RampageLayoutBand } from './rampage-generation';

export type RampageLayoutIssueLevel = 'error' | 'warn' | 'metric';

export interface RampageLayoutIssue {
  level: RampageLayoutIssueLevel;
  rule: string;
  message: string;
}

export interface RampageLayoutMetrics {
  buildings: number;
  small: number;
  medium: number;
  large: number;
  huge: number;
  humans: number;
  feeders: number;
  releases: number;
  stoppers: number;
  vaults: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function buildingRect(building: RampageLayoutBand['buildings'][number]): Rect {
  const def = getBuildingDef(building.size);
  const profile = getRampageBuildingProfile(building.size);
  const pad = profile.klass === 'small' ? 2 : profile.klass === 'medium' ? 4 : 6;
  return {
    x: building.x - def.w / 2 - pad,
    y: building.y - pad,
    w: def.w + pad * 2,
    h: def.h + pad * 2,
  };
}

function getBuildingDef(size: RampageLayoutBand['buildings'][number]['size']): { w: number; h: number } {
  // Late import indirection keeps this validator cheap to use from CLI code.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const C = require('./constants') as typeof import('./constants');
  return C.BUILDING_DEFS[size];
}

export function measureRampageLayoutBand(layout: RampageLayoutBand): RampageLayoutMetrics {
  const metrics: RampageLayoutMetrics = {
    buildings: layout.buildings.length,
    small: 0,
    medium: 0,
    large: 0,
    huge: 0,
    humans: layout.humans.length,
    feeders: 0,
    releases: 0,
    stoppers: 0,
    vaults: 0,
  };

  for (const building of layout.buildings) {
    const profile = getRampageBuildingProfile(building.size);
    metrics[profile.klass] += 1;
    if (building.role === 'feeder') metrics.feeders += 1;
    if (building.role === 'release') metrics.releases += 1;
    if (building.role === 'stopper') metrics.stoppers += 1;
    if (building.role === 'vault') metrics.vaults += 1;
  }

  return metrics;
}

export function validateRampageLayoutBand(layout: RampageLayoutBand): RampageLayoutIssue[] {
  const issues: RampageLayoutIssue[] = [];
  const metrics = measureRampageLayoutBand(layout);
  const push = (level: RampageLayoutIssueLevel, rule: string, message: string) => issues.push({ level, rule, message });

  if (metrics.buildings < 5) push('warn', 'density', `low building count: ${metrics.buildings}`);
  if (metrics.small < 3) push('warn', 'food-loop', `too few small buildings for chain food: ${metrics.small}`);
  if (metrics.humans < 4) push('warn', 'reward-density', `low preplaced human count: ${metrics.humans}`);
  if (metrics.large + metrics.huge > 3) push('warn', 'skyline', `heavy skyline may block readability: large=${metrics.large} huge=${metrics.huge}`);

  if (layout.motifId === 'feed_chain') {
    if (metrics.feeders < 2) push('warn', 'motif-feed-chain', `feed_chain should have at least 2 feeders, found ${metrics.feeders}`);
    if (metrics.small < 5) push('warn', 'motif-feed-chain', `feed_chain should have at least 5 small buildings, found ${metrics.small}`);
  }

  if (layout.motifId === 'panic_plaza') {
    if (metrics.humans < 8) push('warn', 'motif-panic-plaza', `panic_plaza should have dense humans, found ${metrics.humans}`);
    if (metrics.releases < 1) push('warn', 'motif-panic-plaza', 'panic_plaza should include at least one release building');
  }

  if (layout.motifId === 'score_wall') {
    if (metrics.vaults < 1 && metrics.large + metrics.huge < 1) {
      push('warn', 'motif-score-wall', 'score_wall needs a vault or large landmark target');
    }
  }

  if (layout.motifId === 'split_reward') {
    const leftReward = layout.buildings.filter((b) => b.x < -20 && (b.role === 'release' || b.role === 'vault')).length;
    const rightReward = layout.buildings.filter((b) => b.x > 20 && (b.role === 'release' || b.role === 'vault')).length;
    if (leftReward === 0 || rightReward === 0) {
      push('warn', 'motif-split-reward', `split_reward should present rewards on both sides, left=${leftReward} right=${rightReward}`);
    }
  }

  const rects = layout.buildings.map(buildingRect);
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (rectsOverlap(rects[i], rects[j])) {
        push('error', 'building-overlap', `building ${i} overlaps building ${j}`);
      }
    }
  }

  push('metric', 'summary', JSON.stringify(metrics));
  return issues;
}
