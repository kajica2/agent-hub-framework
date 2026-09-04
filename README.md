# Agent Hub Framework

Generic forkable framework for the Sovereign Signal agent hub.
Schemas, validate, build, screenshot capture, loop orchestration.

## Five-minute onboarding

```bash
# 1. Install deps
npm install

# 2. Validate your projects.json + agents.json
npm run validate -- examples/projects.example.json examples/agents.example.json

# 3. Build the public hub
npm run build -- --source examples --out dist

# 4. (Optional) Capture screenshots
npm run capture -- --projects examples/projects.example.json --out dist/public/assets/thumbs
```

## What's where

- `schema/` — JSON Schemas for projects, agents, channels, capability taxonomy. Paywall enforced here.
- `scripts/validate.mjs` — schema + paywall gate. Exits non-zero on any leak.
- `scripts/build.mjs` — paywall-gated build. Writes `dist/public/` (paywall-safe) + `dist/internal/` (owner-only).
- `scripts/capture-screenshots.mjs` — puppeteer pass over all live projects.
- `loop/` — long-horizon self-growing loop (supervisor, run-agent, check-termination).
- `extension/` — Chrome MV3 extension, keyboard-first bridge.
- `examples/` — forkable templates. Replace with your own data.
- `plans/long-horizon.md` — human-authored direction. Read at session start.
- `PURPOSE.md` — the team's shared purpose + 5 rules.
- `AGENTS.md` — agent team contract + roles.

## The paywall discipline

Project entries with `material_license.kind ∈ {internal-paywalled, licensed-restricted, private}` are NEVER written to public output. The build script exits with code 1 if any leak attempt is detected. To use paywalled entries in the public hub, you must (a) fork the framework, (b) replace those entries' license kind, (c) confirm redistribution rights.

## Loop architecture

The `loop/supervisor.mjs` orchestrator runs on GitHub Actions (`.github/workflows/loop.yml`) every 5 minutes + on every push. It picks the next agent by priority + dependencies, runs it with a file lock, writes a growth report, and checks termination criteria. The loop keeps running until the project stops growing (KB growth < 1% over 7 days + all agents healthy + no pending items).

## Forking

1. Fork this repo
2. Replace `examples/projects.json` and `examples/agents.json` with your own data
3. Update `PURPOSE.md` to reflect your team's purpose
4. Add agent pages under `extension/agents/` (or wherever you serve them)
5. Ship `dist/` to GitHub Pages / Vercel / your host of choice

## License

MIT.
