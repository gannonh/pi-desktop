---
name: update-docs
description: End-of-feature documentation sweep before opening, updating, or merging a PR. Use this skill whenever feature work is complete, a milestone/spike/decision changed direction, the user asks to update docs, prepare for PR, finish a branch, merge, ship, close out work, or record what changed. It updates local project docs, roadmap/specs/plans, ADRs, diagrams, and AGENTS.md as needed, and should be used even when the user does not explicitly say "documentation" if they are wrapping up feature work.
---

# Update Docs

## Purpose

Run this at the end of feature work before opening or merging a PR. The goal is to leave future humans and agents with the current state, decisions, and next steps, without keeping dead prototype code or repeating setup instructions that belong in README.

Use the `documentation-and-adrs` skill for deeper guidance when decisions, public APIs, architecture, or feature behavior changed. If that skill is available, read it before writing ADRs or decision-heavy docs.

## Documentation map

For this project, check these locations first:

- Product context and roadmap: `docs/superpowers/specs/2026-05-12-pi-desktop-high-level-roadmap.md`
- ADRs: `docs/adr/`
- Diagrams: `docs/diagrams/`
- Specs and plans: `docs/superpowers/`
- Agent/project context: `AGENTS.md`
- Setup, run, test, and release commands: `README.md`

## Workflow

1. Inspect the branch state.

```bash
git status --short --branch
git diff --stat main...HEAD 2>/dev/null || git diff --stat
git diff --name-status main...HEAD 2>/dev/null || git diff --name-status
```

2. Identify what changed.

Look for:

- Product behavior changes.
- Architecture or dependency decisions.
- Public API, IPC, preload, transport, storage, or data-shape changes.
- Milestone, spike, or plan status changes.
- New gotchas future agents should know.
- Commands or setup changes that belong in README.
- Diagrams that no longer match the code or decision.
- Prototype code or dependencies that should not survive a no-go spike.

3. Decide which docs need edits.

Use this routing:

- `README.md`: setup, run, test, release, troubleshooting commands.
- `AGENTS.md`: durable project context, current direction, repo map, agent-relevant rules.
- `docs/adr/`: accepted or rejected architectural decisions, dependency decisions, expensive-to-reverse choices.
- `docs/diagrams/`: system flows, architecture diagrams, state/session diagrams.
- `docs/superpowers/specs/`: specs, spike outcomes, roadmap status, milestone scope.
- `docs/superpowers/plans/`: active execution plans. Move or remove stale plans when the repo convention calls for it.

4. Update docs surgically.

- Record why a decision was made, not just what changed.
- Keep roadmap status aligned with ADRs and spike specs.
- Link related docs instead of duplicating long explanations.
- Keep README as the home for commands. Do not repeat command lists in AGENTS.md or specs.
- Remove stale open questions when the question has been answered.
- Preserve spike outcomes in specs or ADRs. Do not keep dead prototype code or dependencies unless explicitly adopted.
- Do not rewrite unrelated prose or reformat whole files.

5. ADR guidance.

Write or update an ADR when the branch includes:

- A selected or rejected library/framework.
- A session, storage, IPC, transport, auth, or data-model decision.
- A durable workflow or milestone direction change.
- A no-go spike result that affects future implementation.

Use this concise ADR shape:

```markdown
# ADR 000N: [Decision title]

## Status

Accepted

## Context

[Why this decision came up, constraints, and relevant alternatives.]

## Decision

[The choice in direct language.]

## Consequences

- [Impact on implementation.]
- [Future revisit trigger, if any.]
```

6. Verify docs.

For docs-only changes, run targeted checks:

```bash
git diff --check
rg -n "TBD|TODO|broken-link-placeholder" AGENTS.md README.md docs || true
```

Also verify referenced files exist:

```bash
for f in <paths-you-linked>; do test -e "$f" || echo "missing: $f"; done
```

For code plus docs changes, also run the smallest deterministic code checks that prove the changed behavior. Prefer the repo `check` command for final verification when practical.

7. Report the result.

Use this concise format:

```markdown
Docs updated:
- `path`: what changed

Decision records:
- `path`: decision captured, or "none needed"

Verification:
- `command`: result
```

## Stop and ask

Ask before proceeding when:

- The branch has competing possible decisions and the user has not chosen one.
- A stale doc conflicts with code and you cannot tell which is authoritative.
- Updating docs would require inventing roadmap scope or acceptance criteria.
- The only evidence for a claim is a prototype that the user wants discarded.

## Common misses

- Updating a spike spec but not the roadmap.
- Recording a decision in prose but not an ADR.
- Leaving an answered question in Open Questions.
- Keeping no-go prototype dependencies in `package.json`.
- Adding setup commands to AGENTS.md instead of README.
- Forgetting diagrams after changing architecture or data flow.
