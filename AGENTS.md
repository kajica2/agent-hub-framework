# AGENTS

This file defines the agent team that maintains this framework.

## Roles

| Role | Mode | Responsibility |
|---|---|---|
| Bootstrap Agent | one-shot, on demand | Walks all repos, builds initial inventory |
| Screenshot Sweeper | weekly gh-actions | Captures fresh screenshots of live projects |
| Channel Renderer | per push | Regenerates channel pages from data |
| Daily Research Agent | daily gh-actions | Stub here — kajica2's instance calls the user's existing daily research agent (link in projects.json). |
| Component Curator | PR review | Reviews new component PRs, updates taxonomy |
| Personality Reflector | Phase 3 | Reads recent conversations, updates personality.md |

## How agents collaborate

1. Each agent reads PURPOSE.md at start.
2. Each agent reads AGENTS.md to know who else is on the team.
3. Each agent reads components/manifest.json before inventing new components.
4. Agents open PRs. They never push to main.
5. Agents write one log line per run to agent-runs/YYYY-MM-DD.md (append-only).

## How agents learn

When a human edits an agent's PR before merging, the diff is the training signal.
The next PR from that agent should reflect the edit. Personality Reflector (Phase 3)
formalizes this. For now, agents read their last 5 merged PRs to see what the human
changed.
