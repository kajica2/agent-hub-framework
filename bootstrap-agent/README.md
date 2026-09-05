# Bootstrap Agent

Walks kajica2's GitHub repos, builds the initial `projects.json`, extracts
component candidates, and produces a draft inventory for Kai's review.

## Usage

```bash
# Dry-run: writes to _bootstrap/draft/, doesn't commit
node bootstrap-agent/walk-repos.mjs --dry-run --owner kajica2

# After walking, run component extraction
node bootstrap-agent/extract-components.mjs

# Real run (Phase 1: copy draft files manually into kajica2.github.io/projects.json)
node bootstrap-agent/walk-repos.mjs --owner kajica2 --out /path/to/kajica2.github.io

# (Future) PR mode — opens a PR against kajica2.github.io
node bootstrap-agent/walk-repos.mjs --commit --owner kajica2
```

## Output

- `projects.json` — entry per repo with auto-classified umbrella + license
- `tools.json` — lighter-weight component manifest
- `inventory-draft.md` — human-readable summary with action items for Kai

## Classification logic

### Umbrella (auto-detected)
- Keyword match on name + description against a per-umbrella keyword list
- Fallback: Python repos → audio; others → other

### License (auto-detected)
- Repo name contains `bob-mover`, `jazzability`, `serious-fun` → `internal-paywalled`
- Repo name contains `omnibook`, `wjazd`, `jazzomat` → `licensed-restricted`
- Repo is private → `private`
- Otherwise → `public`

### Status (auto-detected)
- Name starts with `archive`/`old`/`deprecated` → `archived`
- Name contains `wip`/`beta`/`alpha`/`draft`/`experimental` → `wip`
- Otherwise → `active`

## Action items for Kai (always review)

1. Curate umbrella classifications — auto-classification uses heuristics
2. Fill in canonical deployment URLs (`url` field) — bootstrap leaves null
3. Verify paywall assignments — review the auto-flagged list
4. Set entity per project — defaults to `research`; move to `eye-kairi`/`joint` if appropriate
5. Pick screenshots — run `scripts/capture-screenshots.mjs` after curation
