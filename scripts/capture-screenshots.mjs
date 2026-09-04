#!/usr/bin/env node
// capture-screenshots.mjs — puppeteer screenshot pass for all live projects
//
// Usage: node scripts/capture-screenshots.mjs --projects path/to/projects.json --out path/to/thumbs/

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

const PROJECTS = resolve(arg('--projects', join(ROOT, 'examples', 'projects.example.json')));
const OUT      = resolve(arg('--out',      join(ROOT, 'dist', 'public', 'assets', 'thumbs')));

async function main() {
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer')).default;
  } catch (e) {
    console.error('puppeteer not installed. Run: npm install puppeteer --no-save');
    process.exit(2);
  }

  const projects = JSON.parse(readFileSync(PROJECTS, 'utf8'));
  mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = { captured: [], failed: [], skipped: [] };
  for (const p of projects) {
    if (!p.url) {
      results.skipped.push({ name: p.name, reason: 'no url (repo-only)' });
      continue;
    }
    const outPath = join(OUT, `${p.name}.png`);
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
      await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: outPath, fullPage: false });
      await page.close();
      results.captured.push({ name: p.name, url: p.url, file: `${p.name}.png` });
      console.log(`✓ ${p.name} -> ${p.name}.png`);
    } catch (e) {
      results.failed.push({ name: p.name, url: p.url, error: String(e).slice(0, 200) });
      console.error(`✗ ${p.name}: ${String(e).slice(0, 80)}`);
    }
  }

  await browser.close();
  writeFileSync(join(OUT, '_manifest.json'), JSON.stringify(results, null, 2));
  console.log(`\nCaptured ${results.captured.length} / Failed ${results.failed.length} / Skipped ${results.skipped.length}`);
  if (results.failed.length) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
