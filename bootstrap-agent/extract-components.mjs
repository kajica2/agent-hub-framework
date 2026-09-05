#!/usr/bin/env node
// bootstrap-agent/extract-components.mjs — scans each repo for extractable
// components (audio utilities, MXL parsers, design tokens, etc.).
//
// For Phase 1, this is a stub that classifies repos by name heuristics
// and tags them with potential component types. Phase 2 will shallow-clone
// each repo and grep for actual reusable code.
//
// Reads:  projects.json from walk-repos.mjs output
// Writes: components-extra.json — adds `components` field to each project

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const IN  = resolve(arg('--in',  join(ROOT, '_bootstrap', 'draft', 'projects.json')));
const OUT = resolve(arg('--out', join(ROOT, '_bootstrap', 'draft', 'projects.json')));

if (!existsSync(IN)) {
  console.error(`[extract] input not found: ${IN}`);
  console.error(`  Run walk-repos.mjs first.`);
  process.exit(1);
}

const projects = JSON.parse(readFileSync(IN, 'utf8'));

// Heuristics for component extraction
const COMPONENT_HINTS = [
  { name: 'audio-utils',        match: / ['audio, 'spectrum, 'fft, 'peak, 'tempo]/i,        category: 'audio' },
  { name: 'mxl-parser',         match: / ['mxl, 'music21, 'transpose, 'parser]/i,         category: 'music' },
  { name: 'pdf-ingest',         match: / ['pdf, 'extract, 'ingest]/i,                       category: 'data' },
  { name: 'design-tokens',      match: / ['tokens, 'palette, 'colors, 'typography]/i,     category: 'ui' },
  { name: 'motion-spec',        match: / ['motion, 'easing, 'transition, 'animation]/i,   category: 'ui' },
  { name: 'grader-ui',          match: / ['card, 'panel, 'overlay, 'badge]/i,               category: 'ui' },
];

for (const p of projects) {
  const text = `${p.name} ${p.description}`.toLowerCase();
  const matches = [];
  for (const hint of COMPONENT_HINTS) {
    const re = new RegExp(hint.match.source, 'i');
    if (re.test(text)) {
      matches.push(hint.name);
    }
  }
  p.components = {
    from_framework: matches.filter(m => m === 'design-tokens' || m === 'motion-spec' || m === 'card-ui'),
    from_shared: matches.filter(m => !['design-tokens', 'motion-spec', 'card-ui'].includes(m)),
  };
}

writeFileSync(OUT, JSON.stringify(projects, null, 2));
console.log(`[extract] tagged ${projects.length} projects with component hints`);
for (const hint of COMPONENT_HINTS) {
  const count = projects.filter(p => {
    const all = [...(p.components?.from_framework || []), ...(p.components?.from_shared || [])];
    return all.includes(hint.name);
  }).length;
  console.log(`  ${hint.name}: ${count} candidates`);
}
console.log(`[extract] wrote ${OUT}`);
