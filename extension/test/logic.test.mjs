// test/logic.test.mjs — browser-free test of the bridge's real logic.
// Imports the ACTUAL background.js with a mocked chrome.* API and drives the
// message handlers; tests router classification, queue cap + eviction,
// paywall redaction, and hub-client task-file format.
// Run: node extension/test/logic.test.mjs   (exit 0 = pass)

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------------------- chrome mock --
const store = {};
const listeners = {};
let notifyCount = 0;

global.chrome = {
  storage: {
    local: {
      async get(keys) {
        const out = {};
        for (const k of [].concat(keys || [])) if (k in store) out[k] = JSON.parse(JSON.stringify(store[k]));
        return out;
      },
      async set(obj) { Object.assign(store, JSON.parse(JSON.stringify(obj))); },
    },
  },
  runtime: {
    onMessage: { addListener: (fn) => { listeners.message = fn; } },
    onInstalled: { addListener: (fn) => { listeners.installed = fn; } },
    sendMessage: async () => {},
    getURL: (p) => 'chrome-extension://mock/' + p,
  },
  commands: { onCommand: { addListener: (fn) => { listeners.command = fn; } } },
  contextMenus: {
    onClicked: { addListener: (fn) => { listeners.menuClicked = fn; } },
    create: () => {},
  },
  notifications: { create: () => { notifyCount++; return 'nid'; } },
  tabs: {
    async query() { return [{ id: 1, url: 'https://example.com/page', title: 'Example' }]; },
    create: () => {},
    async captureVisibleTab() { return 'data:image/png;base64,AAAA'; },
  },
  scripting: {
    async executeScript() {
      return [{ result: { text: 'selected prose', url: 'https://example.com/page', title: 'Example' } }];
    },
  },
  action: { async openPopup() {} },
  offscreen: { Reason: { AUDIO: 'AUDIO' }, async createDocument() { throw new Error('no doc in test'); } },
};

const tick = () => new Promise((r) => setTimeout(r, 30));
const send = async (msg) => { listeners.message(msg, {}, () => {}); await tick(); };
const queue = () => store.queue || [];

// ------------------------------------------------------------------- tests --
let failures = 0;
function check(name, cond) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name);
  if (!cond) failures++;
}

// Import the real service worker with the mock in place.
await import(pathToFileURL(path.join(ROOT, 'background.js')).href);
const hub = await import(pathToFileURL(path.join(ROOT, 'lib', 'hub-client.js')).href);
const router = await import(pathToFileURL(path.join(ROOT, 'router.js')).href);

console.log('background.js loaded, listeners:', Object.keys(listeners).join(', '));
check('onMessage + onCommand + onInstalled + contextMenus registered',
  !!(listeners.message && listeners.command && listeners.installed && listeners.menuClicked));

await listeners.installed();
await tick();
check('onInstalled seeds default settings (repo + paywall hosts)',
  store.settings?.repo === 'kajica2/kajica2.github.io' && Array.isArray(store.settings?.paywallHosts));

console.log('\n1. capture → classify → queue (real SW handlers)');
await send({ type: 'queue:enqueue', capture: { url: 'https://arxiv.org/abs/2609.00001', title: 'Score-aligned demixing', text: '' } });
await send({ type: 'queue:enqueue', capture: { url: null, title: '', text: 'ii-V-I turnaround practice notes' } });
await send({ type: 'queue:enqueue', capture: { url: 'https://kajica2.github.io/internal/lexicon', title: 'Bob Mover lexicon', text: 'TOP-SECRET-CONTENT' } });
await send({ type: 'queue:enqueue', capture: { url: 'https://github.com/kajica2/harmonic-study-engine', title: 'HSE repo', text: '' } });
await send({ type: 'queue:enqueue', capture: { url: 'https://youtu.be/abc123', title: 'Trane solo', text: '' } });
await send({ type: 'queue:enqueue', capture: { url: null, title: 'voice memo', audio: 'data:audio/webm;base64,BBBB' } });

check('6 tasks queued', queue().length === 6);
check('arxiv → paper/summarize', queue()[0].kind === 'paper' && queue()[0].helper === 'summarize');
check('bare text → selection/kb-add', queue()[1].kind === 'selection' && queue()[1].helper === 'kb-add');
check('github → repo/route-link', queue()[3].kind === 'repo' && queue()[3].helper === 'route-link');
check('youtube → video/summarize', queue()[4].kind === 'video' && queue()[4].helper === 'summarize');
check('audio → voice/transcribe', queue()[5].kind === 'voice' && queue()[5].helper === 'transcribe');

console.log('\n2. paywall discipline (§22H)');
const red = queue()[2];
check('paywalled capture flagged redacted', red.redacted === true);
check('text stripped from payload', !JSON.stringify(red.payload).includes('TOP-SECRET-CONTENT'));
check('url/title metadata retained', red.payload.url.includes('internal/lexicon') && !!red.payload.title);
check('router.isPaywalled matches host list', router.isPaywalled('https://x/internal/a', ['internal']) && !router.isPaywalled('https://x/public', ['internal']));

console.log('\n3. queue cap + eviction (105 enqueues → 100, oldest gone)');
for (let i = 0; i < 99; i++) {
  await send({ type: 'queue:enqueue', capture: { url: `https://example.com/${i}`, title: `bulk ${i}`, text: '' } });
}
check('queue capped at 100', queue().length === 100);
check('oldest evicted (arxiv gone)', !queue().some((t) => (t.payload.url || '').includes('arxiv')));
check('newest kept (bulk 98 present)', queue().some((t) => (t.payload.url || '').endsWith('/98')));

console.log('\n4. hub-client task files (PR payload shape)');
const tf = hub.buildTaskFile(red);
check('YAML frontmatter present', tf.startsWith('---'));
check('id/kind/helper/priority fields', ['id:', 'kind:', 'helper:', 'priority:'].every((f) => tf.includes(f)));
check('metadata_only flag in frontmatter', tf.includes('metadata_only: true'));
check('no secret content in file', !tf.includes('TOP-SECRET-CONTENT'));
const normal = hub.buildTaskFile(queue().find((t) => t.helper === 'kb-add') || { id: 'x', kind: 'selection', helper: 'kb-add', priority: 5, created_at: 'now', payload: { text: 'hello world' } });
check('normal task carries text body', normal.includes('hello world'));
const bundle = JSON.parse(hub.exportLocalBundle(queue().slice(0, 3)));
check('export bundle: 3 tasks + file per task', bundle.tasks.length === 3 && bundle.tasks.every((t) => t.file.includes('---')));

console.log('\n5. context-menu capture path');
const before = queue().length;
listeners.menuClicked({ menuItemId: 'bridge-capture-selection', selectionText: 'coltrane changes', pageUrl: 'https://example.com/article' });
await tick();
check('menu capture enqueued (cap holds at 100, oldest evicted)', queue().length === before && queue().length === 100);
check('routes to kb-add', queue()[queue().length - 1].helper === 'kb-add');
check('selection text carried', queue()[queue().length - 1].payload.text === 'coltrane changes');

console.log(failures ? `\nFAILED: ${failures} check(s)` : '\nALL LOGIC TESTS PASS');
process.exit(failures ? 1 : 0);
