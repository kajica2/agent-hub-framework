#!/usr/bin/env node
// bootstrap-agent/walk-repos.mjs — walks kajica2's GitHub repos, builds
// initial projects.json + tools.json + inventory-draft.md.
//
// Reads:  GitHub API (gh CLI auth) for repo metadata
//         Optional: shallow clone per repo for component extraction
// Writes: projects.json (entry per repo, classified into umbrella)
//         tools.json (extractable components per repo)
//         inventory-draft.md (human-readable, ready for Kai to curate)
//
// Run modes:
//   --dry-run    : write to _bootstrap/draft/, don't commit
//   --commit     : open a PR against kajica2.github.io with the draft
//   --limit N    : cap repo count (default 200)
//   --owner X    : GitHub owner (default kajica2)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
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
const COMMIT  = process.argv.includes('--commit');
const LIMIT   = Number(arg('--limit', '200'));
const OWNER   = arg('--owner', 'kajica2');
const OUT     = resolve(arg('--out', join(ROOT, '_bootstrap')));

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, 'draft'), { recursive: true });

// --- Classification heuristics ---
// Each repo gets classified into an umbrella based on:
//   (1) declared language (Python → likely audio / ml)
//   (2) repo name keywords
//   (3) primary topics
const UMBRELLA_KEYWORDS = {
  music:      ['jazz', 'music', 'song', 'composer', 'mxl', 'midi', 'transcription', 'chord', 'lexicon', 'ireal', 'sheet-music', 'sax', 'horn', 'pract'],
  audio:      ['audio', 'spectrum', 'fft', 'demucs', 'pitch', 'freq', 'sound', 'acoustic', 'mic', 'gradio'],
  video:      ['video', 'movie', 'cinema', 'animation', 'shader', 'glsl', 'tube', 'visualizer', 'orbit', 'art', 'generative', 'evolving'],
  programming:['engine', 'framework', 'pipeline', 'tool', 'toolbox', 'orchestrator', 'system', 'studio', 'app', 'twin', 'orchestration', 'cli', 'minimax'],
  research:   ['research', 'agent', 'cognitive', 'study', 'paper', 'arxiv'],
  other:      [],
};

const PAYWALL_KEYWORDS = {
  'internal-paywalled':   ['bob-mover', 'bobmover', 'jazzability', 'serious-fun', 'seriousfun'],
  'licensed-restricted':  ['omnibook', 'wjazd', 'jazzomat'],
  'private':              [],  // explicit only
};

const STATUS_KEYWORDS = {
  archived: ['archive', 'archived', 'old', 'deprecated'],
  stale:    ['wip-', 'experimental', 'draft'],
  wip:      ['wip', 'beta', 'alpha', 'draft', 'experimental', 'prototype'],
};

function classifyUmbrella(name, description, language) {
  const text = `${name} ${description || ''}`.toLowerCase();
  for (const [umbrella, kws] of Object.entries(UMBRELLA_KEYWORDS)) {
    if (kws.some(kw => text.includes(kw))) return umbrella;
  }
  if (language === 'Python') return 'audio';  // default for Python ML
  return 'other';
}

function classifyPaywall(name) {
  const lower = name.toLowerCase();
  for (const [kind, kws] of Object.entries(PAYWALL_KEYWORDS)) {
    if (kws.some(kw => lower.includes(kw))) return kind;
  }
  return null;
}

function classifyStatus(name) {
  const lower = name.toLowerCase();
  for (const [status, kws] of Object.entries(STATUS_KEYWORDS)) {
    if (kws.some(kw => lower.startsWith(kw) || lower.includes('-' + kw))) return status;
  }
  return 'active';
}

function inferCapabilities(umbrella, name, description) {
  // Map umbrella → likely capabilities. Tighter than the full taxonomy;
  // these are reasonable defaults for kajica2's known stack.
  const map = {
    music:     ['transpose', 'produce-mxl', 'produce-midi'],
    audio:     ['pitch-detect', 'analyze-spectrum', 'produce-report'],
    video:     ['produce-video', 'visualize-3d'],
    programming:['deploy-vercel', 'publish-channel'],
    research:  ['publish-channel', 'produce-report'],
    other:     ['publish-channel'],
  };
  return map[umbrella] || ['publish-channel'];
}

// --- Fetch repos via gh CLI ---
function fetchRepos() {
  console.log(`[bootstrap] fetching repos for ${OWNER} (limit ${LIMIT})...`);
  const out = execSync(
    `gh repo list ${OWNER} --limit ${LIMIT} --json name,description,isPrivate,isFork,url,pushedAt,primaryLanguage,visibility`,
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
  );
  return JSON.parse(out);
}

// --- Build projects.json entries from repo metadata ---
function buildProjects(repos) {
  return repos
    .filter(r => !r.isFork)  // skip forks by default
    .map(r => {
      const umbrella = classifyUmbrella(r.name, r.description, r.primaryLanguage?.name);
      const paywall = classifyPaywall(r.name);
      const status = classifyStatus(r.name);
      const licenseKind = paywall || (r.isPrivate ? 'private' : 'public');
      return {
        name: r.name,
        display_name: r.name,
        umbrella,
        description: (r.description || `${r.name} (no description)`).slice(0, 240),
        url: null,  // not known — to be filled in by kajica2's curation
        repo: r.url,
        visibility: r.isPrivate ? 'private' : 'public',
        status,
        entity: 'research',
        availability: licenseKind === 'public' ? 'open' : 'consulting',
        material_license: {
          kind: licenseKind,
          source: licenseKind === 'public' ? 'self-authored' : r.name,
          notes: '',
        },
        capabilities: inferCapabilities(umbrella, r.name, r.description),
        inputs: [],
        outputs: [],
      };
    });
}

// --- Build tools.json (lighter-weight component manifest) ---
function buildTools(projects) {
  return projects.map(p => ({
    repo: p.repo,
    name: p.name,
    umbrella: p.umbrella,
    component_hint: p.capabilities[0] || 'publish-channel',
    extractable: !p.visibility.includes('private'),
  }));
}

// --- Build inventory-draft.md (human-readable) ---
function buildInventory(repos, projects, tools) {
  const total = repos.length;
  const publicCount = projects.filter(p => p.material_license.kind === 'public').length;
  const paywalledCount = projects.filter(p => p.material_license.kind === 'internal-paywalled').length;
  const licensedCount = projects.filter(p => p.material_license.kind === 'licensed-restricted').length;
  const byUmbrella = {};
  for (const p of projects) {
    byUmbrella[p.umbrella] = (byUmbrella[p.umbrella] || 0) + 1;
  }
  const byStatus = {};
  for (const p of projects) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  }

  let md = `# Bootstrap Inventory — ${OWNER} · ${new Date().toISOString().split('T')[0]}\n\n`;
  md += `## Counts\n\n`;
  md += `- Total repos scanned: **${total}**\n`;
  md += `- Public (will appear on hub): **${publicCount}**\n`;
  md += `- Internal-paywalled (filtered to /internal/): **${paywalledCount}**\n`;
  md += `- Licensed-restricted: **${licensedCount}**\n`;
  md += `- Forks skipped: **${repos.filter(r => r.isFork).length}**\n\n`;
  md += `## By umbrella\n\n`;
  for (const [u, n] of Object.entries(byUmbrella).sort((a, b) => b[1] - a[1])) {
    md += `- **${u}**: ${n}\n`;
  }
  md += `\n## By status\n\n`;
  for (const [s, n] of Object.entries(byStatus)) {
    md += `- **${s}**: ${n}\n`;
  }
  md += `\n## Action items for Kai\n\n`;
  md += `1. **Curate the umbrella classifications** — auto-classification uses\n   keyword heuristics; review the assignments and correct any miscategorizations.\n`;
  md += `2. **Fill in canonical deployment URLs** — every public project should\n   have a \`url\` field pointing to its live deployment (Vercel, HF Space,\n   etc.). Bootstrap leaves it null; Kai adds it.\n`;
  md += `3. **Verify paywall assignments** — bootstrap flags repos whose names\n   contain \`bob-mover\`, \`jazzability\`, \`omnibook\`, etc. as paywalled.\n   Review the auto-flagged list and adjust if any are mis-flagged.\n`;
  md += `4. **Set entity per project** — every project defaults to \`research\`.\n   Move any to \`eye-kairi\` or \`joint\` if appropriate.\n`;
  md += `5. **Pick the screenshots** — bootstrap generates URLs only, not images.\n     Run \`node scripts/capture-screenshots.mjs\` against the curated\n   \`projects.json\` to fill in \`assets/thumbs/\`.\n\n`;
  md += `## Repos found (table)\n\n`;
  md += `| Repo | Umbrella | Status | License | Visibility |\n`;
  md += `|---|---|---|---|---|\n`;
  for (const p of projects) {
    md += `| ${p.name} | ${p.umbrella} | ${p.status} | ${p.material_license.kind} | ${p.visibility} |\n`;
  }
  md += `\n## Repos skipped (forks)\n\n`;
  const forks = repos.filter(r => r.isFork);
  if (forks.length === 0) {
    md += `_(none)_\n`;
  } else {
    for (const f of forks) {
      md += `- ${f.name}\n`;
    }
  }
  return md;
}

// --- Main ---
console.log(`[bootstrap] dry-run=${DRY_RUN} commit=${COMMIT}`);
const repos = fetchRepos();
console.log(`[bootstrap] got ${repos.length} repos`);

const projects = buildProjects(repos);
const tools = buildTools(projects);
const inventory = buildInventory(repos, projects, tools);

const outPath = DRY_RUN ? join(OUT, 'draft') : OUT;
mkdirSync(outPath, { recursive: true });

writeFileSync(join(outPath, 'projects.json'), JSON.stringify(projects, null, 2));
writeFileSync(join(outPath, 'tools.json'), JSON.stringify(tools, null, 2));
writeFileSync(join(outPath, 'inventory-draft.md'), inventory);

console.log(`[bootstrap] wrote:`);
console.log(`  ${join(outPath, 'projects.json')}`);
console.log(`  ${join(outPath, 'tools.json')}`);
console.log(`  ${join(outPath, 'inventory-draft.md')}`);

if (COMMIT) {
  console.log(`[bootstrap] COMMIT mode — would open PR against kajica2/${OWNER}.github.io`);
  console.log(`  (PR creation not yet implemented in Phase 1 — manually copy draft files for now)`);
}

console.log(`[bootstrap] done.`);
