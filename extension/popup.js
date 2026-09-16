// popup.js — queue view, helper spawner, settings. Talks to storage directly;
// ships the queue via hub-client (PR if token set, JSON download otherwise).

import { HELPERS } from './router.js';
import { openPr, exportLocalBundle } from './lib/hub-client.js';

const $ = (s) => document.querySelector(s);
const queueEl = $('#queue');

// ------------------------------------------------------------------- tabs --
document.querySelectorAll('nav button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('nav button').forEach((x) => x.classList.toggle('active', x === b));
    document.querySelectorAll('main section').forEach((s) => { s.hidden = s.id !== `tab-${b.dataset.tab}`; });
    if (b.dataset.tab === 'queue') render();
  });
});

// ------------------------------------------------------------------ queue --
async function getQueue() {
  const { queue } = await chrome.storage.local.get('queue');
  return Array.isArray(queue) ? queue : [];
}
async function setQueue(q) { await chrome.storage.local.set({ queue: q }); }

function esc(s) { const d = document.createElement('span'); d.textContent = String(s ?? ''); return d.innerHTML; }

async function render() {
  const q = await getQueue();
  const pending = q.filter((t) => t.status === 'queued');
  $('#queue-count').textContent = `${pending.length} pending · ${q.length} total`;
  queueEl.innerHTML = '';
  if (!q.length) { queueEl.innerHTML = '<div class="empty">Nothing captured yet. Alt+L / Alt+S / Alt+P / Alt+V.</div>'; return; }
  for (const t of [...q].reverse()) {
    const row = document.createElement('div');
    row.className = `task ${t.status === 'shipped' ? 'shipped' : ''}`;
    row.innerHTML = `
      <span class="kind">${esc(t.kind)}</span>
      <span class="helper">→ ${esc(t.helper)}</span>
      <span class="title" title="${esc(t.payload?.url || t.payload?.text || '')}">${esc(t.payload?.title || (t.payload?.text || '').slice(0, 40) || (t.payload?.url || '').slice(0, 40) || t.kind)}</span>
      ${t.redacted ? '<span class="badge">redacted</span>' : ''}
      <span class="when">${new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      <button class="del" title="remove">✕</button>`;
    row.querySelector('.del').addEventListener('click', async () => {
      setQueue((await getQueue()).filter((x) => x.id !== t.id)).then(render);
    });
    queueEl.appendChild(row);
  }
}

$('#ship').addEventListener('click', async () => {
  const st = $('#ship-status');
  const q = await getQueue();
  const pending = q.filter((t) => t.status === 'queued');
  if (!pending.length) { st.textContent = 'Queue is empty.'; st.className = 'status'; return; }
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings?.ghToken) { st.textContent = 'No PAT in Settings — using Export JSON instead.'; st.className = 'status err'; doExport(pending); return; }
  st.textContent = 'Opening PR…'; st.className = 'status';
  try {
    const { prUrl } = await openPr({ token: settings.ghToken, repo: settings.repo, tasks: pending });
    const shipped = new Set(pending.map((t) => t.id));
    setQueue(q.map((t) => shipped.has(t.id) ? { ...t, status: 'shipped', prUrl } : t)).then(render);
    st.textContent = ''; st.className = 'status';
    chrome.tabs.create({ url: prUrl });
  } catch (e) {
    st.textContent = `PR failed: ${String(e.message || e).slice(0, 140)}`; st.className = 'status err';
  }
});

function doExport(tasks) {
  const blob = new Blob([exportLocalBundle(tasks)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bridge-tasks-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
$('#export').addEventListener('click', async () => {
  const q = (await getQueue()).filter((t) => t.status === 'queued');
  if (!q.length) { $('#ship-status').textContent = 'Nothing pending.'; return; }
  doExport(q);
});
$('#clear-shipped').addEventListener('click', async () => {
  setQueue((await getQueue()).filter((t) => t.status !== 'shipped')).then(render);
});

// ---------------------------------------------------------------- helpers --
const helpersEl = $('#helpers');
for (const [name, h] of Object.entries(HELPERS)) {
  const card = document.createElement('div');
  card.className = 'helper-card';
  card.innerHTML = `<h3>${esc(name)}</h3><p>${esc(h.purpose)} <span class="badge">agent: ${esc(h.agent)}</span></p>
    <textarea placeholder="payload (text / url)"></textarea>
    <button>Run</button>`;
  card.querySelector('button').addEventListener('click', async () => {
    const text = card.querySelector('textarea').value.trim();
    if (!text) return;
    const capture = /^https?:\/\//.test(text) && !text.includes(' ')
      ? { url: text, title: text, text: '' }
      : { url: null, title: '', text };
    capture.helper_override = name;
    chrome.runtime.sendMessage({ type: 'queue:enqueue', capture });
    card.querySelector('button').textContent = 'Queued ✓';
    setTimeout(() => { card.querySelector('button').textContent = 'Run'; }, 1200);
  });
  helpersEl.appendChild(card);
}

// --------------------------------------------------------------- settings --
const DEFAULTS = { repo: 'kajica2/kajica2.github.io', ghToken: '', paywallHosts: [] };
(async () => {
  const { settings } = await chrome.storage.local.get('settings');
  const s = { ...DEFAULTS, ...(settings || {}) };
  $('#s-repo').value = s.repo;
  $('#s-token').value = s.ghToken;
  $('#s-paywall').value = (s.paywallHosts || []).join('\n');
})();
$('#save').addEventListener('click', async () => {
  const { settings } = await chrome.storage.local.get('settings');
  await chrome.storage.local.set({ settings: {
    ...(settings || {}),
    repo: $('#s-repo').value.trim() || DEFAULTS.repo,
    ghToken: $('#s-token').value.trim(),
    paywallHosts: $('#s-paywall').value.split('\n').map((x) => x.trim()).filter(Boolean),
  }});
  $('#save-status').textContent = 'Saved.';
  setTimeout(() => { $('#save-status').textContent = ''; }, 1500);
});

render();
