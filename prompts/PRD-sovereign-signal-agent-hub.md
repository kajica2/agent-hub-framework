# Product Requirements Document

## Sovereign Signal — The Agent Hub

**Document version:** v1.0 (2026-09-05)
**Status:** For programmer review
**Owner:** Kai Djuric (kajica2)
**Repos:**
- Framework: `github.com/kajica2/agent-hub-framework`
- Live instance: `github.com/kajica2/kajica2.github.io` → `kajica2.github.io`
- Other repos in scope: `kai-freq-lab`, `sainted-word-records`, `muscriptor`, `harmonic-study-engine`, 50+ HF Spaces

---

## 1. Vision

**One sentence:** Build a hub that holds the entire arsenal — tools, components, agents, channels, devices — as a single coordinated runtime that any person or agent can fork and plug into, with two operating identities (Research + Eye & Kairi consulting) sharing the same infrastructure.

**Why:** Right now, kajica2's ~50 GitHub repos and ~50 Hugging Face Spaces exist as disconnected artifacts. Each one was built to solve a specific problem; they share concepts (audio features, music tools, generative visuals) but don't share code, contracts, or infrastructure. The hub is the layer that makes them collectively smarter — components get reused, agents coordinate across them, paywalled content stays separated from public.

**Non-goals (explicit):**
- Not a CMS. Not a portfolio site. Not a chat product.
- Not a token-exhausting polling watchdog. The watchdog waits, it doesn't scan.
- Not a strategic-autonomy agent. The loop extends operational reach; direction stays human.

---

## 2. Operating model — Two entities, one person

Kai operates as **two distinct economic identities**:

| | Research + Creative Development | Eye & Kairi |
|---|---|---|
| **Type** | Build (R&D, music, art, tools) | Consult (adopt Research tools for agencies) |
| **Output** | Open arsenal | Engagements with businesses/agencies |
| **Hub surface** | `/research/` | `/eye-kairi/` |
| **Material license default** | public / open | consulting (paywalled during engagement) |
| **Schema field** | `entity: "research"` (default) | `entity: "eye-kairi"` |

Both share the same infrastructure: schemas, build script, agents, components, channels. Only the **filter on the public surface** changes.

---

## 3. Architecture (the system in three sentences)

The hub is a **GitHub Pages site** at `kajica2.github.io`. The canonical state is **`projects.json` + `agents.json`** at the repo root. **`scripts/build.mjs`** partitions the data into **public** (visible on Pages) and **internal** (filtered to `/internal/`, paywall-enforced). A **long-horizon loop** (`loop/supervisor.mjs`) runs agents in round-robin with termination criteria. A **one-step watchdog** (`watchdog/watchdog.mjs`) pings Kai only on done/stuck/heartbeat events.

---

## 4. Repository layout

### 4.1 `kajica2/agent-hub-framework` (forkable, agent-owned)

```
agent-hub-framework/
├── PURPOSE.md                       # 5 rules (read first)
├── AGENTS.md                        # team contract (read second)
├── README.md                        # quick start
├── prompts/
│   └── long-horizon.md              # 10-step ordered work + scoreboard
├── plans/
│   ├── long-horizon.md              # 3yr / 12mo / 90d / this-month horizons
│   └── agent-hub-phase1.md          # 22-section design doc
├── schema/
│   ├── project.schema.json            # REQUIRED fields: name, umbrella, repo, description, material_license, capabilities
│   ├── agent.schema.json              # REQUIRED: name, kind, purpose, material_access
│   ├── channel.schema.json            # research / news / metric / feed
│   └── capability-taxonomy.json       # closed vocabulary: ingest / transform / produce / analyze / visualize / distribute
├── scripts/
│   ├── validate.mjs                  # schema + taxonomy + paywall gate (exit 1 on leak)
│   ├── build.mjs                     # paywall-gated build (public/ + internal/)
│   └── capture-screenshots.mjs       # puppeteer screenshot pass
├── examples/
│   ├── projects.example.json         # 24 curated entries (21 public, 3 paywalled)
│   └── agents.example.json           # 8 personas (4 utility, 3 infrastructure, 1 research)
├── bootstrap-agent/
│   ├── walk-repos.mjs                # gh repo list → draft projects.json
│   ├── extract-components.mjs        # tag projects with component hints
│   └── README.md
├── loop/
│   ├── supervisor.mjs                # round-robin orchestrator
│   ├── state.json                    # persistent loop state (gitignored)
│   ├── growth-reports/YYYY-MM-DD.md  # append-only growth reports
│   └── agent-runs.jsonl              # per-run log
├── watchdog/
│   ├── watchdog.mjs                  # one-step relay (done / stuck / heartbeat)
│   ├── telegram-bridge.mjs           # Bot API direct (fetch to api.telegram.org)
│   └── README.md
├── components/                       # framework-owned reusable parts (seed)
│   ├── ui/  data/  scripts/          # each entry has manifest.json index
├── extension/                        # Chrome MV3 extension (Phase 6)
├── .github/workflows/
│   ├── validate.yml                  # weekly cron + per-push
│   ├── loop.yml                      # every 5 min + per-push
│   ├── bootstrap.yml                 # weekly Monday 04:00 UTC
│   ├── watchdog.yml                  # narrow path triggers + 8h schedule
│   └── ingest-daily.yml              # (in instance repo) 05:30 UTC
└── package.json                      # npm scripts: validate / build / loop / capture
```

### 4.2 `kajica2/kajica2.github.io` (instance, Kai-owned)

```
kajica2.github.io/
├── index.html                       # top-level hub, entity switcher
├── projects.json                    # canonical data (24 entries, Kai-curated)
├── agents.json                      # canonical data (8 personas)
├── research/index.html              # 21 public cards grouped by umbrella
├── eye-kairi/index.html             # consulting landing
├── agents/index.html                # 8-persona directory
├── channels/
│   ├── tech-pulse/                  # seed; Phase 2 wires arxiv + GitHub trending
│   ├── daily-reports/               # 18 ingested from HF, daily cron
│   │   ├── ingest.mjs               # idempotent fetcher
│   │   └── 2026-08-{07..22}-*.html # self-contained reports
│   ├── agent-chat/                  # Phase 6 (extension populates)
│   └── captures/                    # Phase 6 (extension Alt+L drops here)
├── devices/guitar/                  # Phase 2 (Web Audio + ACF2)
├── legacy/                          # SOVEREIGN SIGNAL v1, preserved verbatim
├── internal/                        # paywalled entries (Bob Mover etc.)
│   ├── projects.json                  # 3 entries
│   └── state.json                    # owner-only
├── api/v1/state.json                # public-safe snapshot
├── _bootstrap/                      # bootstrap-agent drafts (curation input)
├── schema/  scripts/                # copied from framework for self-contained rebuilds
├── watchdog/                        # copy of framework's watchdog
├── .github/workflows/
│   ├── rebuild.yml                  # daily 06:00 UTC + per-push
│   ├── ingest-daily.yml             # 05:30 UTC
│   └── watchdog.yml                 # narrow triggers, Telegram-optional
└── README.md
```

---

## 5. Schemas (the contracts)

### 5.1 `project.schema.json` — every project entity

```json
{
  "name": "sainted-word-records",          // kebab-case slug
  "display_name": "Sainted Word Records",
  "umbrella": "music",                     // closed enum: music | audio | video | programming | research | other
  "description": "...",                    // 10–240 chars
  "url": "https://...",                     // canonical deployment URL, OR null if repo-only
  "repo": "https://github.com/...",         // required
  "screenshot": "assets/thumbs/x.png",     // null until thumb-collector captures
  "visibility": "public",                  // closed enum: public | unlisted | private
  "status": "active",                      // closed enum: active | stale | archived | wip
  "entity": "research",                    // closed enum: research | eye-kairi | joint
  "availability": "open",                  // closed enum: open | consulting | internal
  "material_license": {                    // REQUIRED, closed enum
    "kind": "public",                       // public | cc-by | cc-by-sa | cc0 | internal-paywalled | licensed-restricted | private
    "source": "self-authored",              // origin label
    "notes": ""
  },
  "capabilities": ["produce-video", "analyze-spectrum", "deploy-vercel"],  // MUST be from capability-taxonomy.json
  "inputs":  ["audio-file", "video-clips"],
  "outputs": ["mp4-file", "engine-config-json"],
  "components": {                          // cross-linking
    "from_framework": ["ui/project-card"],
    "from_shared":    ["shared/audio-utils"]
  },
  "tags": []
}
```

**REQUIRED fields:** `name`, `umbrella`, `repo`, `description`, `material_license`, `capabilities`. Free-text `material_license.kind` is rejected at validate time.

### 5.2 `agent.schema.json` — every agent persona

```json
{
  "name": "keysmith",                      // kebab-case
  "display_name": "Keysmith",
  "kind": "utility",                       // utility | research | infrastructure | creative | orchestrator
  "graphic": "assets/agents/keysmith.svg",
  "page": "agents/keysmith.html",
  "purpose": "Issues API keys to approved collaborators...",
  "inputs":  ["user-request", "approver-sig"],
  "outputs": ["api-key-payload", "audit-log-entry"],
  "capabilities": ["produce-json-suite", "deploy-hf-space"],
  "calls_into": ["kaidjuric/keysmith-hf"],  // what this agent invokes
  "called_by":  [],                         // reverse index, built by build.mjs
  "depend_on":  [],
  "owned_by":  "instance",                  // framework | instance
  "visibility": "unlisted",                 // public | unlisted | private
  "status": "stub",                         // active | stub | wip | archived
  "material_access": ["public"]            // MUST be subset of operator's grants
}
```

### 5.3 Capability taxonomy (closed vocabulary)

```js
{
  "ingest":    ["ingest-pdf", "ingest-mxl", "ingest-midi", "ingest-audio", "ingest-manifest", "ingest-youtube", "ingest-url"],
  "transform": ["transpose", "harmonize", "rhythm-extract", "pitch-detect", "segment", "loop", "quantize", "denoise"],
  "produce":   ["produce-mxl", "produce-midi", "produce-json-suite", "produce-report", "produce-video", "produce-image", "produce-pdf"],
  "analyze":   ["analyze-cadence", "analyze-harmony", "analyze-tempo", "analyze-form", "analyze-key", "analyze-spectrum"],
  "visualize": ["visualize-score", "visualize-waveform", "visualize-spectrum", "visualize-graph", "visualize-3d"],
  "distribute":["deploy-vercel", "deploy-hf-space", "deploy-github-pages", "package-embed", "publish-channel"]
}
```

### 5.4 Channel schema

```json
{
  "name": "tech-pulse",
  "kind": "research",                      // research | news | metric | feed
  "description": "...",
  "sources": [...],
  "refresh": "weekly",                      // on-push | daily | weekly | manual
  "render": "channels/tech-pulse/template.html"
}
```

---

## 6. Paywall discipline (the non-negotiable)

**Rule:** Entries with `material_license.kind ∈ {internal-paywalled, licensed-restricted, private}` are **never** written to public output. The build script exits with code 1 on any leak attempt. To use paywalled entries in the public hub, you must:
1. Fork the framework
2. Replace those entries' `material_license.kind`
3. Confirm redistribution rights

**Enforcement layers:**
- Schema requires `material_license` (closed enum, free-text rejected)
- `scripts/validate.mjs` flags paywalled entries in source data
- `scripts/build.mjs` partitions into `dist/public/` and `dist/internal/`, asserts public side is clean

**Currently paywalled:** bob-mover-lexicon, bob-mover-book, jazzability. These are Bob Mover's practice materials — only for paying members, never public.

---

## 7. The long-horizon loop

### 7.1 Round-robin scheduler

```js
// loop/supervisor.mjs pseudo
const AGENTS = [
  { name: 'daily-pipeline',     priority: 2 },
  { name: 'kb-indexer',         priority: 3 },
  { name: 'thumb-collector',    priority: 4, depends_on: [] },
  { name: 'channel-renderer',   priority: 5, depends_on: ['thumb-collector'] },
  { name: 'taxonomy-keeper',    priority: 6 },
];
```

Agents with `priority: 0` are never auto-run (e.g. paywall-auditor — human-triggered only).

### 7.2 Termination criteria

Loop sleeps when, for one full rotation:
- KB growth <1% over 7 days
- Component graph growth <1% over 7 days
- All agents successful
- No pending items
- All builds green

Then 24h cooling-off. Loop never shuts down permanently — just sleeps until something wakes it.

### 7.3 Growth signals

| Signal | Measurement |
|---|---|
| KB count | `projects.json` length |
| Cross-links | total `calls_into` + `depend_on` + `from_framework` + `from_shared` references |
| Page completeness | non-empty HTML files in built output |

Written to `loop/growth-reports/YYYY-MM-DD.md` each rotation. Front-page of hub surfaces latest report.

### 7.4 Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Agent crashes | Lock file age >5 min | Release lock, mark failed, retry next rotation |
| Invalid write | Build script rejects | Rollback, flag for human review |
| Race on resource | Lock conflict | Second agent defers |
| Growth stalled | Signals flat 7 days | Cooling-off, surface "needs input" |
| External API down | HTTP error in agent run | Mark degraded, retry with backoff |
| Paywall leak | Build script detects | Block, auto-trigger paywall-auditor (priority 0) |

---

## 8. Agent personas (8, with 2 active + 6 stub)

| Name | Kind | Purpose | Status |
|---|---|---|---|
| `keysmith` | utility | API key issuance, rotation, audit | stub |
| `image-svg` | utility | Image upload → SVG vectorization (→ HF Space) | stub |
| `animator` | utility | SVG → animated SVG / Lottie / MP4 | stub |
| `hub-bridge` | utility | HF Space output → hub directory | stub |
| `thumb-collector` | infrastructure | Screenshot capture/refresh | **active** |
| `daily-pipeline` | research | Calls out to HF daily-pipeline-director-cut | **active** |
| `kb-indexer` | infrastructure | Walks repos, indexes READMEs | stub |
| `taxonomy-keeper` | infrastructure | Reviews capability proposals | stub |

Each agent needs:
- Page at `/agents/<name>.html` with graphic + purpose + capabilities + calls-into + reverse-index
- SVG graphic in `assets/agents/<name>.svg` (consistent monoline style, cyan/magenta/amber palette)
- Cross-linked from `projects.json` entries via `calls_into` field

---

## 9. Watchdog (one-step, not polling)

**Trigger sources:**
1. PR merged to main → done
2. Push to meaningful paths (PURPOSE, AGENTS, prompts, plans, schema, scripts, watchdog, examples, components, _bootstrap/draft)
3. Cron heartbeat every 8h
4. Manual trigger (workflow_dispatch)

**Delivery:**
- Telegram (Bot API direct, fetch to api.telegram.org)
- iMessage fallback (macOS only, uses osascript)
- Non-fatal on missing secrets (logs informational, exits 0)

**NOT triggers** (avoid spam):
- Loop rotation commits
- Daily report ingestion
- Routine workflow file changes
- Watchdog's own commits

---

## 10. Chrome extension (Phase 6, design only)

MV3 manifest, 7 commands:

| Shortcut | Action | Phase |
|---|---|---|
| `Alt+L` | Capture current tab URL + selection | 1 |
| `Alt+S` | Capture selected text | 1 |
| `Alt+H` | Helper-spawner (popup UI) | 1 |
| `Alt+O` | Open hub in new tab | 1 |
| `Alt+Q` | Show task queue + recent results | 1 |
| `Alt+V` | Voice memo (push-to-talk) | 2 |
| `Alt+P` | Page archive (HTML + screenshot) | 2 |

Phase 1 delivery: unpacked extension, tasks post as PRs to `kajica2.github.io/channels/captures/`. Phase 2: Web Store publish + serverless intake endpoint + SSE/WebSocket push + multi-helper fan-out / pipeline UI.

---

## 11. Hyper Journey ↔ Spatial 3D integration (kai-freq-lab)

Two layers, distinct roles:

| Layer | Role | Drives |
|---|---|---|
| **Hyper Journey** | Player motion, scene navigation, JourneyState | Position, velocity, heading, nearest node, motion amount |
| **Spatial 3D** | HRTF PannerNode for audio spatialization | panner.panningModel='HRTF', listener position |

**Movement drives spatialization, NOT frequency.** Position.z → reverbSend, position.y → filterCutoff, heading → HRTF orientation. Frequency only changes on explicit arrival with 1-3s crossfade.

**Canonical `JourneyState`:`

```ts
type JourneyState = {
  active: boolean;
  player: { position: Vec3; velocity: Vec3; heading: number; speed: number };
  selectedNodeId: string | null;
  nearestNodeId: string | null;
  movementMode: 'walk' | 'fly' | 'teleport' | 'guided';
  audioMode: 'manual' | 'follow-player' | 'follow-route';
  userProfile: { motionScale: number; spatialEnabled: boolean; autoLoadOnArrival: boolean };
};
```

**SW make-video.html integration (shipped):** Three layers:
- Layer 1: existing SWR render (untouched)
- Layer 2: 20%-opacity alpha canvas, 60-80% in "create" mode (`lib/alpha-layer.client.js`)
- Layer 3: very subtle effects via CSS custom properties (`lib/journey-effects.client.js`)
- Audio → JourneyState → Layer 2 + Layer 3 (`lib/journey-state.client.js`)

---

## 12. Component library

Two libraries, intentionally:

### A. Framework repo: `components/` (framework-owned)
- `ui/` — cards, badges, layout
- `data/` — schemas, capability taxonomy
- `scripts/` — build, validate, capture

### B. Instance repo: `shared/` (instance-owned)
- `audio-utils/` — fft, peak detection
- `mxl-parser/` — music21 wrappers
- `pdf-ingest/` — PDF → exercise JSON
- `ui-tokens/` — design system

**Cross-linking:** `projects.json` entries reference both via `components: { from_framework: [...], from_shared: [...] }`. Hub surfaces "Most-reused components" + "Recently added."

---

## 13. Public API

`api/v1/state.json` (static, served at `https://kajica2.github.io/api/v1/state.json`):

```json
{
  "version": "v1",
  "generated_at": "2026-09-04T...",
  "projects": [{ "name", "umbrella", "url", "repo", "description", "capabilities", "entity" }],
  "agents":   [{ "name", "display_name", "kind", "purpose", "capabilities", "status", "entity" }],
  "paywalled_count": 3,
  "note": "Paywalled entries are not listed. Contact for engagement terms."
}
```

Phase 2: add WebSocket/SSE for live updates. Phase 3: add write endpoints (PR-based or direct).

---

## 14. CI/CD matrix

| Repo | Workflow | Trigger | Purpose |
|---|---|---|---|
| framework | `validate.yml` | per-push + weekly Mon | schema + paywall gate |
| framework | `loop.yml` | every5 min + per-push | round-robin orchestrator, growth reports |
| framework | `bootstrap.yml` | weekly Mon 04:00 UTC | refresh kajica2 repo inventory |
| framework | `watchdog.yml` | PR-closed + narrow paths + 8h | notify Kai of meaningful events |
| instance | `rebuild.yml` | per-push + daily 06:00 UTC | regenerate hub from projects.json |
| instance | `ingest-daily.yml` | daily 05:30 UTC | pull new HF daily reports |
| instance | `watchdog.yml` | PR-closed + narrow paths + 8h | same purpose, instance-side |

All workflows: Node 22, ubuntu-latest, timeouts 2-10 min. Workflows needing commit access declare `permissions: contents: write`.

---

## 15. Roadmap

### Phase 1 — DONE
- Framework repo + schemas + validate/build/capture scripts
- Loop supervisor + growth reports
- Watchdog scripts + workflows (narrow triggers)
- Bootstrap agent scaffold
- Hub instance at kajica2.github.io
- 21 public projects, 3 paywalled, 8 agent personas
- 18 daily reports ingested
- All 4 framework workflows green + 3 instance workflows green

### Phase 2 — TODO
- Step 6: Chrome extension
- Step 8-9: Per-agent hub pages, cross-linking UI
- Step 10: Written paywall audit doc
- Watchdog Telegram secrets configured (Kai's @BotFather token)

### Phase 3 — TODO (per `plans/long-horizon.md`)
- Engagement model for Eye & Kairi (client-scoped auth, anonymized case studies)
- Real Chrome extension ops (Web Store publish, serverless intake, SSE push)
- Persistent memory for conversational agent
- Multiplayer presence in Hyper Journey
- 10-step-ahead agent loop

---

## 16. Open questions for the team

1. **Component library seeding** — Which existing kai-freq-lab utilities belong in `shared/` (instance-owned) vs `components/` (framework-owned)? Likely: ACF2 pitch detection → `shared/audio-utils`. Score parser → `shared/mxl-parser`.
2. **Eye & Kairi catalog** — 0 entries currently in `entity: "eye-kairi"`. Which services/products belong there?
3. **Daily-pipeline HF Space** — currently scraped from `kaidjuric/daily-pipeline-director-cut`. Should the agent team own a canonical pipeline repo + Space, or keep scraping?
4. **Capability taxonomy** — initial list covers audio/music/video well. Need additions for: agents, infra, distribution?
5. **Paywall enforcement depth** — currently: schema + build. Should we add: a separate CI job that scans public pages for forbidden strings (defense in depth)?
6. **Watchdog Telegram** — needs Kai to paste @BotFather token. Until then, watchdog messages fall back to iMessage (no-op on Linux runners).

---

## 17. Acceptance criteria (current state)

| Check | Status | Notes |
|---|---|---|
| `npm run validate` exits 0 | ✅ | 24/24 projects, 8/8 agents schema-valid |
| `npm run build` produces paywall-clean public output | ✅ | 21 public + 3 internal-only |
| Hub live at `kajica2.github.io` | ✅ | entity switcher works |
| 18 daily reports ingested | ✅ | Aug7-22, 2026 |
| All framework CI workflows green | ✅ | validate / loop / watchdog / bootstrap |
| All instance CI workflows green | ✅ | rebuild / ingest-daily / watchdog |
| Loop running autonomously | ✅ | rotation writes to growth-reports/ |
| Watchdog non-fatal on missing secrets | ✅ | logs informational, exits 0 |
| No paywalled names in public output | ✅ | bob-mover, jazzability absent from public HTML |

---

## 18. Risks (called out up front)

1. **Vercel deploys hang at "Building…".** Verified: SWR repo's `vercel deploy` consistently fails with idle process (0.01s CPU after 5+ min). Cause unknown. Workaround: ship via GitHub auto-deploy or `vercel build --yes && vercel deploy --prebuilt`. NOT a code issue.
2. **HF Spaces tree API requires auth for some spaces.** `hf spaces ls <scope>` returns "not found" even when scope exists. Workaround: `curl https://huggingface.co/api/spaces?author=<scope>&limit=200` (no auth needed).
3. **Vercel alias URLs always return 200** even for stale/deleted deployments. Don't trust liveness from 200 alone — match title or use `vercel alias ls`.
4. **Puppeteer needs Chromium binary.** Fails in sandboxed CI; works in Actions because Actions installs it.
5. **Hub runtime is static (GitHub Pages).** Phase 2 needs serverless intake + WebSocket for real-time agent-to-hub. Until then, agents post via PRs.

---

## 19. Where to start (for a new programmer)

1. Read `PURPOSE.md` (5 rules)
2. Read `AGENTS.md` (team contract)
3. Read `prompts/long-horizon.md` (Status table shows what's done)
4. Read `plans/agent-hub-phase1.md` sections 1-22 (architecture)
5. Clone framework: `git clone https://github.com/kajica2/agent-hub-framework.git`
6. `npm install && npm run validate && npm run build`
7. Inspect `dist/public/` and `dist/internal/` to see the build outputs
8. Clone instance: `git clone https://github.com/kajica2/kajica2.github.io.git`
9. Edit `projects.json` to add a project; commit + push; the rebuild action will regenerate the hub
10. For agent work: read `prompts/long-horizon.md` Status + Step descriptions

---

## Appendix A — Examples

### A.1 Sample `projects.json` entry (public)

```json
{
  "name": "sainted-word-records",
  "display_name": "Sainted Word Records",
  "umbrella": "music",
  "description": "Audio-reactive video engine. Single-file, browser-native, MIT.",
  "url": "https://sainted-word-records.vercel.app",
  "repo": "https://github.com/kajica2/sainted-word-records",
  "visibility": "public",
  "status": "active",
  "entity": "research",
  "availability": "open",
  "material_license": { "kind": "public", "source": "self-authored" },
  "capabilities": ["produce-video", "analyze-spectrum", "deploy-vercel"],
  "inputs":  ["audio-file", "video-clips", "image-library"],
  "outputs": ["mp4-file", "engine-config-json"]
}
```

### A.2 Sample `projects.json` entry (paywalled)

```json
{
  "name": "bob-mover-lexicon",
  "display_name": "Bob Mover Jazz Lexicon",
  "umbrella": "music",
  "description": "407 practice patterns, 12 transpositions each. Members only.",
  "url": null,
  "repo": "https://github.com/kajica2/bob-mover-lexicon",
  "visibility": "private",
  "status": "active",
  "entity": "research",
  "availability": "consulting",
  "material_license": {
    "kind": "internal-paywalled",
    "source": "bob-mover",
    "notes": "Internal users only. Never surfaces publicly."
  },
  "capabilities": ["transpose", "produce-json-suite", "visualize-score"],
  "inputs":  ["exercise-pattern", "key-signature"],
  "outputs": ["transposed-exercises", "practice-report"]
}
```

### A.3 Sample `agents.json` entry

```json
{
  "name": "thumb-collector",
  "display_name": "Thumb-Collector",
  "kind": "infrastructure",
  "purpose": "Captures and refreshes screenshots across all hub projects on a weekly schedule.",
  "inputs":  ["project-url-list"],
  "outputs": ["screenshot-files", "manifest-json"],
  "capabilities": ["deploy-vercel", "publish-channel"],
  "calls_into": ["puppeteer-headless"],
  "owned_by": "instance",
  "visibility": "public",
  "status": "active",
  "material_access": ["public"]
}
```

### A.4 Watchdog message formats

```
✅ [DONE] step 3
Built hub instance from framework template

Artifacts: https://kajica2.github.io/
Hand-off: Click around. Tell me what to tweak.

Next step: idle. Waiting on you.

---

🚨 [BLOCKED] step 5
Need VERCEL_TOKEN to wire daily pipeline cron

Tried: Read Vercel env, no token present
Need: paste VERCEL_TOKEN into ~/.hermes/config.yaml
Default if no input in 8h: Skip Step 5 until token available, move to Step 6

Send instructions or "continue with default".

---

💓 [HEARTBEAT] agent hub alive
Step in progress: 7
Watchdog is non-fatal, all workflows green.

Everything green. No action needed unless you want to course-correct.
```

---

*This PRD reflects implementation as of 2026-09-05. Sections marked TODO in the Status table are the next deliverables.*

*For DeepSeek consultation:* the highest-value sections to route for review are §6 (paywall discipline), §7.2 (termination criteria), and §11 (Hyper Journey movement-to-audio mapping) — those are where a second-opinion model with strong code-review training could catch subtle issues in the contracts and the termination logic. A DeepSeek API key would let me send the actual document for review and integrate the feedback inline.