// background.js — MV3 service worker. Shortcuts, capture, classify, queue.
// Phase 1 contract: capture → classify → queue locally; the popup ships the
// queue to the hub as a PR (Settings token) or a downloaded JSON bundle.

import { classify, isPaywalled, redactPayload } from './router.js';

const HUB_URL = 'https://kajica2.github.io/';
const MAX_QUEUE = 100;          // plan §22H: cap at 100, oldest evicted
const VOICE_WINDOW_MS = 30000;  // push-once, auto-stop at 30s
const MAX_HTML = 200000;        // page-capture HTML cap
const MAX_TEXT = 100000;

const DEFAULT_SETTINGS = {
  repo: 'kajica2/kajica2.github.io',
  ghToken: '',
  paywallHosts: ['kajica2.github.io/internal', 'bobmover'],
};

// ---------------------------------------------------------------- storage --

async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

async function getQueue() {
  const { queue } = await chrome.storage.local.get('queue');
  return Array.isArray(queue) ? queue : [];
}

async function saveQueue(q) {
  if (q.length > MAX_QUEUE) q = q.slice(q.length - MAX_QUEUE); // evict oldest
  await chrome.storage.local.set({ queue: q });
  return q;
}

// ------------------------------------------------------------------ queue --

async function enqueue(rawCapture, { urgent = false } = {}) {
  const s = await getSettings();
  const capture = { ...rawCapture, ts: rawCapture.ts || new Date().toISOString() };

  let payload = capture;
  let redacted = false;
  if (isPaywalled(capture.url, s.paywallHosts)) {
    payload = redactPayload(capture);
    redacted = true;
  }

  const { kind, helper, priority } = classify(capture);
  const task = {
    id: crypto.randomUUID(),
    kind, helper,
    priority: urgent ? 1 : priority,
    redacted,
    status: 'queued',
    created_at: capture.ts,
    payload,
  };
  await saveQueue([...(await getQueue()), task]);
  notify(`Captured → ${helper}`, `${kind}${redacted ? ' (metadata only — paywalled source)' : ''} queued. Alt+Q to review.`);
  return task;
}

function notify(title, message) {
  chrome.notifications.create({
    type: 'basic', iconUrl: 'icons/icon-128.png', title, message,
  }).catch?.(() => {});
  // chrome.notifications.create returns void in some versions; guard anyway.
}

// ---------------------------------------------------------------- capture --

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('no active tab');
  return tab;
}

async function grabSelection(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({ text: window.getSelection()?.toString() || '', url: location.href, title: document.title }),
    });
    return result;
  } catch {
    return { text: '', url: '', title: '' };
  }
}

async function captureLink() {
  const tab = await activeTab();
  const sel = await grabSelection(tab.id);
  return enqueue({ mode: 'link', url: tab.url, title: tab.title, text: sel.text.slice(0, MAX_TEXT) });
}

async function captureSelection() {
  const tab = await activeTab();
  const sel = await grabSelection(tab.id);
  if (!sel.text) { notify('Nothing selected', 'Select text on the page first, then Alt+S.'); return null; }
  return enqueue({ mode: 'selection', url: tab.url, title: tab.title, text: sel.text.slice(0, MAX_TEXT) });
}

async function capturePage() {
  const tab = await activeTab();
  let html = '';
  try {
    [{ result: html }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML,
    });
  } catch { /* chrome:// and restricted pages: screenshot still works */ }
  let screenshot = null;
  try { screenshot = await chrome.tabs.captureVisibleTab(null, { format: 'png' }); } catch {}
  return enqueue({ mode: 'page', url: tab.url, title: tab.title, html: html.slice(0, MAX_HTML), screenshot });
}

// ------------------------------------------------------------------ voice --

let recording = false;

async function ensureOffscreen() {
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason?.AUDIO || 'AUDIO'],
      justification: 'Voice memo capture (MediaRecorder needs a document; SW has none).',
    });
  } catch { /* already open */ }
}

async function toggleVoice() {
  if (recording) { stopVoice(); return; }
  await ensureOffscreen();
  recording = true;
  chrome.runtime.sendMessage({ type: 'voice:start' }).catch(() => {});
  setTimeout(() => { if (recording) stopVoice(); }, VOICE_WINDOW_MS + 2000); // safety
  notify('Recording…', 'Speak now, or press Alt+V to stop (auto-stops at 30s).');
}

async function stopVoice() {
  if (!recording) return;
  recording = false;
  chrome.runtime.sendMessage({ type: 'voice:stop' }).catch(() => {});
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'voice:result') {
      recording = false;
      if (msg.dataUrl) await enqueue({ mode: 'voice', audio: msg.dataUrl, url: null, title: 'voice memo' });
      else notify('Voice memo empty', 'Nothing was recorded.');
      sendResponse({ ok: true });
    }
    if (msg?.type === 'queue:enqueue') {           // helper spawner path
      const task = await enqueue(msg.capture || {});
      sendResponse({ ok: true, id: task?.id });
    }
  })();
  return true; // async response
});

// -------------------------------------------------------------- shortcuts --

chrome.commands.onCommand.addListener(async (command) => {
  try {
    switch (command) {
      case 'capture-link':      await captureLink(); break;
      case 'capture-selection': await captureSelection(); break;
      case 'capture-page':      await capturePage(); break;
      case 'capture-voice':     await toggleVoice(); break;
      case 'open-hub':          chrome.tabs.create({ url: HUB_URL }); break;
      case 'spawn-helper':
      case 'open-queue':
        try { await chrome.action.openPopup(); }
        catch { notify('Open the queue', 'Click the Bridge toolbar icon — popup must come from a user gesture.'); }
        break;
    }
  } catch (e) {
    notify('Capture failed', String(e?.message || e));
  }
});

// ---------------------------------------------------------- context menus --

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('settings').then(({ settings }) => {
    if (!settings) chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  });
  chrome.contextMenus.create({ id: 'bridge-capture-link', title: 'Bridge: capture this link', contexts: ['link', 'page'] });
  chrome.contextMenus.create({ id: 'bridge-capture-selection', title: 'Bridge: capture selection', contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'bridge-capture-page', title: 'Bridge: capture full page', contexts: ['page'] });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'bridge-capture-link')
    await enqueue({ mode: 'link', url: info.srcUrl || info.pageUrl, title: info.linkText || '', text: '' });
  if (info.menuItemId === 'bridge-capture-selection')
    await enqueue({ mode: 'selection', url: info.pageUrl, title: '', text: info.selectionText || '' });
  if (info.menuItemId === 'bridge-capture-page')
    await capturePage();
});
