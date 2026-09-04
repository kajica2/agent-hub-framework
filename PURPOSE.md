# PURPOSE

This repository exists so that one person's arsenal of tools, components, and agents
can be presented as a unified, forkable runtime that other agents and builders can
adopt, plug into, and grow.

## What we are

A framework + a working instance. The framework is empty until someone fills it
with their own projects. The instance (kajica2's hub at kajica2.github.io) is the
canonical example of the framework in use.

## What we are not

- Not a portfolio site
- Not a CMS
- Not a chat product
- Not a portfolio gallery

## The rules

1. **Components are reusable.** Every component declares its capabilities from a
   controlled vocabulary (see schema/capability-taxonomy.json). Free-text capability
   strings are rejected.

2. **Agents open PRs, never push to main directly.** Every agent edit lands as a
   branch + PR. CI must pass. The human reviews and merges.

3. **The instance owns its data, the framework owns its shape.** kajica2.github.io
   is free to add/edit projects. The framework's *structure* — schema, scripts,
   contract — is shaped by agents but reviewed by humans.

4. **Cross-linking is mandatory.** Any new project, component, or channel declares
   its relationships. The hub's "Most-reused components" and "Cross-linked projects"
   views must always be accurate.

5. **Daily research agent is the source of long-horizon truth.** Other agents defer
   to it for "what should we be working toward." (kajica2's instance calls out to
   the user's existing daily research agent — it does not duplicate it.)

## How an agent should read this file

At session start, load PURPOSE.md. Internalize the five rules. When making decisions
about what to commit, edit, or propose, check the rule that applies. If a request
conflicts with a rule, refuse and explain which rule.
