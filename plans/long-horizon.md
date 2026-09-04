# Long-Horizon Plan

Human-authored direction for the agent team. Read at session start.
Agents defer to this when they don't have a more specific instruction.

## 3-year horizon
Build a hub that holds the entire arsenal as a single coordinated runtime.
Anyone — including an agent — can plug in by dropping a project + declaring
its capabilities. The hub grows without manual curation because the agent
team maintains it.

## 12-month horizon
- All 30+ projects from kajica2's arsenal are on the hub as first-class entities
- Agent team has 12 named personas (utility + research + infrastructure)
- Daily research reports flow from HF daily pipeline into hub channels
- Long-horizon loop runs continuously, growing the hub 1-2% per rotation
- Chrome extension is the day-to-day input surface; chat is rare
- Eye & Kairi has 3-5 active engagements powered by hub-deployed helpers

## 90-day horizon (Q3-Q4 2026)
- Ship the long-horizon loop with 8+ agents wired in
- Bootstrap agent walks all 50 repos, produces curated projects.json
- Daily pipeline integration with kaidjuric/daily-pipeline-director-cut
- Chrome extension v1 ships with 7 commands, PR-based dispatch
- Paywall enforcement proven by build script rejecting leak attempts
- Hub page completeness goes from ~20% to ~95%

## This month (September 2026)
- Phase 1 framework repo: PURPOSE, AGENTS, schemas, validate, build
- Phase 1 instance: 24 curated projects.json entries, paywall enforced
- Phase 1 hub: /research/ + /eye-kairi/ + /agents/ + /legacy/
- Phase 1 agents: 8 personas, 1 operational (thumb-collector), 7 stubs
- Phase 1 channels: tech-pulse + agent-chat + daily-reports
- Phase 1 loop: supervisor + 3 agents wired + growth reports
- Phase 1 extension: 7 commands, PR-based dispatch, voice stubbed

## What I'm NOT doing this period
- Building a real recommendation / ranking model (Phase 3)
- Replacing existing projects with rewrites (only add, never remove)
- Making the hub fully reactive to external signals (Phase 2)
- Client-facing Eye & Kairi portal (Phase 2)

## Decisions I'm explicitly making
- Two-entity model: Research + Eye & Kairi, separate surfaces, shared infra
- Bob Mover material is internal-paywalled, never public, enforced in schema
- Agents open PRs, never push to main, CI guards validity
- Components are reusable; controlled vocabulary; cross-linking mandatory
- Long-horizon loop runs continuously; terminates only when growth stalls
- Chrome extension is keyboard-first; chat is for intentional commands only
