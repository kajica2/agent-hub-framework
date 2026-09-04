#!/usr/bin/env node
// loop/supervisor.mjs — long-horizon self-growing loop orchestrator
//
// Reads agents.json, runs each agent in priority order, checks termination criteria.
// State persists in loop/state.json (read by next run).
// Growth reports appended to loop/growth-reports/YYYY-MM-DD.md.
//
// Usage:
//   node loop/supervisor.mjs                # run one full rotation
//   node loop/supervisor.mjs --dry-run      # plan only, don't run anything
//   node loop/supervisor.mjs --agent NAME   # run a specific agent only
//   node loop/supervisor.mjs --reset        # reset state (debug only)

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const DRY_RUN = process.argv.includes('--dry-run');
const RESET = process.argv.includes('--reset');
const SINGLE_AGENT = arg('--agent', null);

const STATE_PATH = join(ROOT, 'loop', 'state.json');
const GROWTH_DIR = join(ROOT, 'loop', 'growth-reports');
const RUNS_PATH = join(ROOT, 'loop', 'agent-runs.jsonl');
const LOCK_PATH = join(ROOT, 'loop', '.lock');

mkdirSync(GROWTH_DIR, { recursive: true });

// --- State ---
function loadState() {
  if (!existsSync(STATE_PATH)) {
    return {
      rotation_index: 0,
      last_rotation_at: null,
      last_growth_check: null,
      consecutive_quiet_rotations: 0,
      agent_history: {},   // { name: { last_run, status, last_error } }
      growth_signals: { kb_count: 0, crosslinks: 0, page_completeness: 0 },
      loop_state: 'active',
      next_sleep_until: null,
    };
  }
  return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
}

function saveState(s) { writeFileSync(STATE_PATH, JSON.stringify(s, null, 2)); }

function logRun(entry) {
  appendFileSync(RUNS_PATH, JSON.stringify({ ...entry, ts: new Date().toISOString() }) + '\n');
}

// --- Agent registry (priority + depends_on) ---
const AGENTS = [
  { name: 'thumb-collector',   priority: 4, depends_on: [],                    cmd: ['node', 'scripts/capture-screenshots.mjs', '--projects', 'examples/projects.example.json', '--out', 'dist/public/assets/thumbs'] },
  { name: 'channel-renderer',  priority: 5, depends_on: ['thumb-collector'],   cmd: ['node', 'scripts/build.mjs', '--source', 'examples', '--out', 'dist'] },
  { name: 'daily-pipeline',    priority: 2, depends_on: [],                    cmd: null, /* calls HF, stubbed */ },
  { name: 'kb-indexer',        priority: 3, depends_on: [],                    cmd: null, /* stubbed for Phase 1 */ },
  { name: 'taxonomy-keeper',   priority: 6, depends_on: [],                    cmd: null, /* stubbed for Phase 1 */ },
];

// --- Run a single agent ---
function runAgent(agent, state) {
  if (DRY_RUN) {
    console.log(`  [dry-run] would run ${agent.name}`);
    return { status: 'dry-run' };
  }
  if (!agent.cmd) {
    console.log(`  ⊘ ${agent.name}: stub (no cmd)`);
    state.agent_history[agent.name] = { last_run: new Date().toISOString(), status: 'stub' };
    return { status: 'stub' };
  }
  console.log(`  ▶ ${agent.name}...`);
  const t0 = Date.now();
  try {
    const out = execSync(agent.cmd.join(' '), { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`    ✓ ${agent.name} done in ${dur}s`);
    state.agent_history[agent.name] = { last_run: new Date().toISOString(), status: 'success', duration_s: Number(dur) };
    return { status: 'success', duration_s: Number(dur), output: out.slice(-200) };
  } catch (e) {
    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`    ✗ ${agent.name} failed in ${dur}s: ${e.message?.slice(0, 200)}`);
    state.agent_history[agent.name] = { last_run: new Date().toISOString(), status: 'failed', duration_s: Number(dur), error: String(e.message || e).slice(0, 500) };
    return { status: 'failed', error: String(e.message || e) };
  }
}

// --- Growth signals ---
function measureGrowth(state) {
  // For Phase 1: simple proxies from filesystem
  let kb_count = 0;
  let crosslinks = 0;
  let page_completeness = 0;
  try {
    const projects = JSON.parse(readFileSync(join(ROOT, 'examples/projects.example.json'), 'utf8'));
    kb_count = projects.length;
    for (const p of projects) {
      crosslinks += (p.calls_into?.length || 0) + (p.components?.from_framework?.length || 0) + (p.components?.from_shared?.length || 0);
    }
  } catch {}
  try {
    const agents = JSON.parse(readFileSync(join(ROOT, 'examples/agents.example.json'), 'utf8'));
    for (const a of agents) crosslinks += (a.calls_into?.length || 0);
  } catch {}
  // Pages: count actual built html files
  try {
    const pubDir = join(ROOT, 'dist', 'public');
    if (existsSync(pubDir)) {
      const html = execSync(`find ${pubDir} -name '*.html' | wc -l`, { encoding: 'utf8' }).trim();
      page_completeness = Number(html);
    }
  } catch {}

  return { kb_count, crosslinks, page_completeness };
}

// --- Termination check ---
function checkTermination(state, growth) {
  const reasons = [];
  // 1. KB growth < 1% over 7 days — proxy: same as last check
  const lastGrowth = state.growth_signals || {};
  const kbDelta = growth.kb_count - (lastGrowth.kb_count || 0);
  const xlinkDelta = growth.crosslinks - (lastGrowth.crosslinks || 0);
  if (kbDelta === 0 && xlinkDelta === 0 && (state.last_rotation_at !== null)) {
    reasons.push(`no growth (kb_delta=${kbDelta}, xlink_delta=${xlinkDelta})`);
  }
  // 2. All agents successful
  const failedAgents = Object.entries(state.agent_history).filter(([_, h]) => h.status === 'failed');
  if (failedAgents.length) {
    reasons.push(`${failedAgents.length} agent(s) failed: ${failedAgents.map(([n]) => n).join(', ')}`);
  }
  // 3. No pending items — proxy: queue length
  // (would be tracked by intake endpoint, stubbed for Phase 1)
  return reasons;
}

// --- Growth report ---
function writeGrowthReport(state, growth, agentsRun, terminationReasons) {
  const today = new Date().toISOString().split('T')[0];
  const report = `# Growth Report — ${today}

**Rotation #${state.rotation_index}**
**Loop state:** ${state.loop_state}
**Agents run:** ${agentsRun.map(a => `${a.name} (${a.status})`).join(', ') || '(none)'}

## Signals

| Signal | Value | Delta |
|---|---|---|
| KB count (projects) | ${growth.kb_count} | ${growth.kb_count - (state.growth_signals.kb_count || 0)} |
| Cross-links | ${growth.crosslinks} | ${growth.crosslinks - (state.growth_signals.crosslinks || 0)} |
| Pages built | ${growth.page_completeness} | — |

## Termination check
${terminationReasons.length === 0 ? '✓ All quiet — entering cooling-off for 24h' : '⚠ Still growing:\n' + terminationReasons.map(r => `  - ${r}`).join('\n')}

## Agent health
${Object.entries(state.agent_history).map(([name, h]) => `- ${name}: ${h.status} (last: ${h.last_run || 'never'})`).join('\n') || '  (no agents run yet)'}

---
`;
  appendFileSync(join(GROWTH_DIR, `${today}.md`), report);
  console.log(`  📝 Growth report appended: loop/growth-reports/${today}.md`);
}

// --- Main ---
async function main() {
  if (RESET && existsSync(STATE_PATH)) {
    writeFileSync(STATE_PATH, '{}');
    console.log('State reset.');
  }
  // Lock
  if (existsSync(LOCK_PATH)) {
    const age = Date.now() - Number(readFileSync(LOCK_PATH, 'utf8'));
    if (age < 5 * 60 * 1000) {
      console.error(`Another supervisor is running (lock age ${Math.round(age/1000)}s). Exiting.`);
      process.exit(1);
    } else {
      console.warn(`Stale lock (${Math.round(age/1000)}s old), removing.`);
    }
  }
  writeFileSync(LOCK_PATH, String(Date.now()));

  let state = loadState();

  // Sleep check
  if (state.next_sleep_until && Date.now() < new Date(state.next_sleep_until).getTime()) {
    console.log(`Loop is sleeping until ${state.next_sleep_until}. Exiting.`);
    return;
  }

  // Run agents
  const agentsToRun = SINGLE_AGENT
    ? AGENTS.filter(a => a.name === SINGLE_AGENT)
    : [...AGENTS].sort((a, b) => a.priority - b.priority);

  const completedNames = new Set();
  const agentsRun = [];
  for (const agent of agentsToRun) {
    // Skip if dependencies haven't completed
    if (agent.depends_on?.length) {
      const allDepsMet = agent.depends_on.every(d => completedNames.has(d));
      if (!allDepsMet) {
        console.log(`  ⊘ ${agent.name}: deferred (deps: ${agent.depends_on.join(', ')})`);
        continue;
      }
    }
    const result = runAgent(agent, state);
    agentsRun.push({ name: agent.name, ...result });
    completedNames.add(agent.name);
    saveState(state);
    logRun({ agent: agent.name, ...result, rotation: state.rotation_index });
  }

  // Measure growth
  const growth = measureGrowth(state);

  // Termination
  const terminationReasons = checkTermination(state, growth);

  // Update loop state
  state.rotation_index += 1;
  state.last_rotation_at = new Date().toISOString();
  state.growth_signals = growth;
  if (terminationReasons.length === 0) {
    state.consecutive_quiet_rotations = (state.consecutive_quiet_rotations || 0) + 1;
    state.next_sleep_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    state.loop_state = 'cooling-off';
  } else {
    state.consecutive_quiet_rotations = 0;
    state.loop_state = 'active';
    state.next_sleep_until = null;
  }
  saveState(state);

  // Write growth report
  writeGrowthReport(state, growth, agentsRun, terminationReasons);

  // Release lock
  writeFileSync(LOCK_PATH, '');

  console.log(`\n✓ Rotation ${state.rotation_index} complete. Loop state: ${state.loop_state}.`);
  if (state.loop_state === 'cooling-off') {
    console.log(`  Next active rotation: ${state.next_sleep_until}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
