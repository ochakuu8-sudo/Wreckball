import * as C from '../src/constants';
import { debugRampageRoadLayoutBand, type RampageRoadDebug } from '../src/rampage-generation';

interface Issue {
  level: 'error' | 'warn';
  block: number;
  msg: string;
}

const issues: Issue[] = [];
const push = (level: Issue['level'], block: number, msg: string) => issues.push({ level, block, msg });
const key = (p: { x: number; y: number }) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
const between = (v: number, a: number, b: number) => v >= Math.min(a, b) - 0.001 && v <= Math.max(a, b) + 0.001;
const ROAD_OVERLAP = 12;
const ROAD_GROUND_TYPES = new Set(['asphalt', 'local_road', 'sidewalk']);
const ROAD_SENSITIVE_DECALS = new Set(['frontage_pad', 'plaza', 'parking_stall', 'shop_stripe', 'planter', 'lot_frame', 'facade_row']);

function rectOverlapArea(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): number {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

function centerRect(item: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
  return { x: item.x - item.w / 2, y: item.y - item.h / 2, w: item.w, h: item.h };
}

function pointOnMainPath(p: { x: number; y: number }, layout: RampageRoadDebug): boolean {
  return layout.edges.some((edge) => {
    if (!edge.mainPath) return false;
    if (Math.abs(edge.from.x - edge.to.x) < 0.001) {
      return Math.abs(p.x - edge.from.x) < 0.001 && between(p.y, edge.from.y, edge.to.y);
    }
    if (Math.abs(edge.from.y - edge.to.y) < 0.001) {
      return Math.abs(p.y - edge.from.y) < 0.001 && between(p.x, edge.from.x, edge.to.x);
    }
    return false;
  });
}

function hasMainPathTraversal(layout: RampageRoadDebug): boolean {
  const mainEdges = layout.edges.filter((edge) => edge.mainPath);
  if (mainEdges.length === 0) return false;
  const minY = Math.min(...mainEdges.flatMap((edge) => [edge.from.y, edge.to.y]));
  const maxY = Math.max(...mainEdges.flatMap((edge) => [edge.from.y, edge.to.y]));
  const start = key({ x: layout.bottomX, y: minY });
  const goal = key({ x: layout.topX, y: maxY });
  const graph = new Map<string, string[]>();
  for (const edge of mainEdges) {
    const a = key(edge.from);
    const b = key(edge.to);
    graph.set(a, [...(graph.get(a) ?? []), b]);
    graph.set(b, [...(graph.get(b) ?? []), a]);
  }
  const stack = [start];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (cur === goal) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of graph.get(cur) ?? []) stack.push(next);
  }
  return false;
}

function edgeCanReachMain(edge: RampageRoadDebug['edges'][number], layout: RampageRoadDebug): boolean {
  if (edge.mainPath) return true;
  const mainNodes = new Set<string>();
  const graph = new Map<string, string[]>();
  for (const candidate of layout.edges) {
    const a = key(candidate.from);
    const b = key(candidate.to);
    graph.set(a, [...(graph.get(a) ?? []), b]);
    graph.set(b, [...(graph.get(b) ?? []), a]);
    if (candidate.mainPath) {
      mainNodes.add(a);
      mainNodes.add(b);
    }
  }

  const stack = [key(edge.from), key(edge.to)];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (mainNodes.has(cur)) return true;
    const [x, y] = cur.split(',').map(Number);
    if (pointOnMainPath({ x, y }, layout)) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of graph.get(cur) ?? []) stack.push(next);
  }
  return false;
}

function checkLayout(layout: RampageRoadDebug): void {
  const baseY = C.WORLD_MIN_Y + 10 + (layout.blockIdx + 4) * C.CHUNK_HEIGHT;

  if (!hasMainPathTraversal(layout)) {
    push('error', layout.blockIdx, 'main road graph does not connect bottom boundary to top boundary');
  }

  const mainEdges = layout.edges.filter((edge) => edge.mainPath);
  const minMainY = Math.min(...mainEdges.flatMap((edge) => [edge.from.y, edge.to.y]));
  const maxMainY = Math.max(...mainEdges.flatMap((edge) => [edge.from.y, edge.to.y]));
  if (minMainY > baseY - ROAD_OVERLAP + 0.001) {
    push('error', layout.blockIdx, `main road does not overlap lower boundary by ${ROAD_OVERLAP}px`);
  }
  if (maxMainY < baseY + C.CHUNK_HEIGHT + ROAD_OVERLAP - 0.001) {
    push('error', layout.blockIdx, `main road does not overlap upper boundary by ${ROAD_OVERLAP}px`);
  }

  for (const edge of layout.edges) {
    if (edge.mainPath) continue;
    const connected = pointOnMainPath(edge.from, layout) || pointOnMainPath(edge.to, layout) || edgeCanReachMain(edge, layout);
    if (!connected) {
      push('error', layout.blockIdx, `non-main ${edge.role} road cannot reach the main road graph`);
    }
    if (edge.endpoint === 'through' && layout.templateId !== 'downtown_crossing') {
      push('error', layout.blockIdx, `through side road appears in ${layout.templateId}`);
    }
    if (edge.endpoint !== 'through' && !['dead_end', 'driveway', 'plaza'].includes(edge.endpoint)) {
      push('error', layout.blockIdx, `road endpoint '${edge.endpoint}' is not meaningful`);
    }
  }

  for (const ground of layout.grounds) {
    if (ROAD_GROUND_TYPES.has(ground.type)) {
      push('error', layout.blockIdx, `road ground '${ground.type}' leaked into grounds`);
    }
  }

  const roadZones = layout.roadSurfaces
    .filter((surface) => surface.kind === 'road' || surface.kind === 'junction')
    .map(centerRect);
  if (!layout.roadSurfaces.some((surface) => surface.kind === 'road')) {
    push('error', layout.blockIdx, 'road layer has no road surfaces');
  }
  if (!layout.roadSurfaces.some((surface) => surface.kind === 'sidewalk')) {
    push('error', layout.blockIdx, 'road layer has no sidewalk surfaces');
  }
  for (const decal of layout.groundDecals) {
    if (!ROAD_SENSITIVE_DECALS.has(decal.kind)) continue;
    const rect = centerRect(decal);
    const area = Math.max(1, Math.abs(rect.w * rect.h));
    if (roadZones.some((zone) => rectOverlapArea(rect, zone) / area > 0.22)) {
      push('error', layout.blockIdx, `ground decal '${decal.kind}' overlaps road envelope`);
    }
  }
}

const layouts: RampageRoadDebug[] = [];
for (let blockIdx = -4; blockIdx <= 32; blockIdx++) {
  const baseY = C.WORLD_MIN_Y + 10 + (blockIdx + 4) * C.CHUNK_HEIGHT;
  layouts.push(debugRampageRoadLayoutBand(baseY, C.CHUNK_HEIGHT, {
    blockIdx,
    momentum: blockIdx < -2 ? 22 : 48,
    overdrive: blockIdx % 7 === 0,
    combo: blockIdx % 5 === 0 ? 15 : 0,
  }));
}

layouts.forEach(checkLayout);
for (let i = 0; i < layouts.length - 1; i++) {
  const a = layouts[i];
  const b = layouts[i + 1];
  if (Math.abs(a.topX - b.bottomX) > 0.001) {
    push('error', a.blockIdx, `top boundary x=${a.topX} does not match block ${b.blockIdx} bottom x=${b.bottomX}`);
  }
}

for (const issue of issues) {
  console.log(`${issue.level.toUpperCase()} block ${issue.block}: ${issue.msg}`);
}

const errors = issues.filter((issue) => issue.level === 'error').length;
if (errors > 0) {
  console.error(`Rampage road check failed: ${errors} error(s), ${issues.length - errors} warning(s)`);
  process.exit(1);
}

console.log(`Rampage road check passed: ${layouts.length} bands verified`);
