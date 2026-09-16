# Sovereign Signal Bridge — Chrome Extension (Phase 1)

Keyboard-first capture bridge between your browser and the agent team on
[kajica2.github.io](https://kajica2.github.io/). Design: plan §22 of
`plans/agent-hub-phase1.md`. The extension is the **trigger**; the hub's
loop is the **worker**.

## Install (dev mode, unpacked — Phase 1 stays out of the Web Store)

1. `chrome://extensions` → enable **Developer mode** (top right).
2. **Load unpacked** → select this `extension/` folder.
3. Pin the Bridge icon to the toolbar.

## Shortcuts (all customizable at `chrome://extensions/shortcuts`)

| Keys | Capture | Routed to |
|---|---|---|
| `Alt+L` | current tab URL + selection + title | `route-link` / `summarize` |
| `Alt+S` | selected text only | `kb-add` |
| `Alt+P` | full page (HTML + visible screenshot) | `archive-page` |
| `Alt+V` | voice memo — press once to start, again (or 30 s) to stop | `transcribe` |
| `Alt+H` | helper spawner (popup → Helpers tab) | you pick |
| `Alt+O` | — | opens the hub |
| `Alt+Q` | — | popup queue |

Right-click context menus mirror link / selection / page capture.

## Flow (Phase 1 = PR-based, no server)

`capture → classify → queue (chrome.storage.local, cap 100, oldest evicted) → popup`

From the popup, **Ship to hub** opens one PR against the hub repo carrying
each task as `channels/captures/YYYY-MM-DD/<task-id>.md` (YAML frontmatter +
payload; audio as sibling `.b64`). You merge; the loop picks it up. With no
token configured, **Export JSON** downloads the same bundle — the queue is
never a dead end.

### Enabling PR mode

Settings tab → paste a GitHub **fine-grained PAT** scoped to the hub repo
with *Contents: Read and write*. The token lives only in `chrome.storage.local`
on your machine; requests go straight to `api.github.com`. Never sync it to a
Google account (use a local-only profile if unsure).

### Paywall discipline (§22H)

Captures whose URL matches a **paywall host** (Settings list; defaults
`kajica2.github.io/internal`, `bobmover`) ship **metadata only** — text,
HTML, and audio are stripped in the service worker before the task leaves
the browser. Queue rows show a `redacted` badge.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3, 7 commands, permissions |
| `background.js` | service worker: shortcuts, capture, classify, queue, menus, voice toggle |
| `router.js` | helper registry (§22D) + classification + paywall redaction |
| `lib/hub-client.js` | task-file format, GitHub PR creation, JSON export |
| `offscreen.html` / `offscreen.js` | MediaRecorder host (SWs have no DOM) |
| `popup.*` | queue · helper spawner · settings |
| `icons/` | bridge mark, 16/32/48/128 |

## Phase 1 limits (honest list)

- Helpers are **registry entries + queue routing**, not live workers. The hub
  loop consumes merged PRs; `transcribe`/`summarize` model calls are Phase 2.
- Voice: 30 s window, single take, no push-to-talk keyup (Chrome commands
  don't deliver key-release). Mic permission prompts on first use.
- Page capture: visible-tab screenshot only; `chrome://`/WebStore pages yield
  metadata only (scripting blocked).
- Fan-out / pipeline modifiers (`Alt+Shift+L`) and SSE result push: Phase 2 (§22J).
- `chrome.action.openPopup()` from `Alt+H`/`Alt+Q` requires Chrome 127+;
  older builds fall back to a notification telling you to click the icon.
