// router.js — classification + helper registry.
// Phase 1 verbs surface here; the hub's loop does the actual work.
// Helpers map 1:1 to plan §22D. No free-text commands: a capture must
// classify to a registered helper or it lands as `route-link` (the fallback).

export const HELPERS = {
  summarize:     { purpose: 'text/URL → bullet-point summary + key entities',        agent: 'kb-indexer',      inputs: ['text', 'url'] },
  transcribe:    { purpose: 'audio → text (Whisper via HF inference; Phase 2 wire)', agent: 'daily-pipeline',  inputs: ['audio'] },
  vectorize:     { purpose: 'image → animated-ready SVG',                            agent: 'image-svg',       inputs: ['image'] },
  'archive-page':{ purpose: 'URL → HTML + screenshot saved to hub captures channel', agent: 'hub-bridge',      inputs: ['page'] },
  'route-link':  { purpose: 'URL → classified + routed to the right helper',         agent: 'link-router',     inputs: ['link'] },
  'kb-add':      { purpose: 'text → KB index entry with extracted entities',         agent: 'kb-indexer',      inputs: ['text'] },
  'daily-now':   { purpose: "generate today's report on demand (not waiting for cron)", agent: 'daily-pipeline', inputs: [] },
};

// Classify a capture into { kind, helper, priority }.
// Captures carry an explicit `mode` (link/selection/page/voice) set by the
// capture function; shape-based inference is the fallback (helper spawner).
// priority: 5 default, 1 urgent (Alt+Shift variants set urgent=true upstream).
export function classify(capture) {
  const url = (capture.url || '').toLowerCase();

  if (capture.mode === 'voice' || capture.audio)
    return { kind: 'voice', helper: 'transcribe', priority: 5 };
  if (capture.mode === 'page' || capture.html)
    return { kind: 'page', helper: 'archive-page', priority: 5 };
  if (capture.mode === 'selection' || (capture.text && !url))
    return { kind: 'selection', helper: 'kb-add', priority: 5 };

  if (url.includes('arxiv.org'))      return { kind: 'paper',   helper: 'summarize',    priority: 5 };
  if (url.includes('github.com'))     return { kind: 'repo',    helper: 'route-link',   priority: 4 };
  if (url.includes('huggingface.co')) return { kind: 'space',   helper: 'route-link',   priority: 4 };
  if (/youtu\.?be/.test(url))         return { kind: 'video',   helper: 'summarize',    priority: 5 };

  // Generic article/unknown: selection text rides along → summarize; bare link → route-link.
  return capture.text
    ? { kind: 'article', helper: 'summarize',  priority: 5 }
    : { kind: 'link',    helper: 'route-link', priority: 5 };
}

// Paywall discipline (plan §22H): captures from paywalled hosts keep metadata
// only — text/html/audio are stripped before the task ever leaves the browser.
export function isPaywalled(url, hosts = []) {
  if (!url) return false;
  const u = url.toLowerCase();
  return hosts.some((h) => h && u.includes(String(h).toLowerCase()));
}

export function redactPayload(capture) {
  return {
    url: capture.url || null,
    title: capture.title || null,
    ts: capture.ts,
    metadata_only: true,
    note: 'Source matches paywall host list; content withheld (plan §22H).',
  };
}
