# Orca Git Parity Roadmap

## Status

Active follow-up roadmap after M07C Changes panel implementation. **Wave 1 (§1.1–1.2) shipped on `wave1`** — see [PR #160](https://github.com/gannonh/pi-desktop/pull/160). **Wave 2 (§2.1–2.3) is implemented.** **Wave 3 (§3.1–3.2) is implemented on `wave3`.** **Wave 4 (§4.1–4.2) is implemented on `wave4`.** **Wave 5 (§5.1–5.3) is implemented on `wave5`.** **Wave 5.3 (§5.3) boundary recorded on `feat/wave5-53-worktree-scope`** — see [ADR 0005](../adr/0005-source-control-worktree-scope.md).

## Context

Pi Desktop now has a live local Changes panel with status, stage/unstage/discard, commit, basic remote operations, branch compare, unified diff tabs, and GitHub PR creation. Orca's Git implementation remains broader: it combines mature source-control state machines, hosted review workflows, history, conflict handling, runtime-aware Git operations, and settings.

This roadmap lists the remaining high-level gaps. Each item is intentionally short so future milestone planning can split it into executable specs.

## GitHub Tracking

- Wave 1 local source-control UX: [#147](https://github.com/gannonh/pi-desktop/issues/147)
- Wave 2 conflict/status/remote hardening: [#148](https://github.com/gannonh/pi-desktop/issues/148), [#149](https://github.com/gannonh/pi-desktop/issues/149), [#150](https://github.com/gannonh/pi-desktop/issues/150)
- Wave 3 history and diff review: [#151](https://github.com/gannonh/pi-desktop/issues/151), [#152](https://github.com/gannonh/pi-desktop/issues/152)
- Wave 4 AI generation and recovery: [#153](https://github.com/gannonh/pi-desktop/issues/153), [#154](https://github.com/gannonh/pi-desktop/issues/154)
- Wave 5 hosted review, settings, and worktree scope: [#155](https://github.com/gannonh/pi-desktop/issues/155), [#156](https://github.com/gannonh/pi-desktop/issues/156), [#157](https://github.com/gannonh/pi-desktop/issues/157)
- Follow-on UAT gaps: active path/branch clarity [#158](https://github.com/gannonh/pi-desktop/issues/158), local-bare-remote e2e coverage [#159](https://github.com/gannonh/pi-desktop/issues/159)

## Scope

- Compare Pi Desktop's current Changes panel implementation (`wave1` / M07C base) against Orca's Git and Source Control surfaces.
- Keep Pi Desktop focused on local desktop UX and selected-project source control.
- Treat GitLab, SSH/runtime worktrees, and PR review/checks as larger follow-up tracks unless explicitly pulled forward.

## Roadmap Waves

### Wave 1: Primary Action State Machine and Destructive Confirmations

Ship the core day-to-day Source Control UX first. This wave should make common local workflows predictable before deeper Git edge cases are layered in.

#### 1.1 Primary Action State Machine — ✅ Implemented

Tracking: [#147](https://github.com/gannonh/pi-desktop/issues/147)

**Shipped:** `src/renderer/changes-panel/source-control-primary-action-resolver.ts` computes primary and dropdown actions from git status, commit message, upstream, PR state, conflicts, and busy flags. `ChangesPanel` renders resolver output with disabled-reason copy. `syncRemote` in `src/main/git/status.ts` rejects one-click sync when `ahead > 0` and `behind > 0`.

**Acceptance Criteria**

- ✅ Primary action changes based on staged changes, unstaged changes, message state, upstream state, PR state, and conflicts.
- ✅ Dropdown exposes stable rows for commit variants, remote operations, publish, rebase, fetch, and create PR.
- ✅ Disabled actions show concise reasons and have unit coverage for priority order (`tests/renderer/source-control-primary-action-resolver.test.ts`).
- ✅ Diverged upstream state does not present one-click `Sync`; users are directed to an explicit reconcile action (rebase-first in the resolver; sync rejected in main).

**Wave 2 overlap:** Diverged-vs-fast-forwardable classification and richer upstream probing remain under [§2.3](#23-remote-and-upstream-semantics).

#### 1.2 Destructive Confirmation Flow — ✅ Implemented

Tracking: [#147](https://github.com/gannonh/pi-desktop/issues/147)

**Shipped:** `ChangesPanel` uses shadcn `AlertDialog` with type-specific discard copy via `getDiscardConfirmation` (untracked/added delete copy, deleted-tracked restore copy, bulk area counts).

**Acceptance Criteria**

- ✅ Untracked and newly-added files use delete-focused copy.
- ✅ Deleted tracked files use restore-focused copy.
- ✅ Bulk discard copy includes affected count and area.
- ✅ Confirm/cancel behavior is covered by renderer tests (`tests/renderer/changes-panel.test.tsx`).

### Wave 2: Conflict Rows, Status Fidelity, and Remote/Upstream Hardening

Stabilize correctness and safety in less-happy Git states. This wave should make the local Changes panel trustworthy under conflicts, unusual paths, and real remote branch setups.

#### 2.1 Conflict Rows and Resolution State — ✅ Implemented

Tracking: [#148](https://github.com/gannonh/pi-desktop/issues/148)

**Shipped:** `getStatus` parses porcelain v2 unmerged entries into typed conflict rows. `ChangesPanel` renders conflict kind labels and compatibility guidance per row while keeping merge, rebase, and cherry-pick operation banners and abort actions visible.

**Acceptance Criteria**

- ✅ `git status --porcelain=v2` unmerged entries are parsed into typed conflict rows.
- ✅ Conflict kind and compatibility status are shown in the Changes tree.
- ✅ Merge, rebase, and cherry-pick conflict states stay visible while active.
- ✅ Abort operations refresh status and preserve visible failure feedback.

#### 2.2 Status Fidelity and Edge Cases — ✅ Implemented

Tracking: [#149](https://github.com/gannonh/pi-desktop/issues/149)

**Shipped:** Status entries are enriched with batched `git diff --numstat -z` line stats for staged and unstaged changes. Literal pathspec handling is covered for spaces, glob characters, non-ASCII paths, and renamed files. Untracked discard safety rejects symlink escapes, nested git repositories, ignored files, and the worktree root.

**Acceptance Criteria**

- ✅ Staged, unstaged, and untracked entries include accurate line stats where practical.
- ✅ Pathspec literal handling covers spaces, glob characters, non-ASCII paths, and renamed files.
- ✅ Discard safety covers symlinks, nested repos, ignored paths, and worktree-root rejection.
- ✅ Tests cover the high-risk parser and filesystem safety cases.

#### 2.3 Remote and Upstream Semantics — ✅ Implemented

Tracking: [#150](https://github.com/gannonh/pi-desktop/issues/150)

**Shipped:** Upstream status now reports an explicit relation (`none`, `up_to_date`, `ahead`, `behind`, `diverged`) and falls back to same-name `origin/<branch>` refs when branch tracking is missing. Push and pull target configured upstreams or the effective origin ref explicitly. Force-with-lease is exposed through the resolver only for diverged branches. Remote operation failures are translated into actionable messages.

**Acceptance Criteria**

- ✅ Upstream status probes same-name origin refs and handles missing configured upstreams.
- ✅ Diverged branches are classified separately from fast-forwardable sync states.
- ✅ Push can target configured upstreams and publish branches safely.
- ✅ Force-with-lease is available only when the resolver recommends it.
- ✅ Pull, sync, and rebase errors are translated into actionable messages.

### Wave 3: Git History Panel and Diff Review Improvements

Move from basic change inspection to review-grade Git navigation. This wave should help users understand both local changes and committed history without leaving Pi Desktop.

#### 3.1 Git History Panel — ✅ Implemented

Tracking: [#151](https://github.com/gannonh/pi-desktop/issues/151)

**Shipped:** `src/main/git/history.ts` adds `getHistory` and `getCommitFiles`. `GitHistoryPanel` in the Changes panel lists recent commits with refs, incoming/outgoing boundaries, changed-file drill-down, and commit diff opening via the shared file-workspace tab model.

**Acceptance Criteria**

- ✅ History shows recent commits with author, date, short SHA, subject, and refs.
- ✅ Incoming and outgoing boundaries are represented when upstream data exists.
- ✅ Selecting a commit opens a read-only commit diff in the file workspace.
- ✅ Refresh, loading, and error states are visible.

#### 3.2 Diff Review UX — ✅ Implemented

Tracking: [#152](https://github.com/gannonh/pi-desktop/issues/152)

**Shipped:** `diff-viewer.tsx` and `diff-tab-label.ts` add structured diff metadata, empty/binary/unsupported states, and consistent tab labels for working-tree, branch-compare, and commit diffs.

**Acceptance Criteria**

- ✅ Diff tabs preserve file context, diff kind, and compare refs in the title and metadata.
- ✅ Large, binary, unsupported, and empty diffs have clear states.
- ✅ Commit and branch diff opening use the same tab model.
- ✅ Optional source links or comment affordances are scoped in a follow-up design before implementation.

### Wave 4: AI Generation and Commit Failure Recovery

Add Pi-assisted workflows where Git operations benefit from agent context. This wave should keep Pi as the source of AI behavior while matching Orca's recovery and drafting affordances.

#### 4.1 AI Commit and PR Generation — ✅ Implemented

Tracking: [#153](https://github.com/gannonh/pi-desktop/issues/153)

**Shipped:** Source-control generation now gathers staged diff or branch-compare context in the main process, builds bounded prompts, and uses a Pi-owned text generation boundary. The Changes panel Generate actions draft commit messages and PR title/body fields with loading, cancel, success, and error states. PR generation avoids same-branch tracking refs as the default base and falls back to `main` until Wave 5 adds configurable base refs. Renderer IPC receives only generated text fields.

**Acceptance Criteria**

- ✅ Commit-message generation can draft from staged diff context.
- ✅ PR title/body generation can draft from branch compare context.
- ✅ Generation has loading, cancel, success, and error states.
- ✅ No provider secrets are exposed to renderer state.

#### 4.2 Commit Failure Recovery — ✅ Implemented

Tracking: [#154](https://github.com/gannonh/pi-desktop/issues/154)

**Shipped:** Failed commits open a recovery dialog with a concise summary, expandable raw Git output, dismiss action, and Recover with Pi action. Recovery chooses the relevant project chat, starts or resumes a Pi session, and submits a prompt containing the commit message, staged files, original failure output, and requested validation.

**Acceptance Criteria**

- ✅ Commit failures show a concise summary and expandable details.
- ✅ A recovery action opens or resumes the relevant Pi project session.
- ✅ The prompt includes failure output, changed files, and requested validation.
- ✅ The user can still dismiss the dialog without launching Pi.

### Wave 5: Hosted Review, Git Settings, and Runtime/Worktree Decisions

Decide which broader Orca Git surfaces belong in Pi Desktop. This wave should avoid accidental scope creep by recording product boundaries before implementation.

#### 5.1 Hosted Review Depth — ✅ Implemented

Tracking: [#155](https://github.com/gannonh/pi-desktop/issues/155)

**Shipped:** Linked GitHub PR summary in Changes (`LinkedPullRequestSummary`, header state badge), `gh` auth status probe, actionable errors, and `app.openExternal` for Open in Browser. Deferred scope in [2026-06-10-hosted-review-deferred.md](./2026-06-10-hosted-review-deferred.md).

**Acceptance Criteria**

- ✅ Linked GitHub PR state is shown consistently in Changes or a dedicated review tab.
- ✅ PR checks, comments, and merge actions are either implemented or explicitly deferred in a follow-up spec.
- ✅ GitLab support remains documented as out of scope unless the milestone adopts it.
- ✅ Authentication and CLI prerequisite failures are visible and actionable.

#### 5.2 Git Settings Surface — ✅ Implemented

Tracking: [#156](https://github.com/gannonh/pi-desktop/issues/156)

**Shipped:** Per-project `gitSettings.defaultBaseRef` in the project store, Changes panel Git settings dialog, and wiring into compare/rebase/PR ref resolution. Documented in [2026-06-10-git-settings.md](./2026-06-10-git-settings.md).

**Acceptance Criteria**

- ✅ Users can inspect or configure the default base ref used by compare/rebase flows.
- ✅ GitHub attribution and auth-related settings are either implemented or explicitly deferred.
- ✅ Settings changes affect source-control operations without restarting the app.
- ✅ Settings are documented without duplicating README setup instructions.

#### 5.3 Runtime and Worktree Scope — ✅ Boundary recorded

Tracking: [#157](https://github.com/gannonh/pi-desktop/issues/157)

**Shipped:** [ADR 0005: Source-control worktree and runtime scope](../adr/0005-source-control-worktree-scope.md) records selected-project-only boundaries for the current milestone. Follow-up revisit triggers live in [2026-06-10-worktree-scope-followups.md](./2026-06-10-worktree-scope-followups.md). No product implementation in this wave.

**Gap (resolved for current milestone):** Pi Desktop is single selected local project only; Orca supports multi-worktree, SSH/runtime contexts, WSL fallbacks, worktree cleanup, and branch management. ADR 0005 defers Orca porting until a future milestone with explicit UX ownership.

**Goal:** Decide which runtime/worktree concepts belong in Pi Desktop before porting any of Orca's broader machinery.

**Acceptance Criteria**

- ✅ [ADR 0005](../adr/0005-source-control-worktree-scope.md) states Pi Desktop does **not** adopt multi-worktree Git UX in the current milestone.
- ✅ SSH/runtime Git operations remain out of scope until cloud/runtime milestones adopt them.
- ✅ Branch rename/delete/worktree cleanup are not added without selected-project UX ownership.
- ✅ Existing selected-project Changes behavior stays simple and predictable.

## Verification Notes

Each roadmap item should include focused unit tests for pure logic, main-process temp-repo tests for Git behavior, renderer tests for visible UI states, and at least one Electron UAT path before sign-off.

Remote-workflow milestones should add deterministic e2e coverage using temporary repositories and local bare remotes. Track this under [#159](https://github.com/gannonh/pi-desktop/issues/159). The minimum matrix should cover clean state, unstaged/staged/commit flow, ahead-only `Push`, behind-only fast-forward `Pull`, diverged ahead-and-behind reconcile state, no-upstream `Publish`, destructive discard confirmations, and PR creation with only the `gh` boundary mocked.

The Changes panel should also make the active project path and branch explicit enough to avoid mutating the wrong checkout. Track that UAT gap under [#158](https://github.com/gannonh/pi-desktop/issues/158).
