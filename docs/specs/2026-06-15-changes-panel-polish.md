---
type: Spec
title: Changes panel UX polish
description: Layout, divider, primary-action, and workflow refinements for the right-panel Changes surface with before/after visual evidence.
tags: [changes-panel, source-control, ux, refine-ux]
timestamp: 2026-06-15T00:00:00Z
---

# Changes panel UX polish

## Status

Completed on `feat/changes-panel-polish-7881`. Cursor plan: [`.cursor/plans/changes-panel-polish.plan.md`](../../.cursor/plans/changes-panel-polish.plan.md). Before/after evidence: [`.impeccable/evidence/changes-panel/`](../../.impeccable/evidence/changes-panel/README.md).

## Goal

Address visual polish issues identified in the Changes panel assessment: vertical space misallocation, double divider lines, duplicate Create PR entry points, workflow sizing, history typography, and loading-state affordances. Deliver paired before/after screenshots for seven representative panel states.

## Decisions

- **Synced primary action:** When the branch is clean and up-to-date with upstream, the commit strip primary button shows a disabled **Up to date** label. Create PR remains in the overflow menu and Pull request section only.
- **Evidence gate:** Capture all “before” screenshots on the current branch before any UI edits; capture “after” screenshots after verification.

## Execution phases

1. **Capture before** — Harden `scripts/capture-changes-panel-states.mjs` with `--phase before|after`; write to `.impeccable/evidence/changes-panel/before/` and `after/`.
2. **Layout** — Compact empty file region, content-driven commit strip, workflow region earns remaining height.
3. **Dividers** — Single separator per boundary (resize handles only; remove stacked workflow borders).
4. **Primary action** — Add `upToDate` resolver action; remove `createPullRequest` as default primary.
5. **Workflow UX** — History refresh in collapsed header, ref chips, skeleton loaders, inline upstream summary.
6. **Verify** — Targeted vitest, lint, typecheck; capture after screenshots.

## Evidence scenarios

| Screenshot | State |
|------------|-------|
| `01-clean-collapsed.png` | Clean tree, workflows collapsed |
| `02-clean-all-expanded.png` | Clean tree, all workflows expanded |
| `03-dirty-files.png` | Mixed staged/unstaged/untracked |
| `04-bulk-selection.png` | Dirty + bulk selection |
| `05-linked-pr-history.png` | Linked PR + History expanded |
| `06-merge-conflict.png` | Merge conflict |
| `07-no-git.png` | Initialize repository |

## Related

- [Changes panel design (implemented)](2026-06-07-changes-panel-design.md)
- [Changes panel build report](2026-06-07-changes-panel-build-report.md)
- [Orca Git parity roadmap](2026-06-08-orca-git-parity-roadmap.md)
