# LONG-HORIZON AGENT PROMPT — Kai's Agent Hub

> **For any agent reading this:** you are stepping into a multi-week build that is
> already in progress. The plan, the schema, the paywall discipline, the loop
> orchestrator, and one shipped integration (Hyper Journey in make-video.html)
> already exist. Your job is to *continue the rope*, not re-tie it. Read this
> whole document before acting. If a step contradicts PURPOSE.md / AGENTS.md /
> the plans/ folder, those win.

---

## Context (do not redo — read, internalize, build on)

**Owner:** Kai Djuric, working jazz saxophonist. Two-entity operating model:
- **Research + Creative Development** — the arsenal. R&D, music, art, tools.
- **Eye & Kairi** — consulting. Adopts Research tools for businesses/agencies.

**Two repos, two artifacts:**
- `kajica2/agent-hub-framework` — the forkable framework. Schemas, scripts,
  loop, watchdog. (This repo.)
- `kajica2/kajica2.github.io` — the live hub instance. Owned by Kai. Public
  surface. Paywalled material NEVER appears here.

**The hub-as-runtime** is the unifying concept: every project, agent,
component, channel, and device is a first-class entity on the hub, with
cross-links, capabilities (from controlled taxonomy), and material_license
enforced by build script.

**Watchdog:** a single Telegram/iMessage agent that waits at the end of the
rope. Wakes on: (a) delegated task completion, (b) block detection
(agent stuck ≥ 15 min), (c) cron heartbeat every 8h.

---

## The ordered work (DO IN THIS ORDER)

### Step 1 — Push framework to GitHub
- Repo: `kajica2/agent-hub-framework`
- Local state: 19 tracked files, 2 commits, schemas + scripts + loop done
- Action: `gh repo create kajica2/agent-hub-framework --public --source=. --remote=origin --push --description "Forkable agent hub framework"`
- Verify: `gh repo view kajica2/agent-hub-framework` shows the repo
- Then: enable GitHub Pages on main/root so the hub template previews live
- Hand off: paste the GitHub Pages URL into the handoff note

### Step 2 — Wire GitHub Actions CI on agent-hub-framework
- Add `.github/workflows/validate.yml`: on every push + weekly cron, run
  `node scripts/validate.mjs examples/projects.example.json examples/agents.example.json`
- Add `.github/workflows/loop.yml` (already drafted): every 5 min + on push,
  run supervisor.mjs, commit growth reports
- Verify: push a commit, check the Actions tab

### Step 3 — Build kajica2.github.io (the hub instance)
- The repo currently has `index.html` (legacy "SOVEREIGN SIGNAL" page, 16KB)
  and `arsenals.html` (41KB). KEEP these — move to `/legacy/`.
- Build the new hub from the framework template:
  - `/research/` — Research entity surface (default landing)
  - `/eye-kairi/` — Eye & Kairi consulting surface
  - `/agents/` — agent team directory (8 personas from examples/agents.example.json)
  - `/channels/agent-chat/` — daily agent chat archive (empty stub)
  - `/channels/daily-reports/` — daily research reports (empty stub)
  - `/channels/tech-pulse/` — one hand-curated tech-pulse seed
  - `/devices/guitar/` — Phase 2 (stub for now)
  - `/api/v1/state.json` — public-safe state snapshot (paywall filtered)
- Use the framework's `scripts/build.mjs --source <kajica2.github.io/data> --out dist`
- Hand off: paste the live URL into the handoff note

### Step 4 — Run the bootstrap agent on kajica2's repos
- The bootstrap-agent walks all 50+ repos, builds initial `projects.json`,
  extracts components, captures screenshots
- Run: `node bootstrap-agent/walk-repos.mjs --owner kajica2 --out kajica2.github.io/_bootstrap/draft.json`
- Open a PR against `kajica2.github.io` with the draft. Kai reviews.

### Step 5 — Wire the daily research agent
- Identify Kai's existing daily pipeline (likely `kaidjuric/daily-pipeline-director-cut` on HF)
- Add a daily cron at 06:00 UTC: fetch latest report, write to
  `kajica2.github.io/channels/daily-reports/YYYY-MM-DD.md`, commit
- Front page of hub surfaces "Today's report →" link

### Step 6 — Scaffold the Chrome extension
- Path: `agent-hub-framework/extension/`
- MV3 manifest, 5 commands minimum:
  - `Alt+L` capture link
  - `Alt+S` capture selection
  - `Alt+H` open helper-spawner
  - `Alt+O` open hub in new tab
  - `Alt+Q` show task queue
- Voice (`Alt+V`) and page archive (`Alt+P`) are Phase 2
- Phase 1 delivery: extension opens as unpacked from `extension/` dir,
  tasks post as PRs to `kajica2.github.io/channels/captures/`
- Hand off: brief Kai on load-unpacked steps

### Step 7 — Wire watchdog + Telegram bridge
- `watchdog/watchdog.mjs` is already drafted
- `watchdog/telegram-bridge.mjs` uses Bot API directly (no CLI install)
- `watchdog/imessage-fallback.mjs` uses `osascript` so pings always work
- Trigger sources: gh-actions webhook (push events), PR merge events,
  cron heartbeat
- Kai gets a Telegram message: *"Step X done. Next: Step Y. Approve to continue."*
- Hand off: tell Kai to create a bot via @BotFather and paste the token

### Step 8 — Daily research agent schema + first sample report
- Already drafted in plan section 13 / 21
- Write `channels/daily-reports/2026-09-04.md` as a hand-curated example
- Format: per-umbrella (music / audio / video / programming) sections,
  each with status / long-horizon instruction / cross-project deps / sources

### Step 9 — Agent personas become first-class hub pages
- 8 agents (per `examples/agents.example.json`):
  keysmith, image-svg, animator, hub-bridge, thumb-collector,
  daily-pipeline, kb-indexer, taxonomy-keeper
- Each gets: `/agents/<name>.html`, SVG graphic, capability tags
- Cross-linking: `projects.json` entries reference `calls_into` agent names
- Hand off: list of agents the human still needs to wire as operational

### Step 10 — Paywall audit + first security review
- Run validate.mjs and build.mjs against current kajica2.github.io data
- Verify Bob Mover lexicon, Jazzability, Serious Fun never appear publicly
- Document the boundary in `/paywall.md`
- Hand off: written confirmation that the boundary holds

---

## Standing rules (apply to EVERY step)

1. **Components are reusable.** Grep `components/manifest.json` before
   inventing anything new.
2. **Agents open PRs.** Never push to `main` directly. Branch + PR.
3. **The instance owns its data, the framework owns its shape.** Don't
   restructure framework code without Kai's approval.
4. **Cross-linking is mandatory.** Any new entity declares relationships.
5. **Daily research agent is the source of long-horizon truth.** Defer to
   the latest `channels/daily-reports/YYYY-MM-DD.md`.
6. **Paywall discipline is enforced in schema + build.** Free-text license
   values are rejected. The build script exits 1 on any leak attempt.
7. **Watchdog pattern: one-step-at-a-time.** Don't poll, don't scan
   everything. Wake only on (a) delegated task completion, (b) block
   detection, (c) 8h heartbeat.
8. **No token exhaustion.** Watchdog + cron jobs must be lightweight.
   Step in, step out.

---

## Knowledge base (where things live)

- **`PURPOSE.md`** — the 5 rules. Read first.
- **`AGENTS.md`** — the agent team contract. Read second.
- **`plans/long-horizon.md`** — Kai's authored direction. 3-year + 12-month
  + 90-day + this-month horizons. Read third.
- **`plans/agent-hub-phase1.md`** — Phase 1 design doc, 22 sections.
  Read fourth for the full architecture.
- **`schema/`** — the contract for every project, agent, channel.
- **`scripts/validate.mjs`** — the gate.
- **`scripts/build.mjs`** — the publisher.
- **`loop/supervisor.mjs`** — the orchestrator.
- **`watchdog/`** — the relay.
- **`prompts/long-horizon.md`** — this file. Read LAST.

---

## When you're blocked

Three signs you need to wake the watchdog:
1. You can't proceed without a decision only Kai can make
2. You've been running ≥ 15 min with no state change
3. You hit a paywall / security / privacy concern

When you wake the watchdog, your message should be ONE paragraph:
```
[BLOCKED] step N — <one-sentence reason>
What I tried: <bullet>
What I need: <bullet>
Suggested default if no input in 8h: <bullet>
```

Then idle. Don't poll. Don't re-send. The watchdog is the only thing
that should be checking in with Kai.

---

## When you complete a step

Ping the watchdog with:
```
[DONE] step N — <one-sentence summary>
Artifacts: <list of URLs / commit SHAs / file paths>
Next step: <N+1>
Hand-off note for Kai: <one sentence>
```

Then idle. Don't auto-start the next step unless explicitly told to.

---

## The work is bigger than this prompt

This prompt covers Phase 1. Phases 2+ (engagement model for Eye & Kairi,
real Chrome extension ops, persistent memory for the conversational agent,
multiplayer presence in the journey, the 10-step-ahead agent) are in
`plans/agent-hub-phase1.md` and `plans/long-horizon.md`. Read those
before you assume Phase 1 is enough.

---

*Last updated 2026-09-04. Maintained by Kai + the agent team.*
