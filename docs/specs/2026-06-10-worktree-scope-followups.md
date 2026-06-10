# Worktree and runtime scope — follow-up triggers

## Status

Active follow-up list after [ADR 0005](../adr/0005-source-control-worktree-scope.md) (Wave 5.3, [#157](https://github.com/gannonh/pi-desktop/issues/157)).

## Purpose

Record when Pi Desktop should reopen worktree, runtime git, and branch-lifecycle boundaries. This spec does not authorize implementation; it lists decision gates only.

## Current boundary (summary)

- **In scope today:** selected-project Changes on one local checkout (`ProjectRecord.path`).
- **Deferred:** multi-worktree UX, SSH/runtime git, WSL-specific git fallbacks, worktree cleanup, branch rename/delete beyond existing compare/checkout flows.

## Revisit triggers

### Product and roadmap

| Trigger | Why reopen | Likely outcome |
| --- | --- | --- |
| **M0X: Worktrees and Git UX** milestone is scheduled | High-level roadmap already names worktree list, create, and switch flows | New milestone spec + UX design; may supersede parts of ADR 0005 for that milestone only |
| **Parallel branch workflows** become a stated product goal | Users need two checkouts of one repo without duplicate project records | Evaluate lightweight multi-worktree vs multiple project entries; design selected-repo UX before porting Orca machinery |
| **Cloud or remote workspace** milestone starts | Non-local checkouts need git authority, auth, and path guards | New ADR for runtime git scope; SSH/runtime `connectionId` patterns may apply only there |

### Orca parity and platform

| Trigger | Why reopen | Likely outcome |
| --- | --- | --- |
| **Explicit request to port Orca worktree cleanup** | Stale worktrees accumulate when users manage branches outside the app | Requires branch/worktree ownership model in selected-project UX; not a silent Orca module port |
| **Cross-platform support beyond macOS** (e.g. WSL) | Orca git uses platform-specific fallbacks for Windows/Linux | Platform ADR first; worktree scope may remain unchanged on macOS |
| **Sparse checkout or monorepo sub-root** projects | Selected path may not be repository root | Path-guard and status semantics spec before any worktree expansion |

### Source-control surface

| Trigger | Why reopen | Likely outcome |
| --- | --- | --- |
| **Branch rename or delete** added to Changes or project chrome | Destructive lifecycle actions need clear ownership and recovery | Selected-project UX spec + confirmation flows; reference Orca only after design sign-off |
| **Multiple projects share one `.git` directory** | Users open two project records pointing at different worktrees of the same repo | Decide whether app deduplicates git polling, shows warnings, or remains intentionally unaware |
| **Hosted review (#155)** needs worktree-aware PR context | PR head/base may reference branches checked out in other worktrees | Revisit only if hosted review milestone requires cross-checkout metadata |

### Safety and operations

| Trigger | Why reopen | Likely outcome |
| --- | --- | --- |
| **UAT #158** (active path/branch clarity) finds users mutating wrong checkout | Ambiguity between project list and git root | May tighten copy/guards without adopting multi-worktree UX |
| **E2E #159** exposes gaps for worktree-adjacent git states | Tests may use bare remotes or detached HEAD | Test matrix update first; product scope change only if failures imply user-facing bugs |

## Non-triggers (do not reopen ADR 0005 for these alone)

- Porting individual Orca git helpers that already map cleanly to `projectPath` (status parsing, diff tabs, primary-action resolver).
- Wave 5.2 git settings (base ref, attribution) — settings apply to the selected checkout only.
- PR review tab work — tracked separately; remains deferred from Changes per `CONTEXT.md`.

## Next artifact when a trigger fires

1. Short design or ADR amendment stating what changed since ADR 0005.
2. Executable milestone spec with acceptance criteria and explicit non-goals.
3. Update to `docs/specs/2026-06-08-orca-git-parity-roadmap.md` or `docs/pi-desktop-high-level-roadmap.md` status lines.
