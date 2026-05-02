import {
  describeRampageDistrict,
  getRampageDistrictSpan,
  skylineBudgetForDistrict,
  templateForDistrict,
  type RampageDistrictKind,
} from '../src/rampage-districts';

interface Issue {
  level: 'error' | 'warn' | 'info';
  block: number;
  msg: string;
}

const issues: Issue[] = [];
const push = (level: Issue['level'], block: number, msg: string) => issues.push({ level, block, msg });

const argSeed = process.argv.find((arg) => arg.startsWith('--seed='));
const argStart = process.argv.find((arg) => arg.startsWith('--start='));
const argEnd = process.argv.find((arg) => arg.startsWith('--end='));

const seed = argSeed ? parseInt(argSeed.split('=')[1], 10) : 1337;
const start = argStart ? parseInt(argStart.split('=')[1], 10) : -4;
const end = argEnd ? parseInt(argEnd.split('=')[1], 10) : 32;

if (!Number.isFinite(seed)) throw new Error('Invalid --seed value');
if (!Number.isFinite(start)) throw new Error('Invalid --start value');
if (!Number.isFinite(end)) throw new Error('Invalid --end value');
if (start > end) throw new Error('--start must be <= --end');

const counts: Partial<Record<RampageDistrictKind, number>> = {};
let previousEnd = start - 1;
let previousSpanKey = '';
let currentSpanLength = 0;

for (let block = start; block <= end; block++) {
  const span = getRampageDistrictSpan(block, seed);
  const key = `${span.startBlock}:${span.endBlock}:${span.kind}`;
  counts[span.kind] = (counts[span.kind] ?? 0) + 1;

  if (block < span.startBlock || block > span.endBlock) {
    push('error', block, `district span does not contain block: ${describeRampageDistrict(span)}`);
  }

  if (span.startBlock > block) {
    push('error', block, `district span starts in the future: ${describeRampageDistrict(span)}`);
  }

  if (key !== previousSpanKey) {
    if (currentSpanLength > 0 && (currentSpanLength < 2 || currentSpanLength > 5)) {
      push('warn', block - 1, `previous visible district span length was ${currentSpanLength}, expected 2..5`);
    }
    if (previousEnd >= start && span.startBlock > previousEnd + 1) {
      push('error', block, `district gap after block ${previousEnd}: ${describeRampageDistrict(span)}`);
    }
    previousSpanKey = key;
    previousEnd = span.endBlock;
    currentSpanLength = 1;
  } else {
    currentSpanLength += 1;
  }

  const template = templateForDistrict(span.kind);
  const budget = skylineBudgetForDistrict(span.kind);
  if (budget.smallMin > budget.smallMax) push('error', block, `${span.kind} small budget min > max`);
  if (budget.mediumMin > budget.mediumMax) push('error', block, `${span.kind} medium budget min > max`);
  if (budget.largeMin > budget.largeMax) push('error', block, `${span.kind} large budget min > max`);
  if (budget.hugeMax < 0) push('error', block, `${span.kind} huge budget is negative`);

  console.log(
    `block ${block.toString().padStart(3, ' ')} | ${span.kind.padEnd(12)} | ${template.padEnd(18)} | ` +
    `span ${span.startBlock}..${span.endBlock} | intensity ${span.intensity.toFixed(2)} | ` +
    `skyline S${budget.smallMin}-${budget.smallMax} M${budget.mediumMin}-${budget.mediumMax} ` +
    `L${budget.largeMin}-${budget.largeMax} H<=${budget.hugeMax}`,
  );
}

console.log('\nDistrict coverage:');
for (const [kind, count] of Object.entries(counts).sort()) {
  console.log(`  ${kind.padEnd(12)} ${count}`);
}

if (issues.length > 0) {
  console.log('\nIssues:');
  for (const issue of issues) {
    console.log(`${issue.level.toUpperCase()} block ${issue.block}: ${issue.msg}`);
  }
}

const errors = issues.filter((issue) => issue.level === 'error').length;
if (errors > 0) {
  console.error(`Rampage district check failed: ${errors} error(s), ${issues.length - errors} non-error issue(s)`);
  process.exit(1);
}

console.log(`\nRampage district check passed: blocks ${start}..${end}, seed=${seed}`);
