# Orca Git Parity Roadmap

## Status

Proposed follow-up roadmap after M07C Changes panel implementation.

## Context

Pi Desktop now has a live local Changes panel with status, stage/unstage/discard, commit, basic remote operations, branch compare, unified diff tabs, and GitHub PR creation. Orca's Git implementation remains broader: it combines mature source-control state machines, hosted review workflows, history, conflict handling, runtime-aware Git operations, and settings.

This roadmap lists the remaining high-level gaps. Each item is intentionally short so future milestone planning can split it into executable specs.

## Scope

- Compare Pi Desktop's current `feat/issue-144-m07c-changes-panel` implementation against Orca's Git and Source Control surfaces.
- Keep Pi Desktop focused on local desktop UX and selected-project source control.
- Treat GitLab, SSH/runtime worktrees, and PR review/checks as larger follow-up tracks unless explicitly pulled forward.

## Roadmap

### 1. Primary Action State Machine

**Gap:** Pi Desktop uses simple commit, stage-all, and menu actions; Orca has tested priority logic for commit, stage, push, pull, sync, publish, create PR, busy states, and disabled reasons.

**Goal:** Port an Orca-equivalent primary/dropdown action resolver adapted to `projectId` and Pi Desktop's local project model.

**Acceptance Criteria**

- Primary action changes based on staged changes, unstaged changes, message state, upstream state, PR state, and conflicts.
- Dropdown exposes stable rows for commit variants, remote operations, publish, rebase, fetch, and create PR.
- Disabled actions show concise reasons and have unit coverage for priority order.

### 2. Destructive Confirmation Flow

**Gap:** Pi Desktop discard actions execute directly; Orca confirms destructive paths with copy specific to delete, restore, discard, and discard-all operations.

**Goal:** Add confirmation dialogs for single-file and bulk discard operations.

**Acceptance Criteria**

- Untracked and newly-added files use delete-focused copy.
- Deleted tracked files use restore-focused copy.
- Bulk discard copy includes affected count and area.
- Confirm/cancel behavior is covered by renderer tests.

### 3. Conflict Rows and Resolution State

**Gap:** Pi Desktop detects merge/rebase/cherry-pick operations and can abort, but does not parse unmerged entries or show conflict kinds per file.

**Goal:** Surface conflict rows with Orca-style conflict metadata and operation status.

**Acceptance Criteria**

- `git status --porcelain=v2` unmerged entries are parsed into typed conflict rows.
- Conflict kind and compatibility status are shown in the Changes tree.
- Merge, rebase, and cherry-pick conflict states stay visible while active.
- Abort operations refresh status and preserve visible failure feedback.

### 4. Remote and Upstream Semantics

**Gap:** Pi Desktop remote operations use basic Git commands; Orca handles effective upstreams, explicit push targets, force-with-lease, PR branch remotes, and richer error classification.

**Goal:** Harden remote operations to match Orca's local-git behavior where it applies to selected projects.

**Acceptance Criteria**

- Upstream status probes same-name origin refs and handles missing configured upstreams.
- Push can target configured upstreams and publish branches safely.
- Force-with-lease is available only when the resolver recommends it.
- Pull, sync, and rebase errors are translated into actionable messages.

### 5. Git History Panel

**Gap:** Pi Desktop has branch compare but no Orca-style Git history graph.

**Goal:** Add a compact history panel for commits, refs, incoming/outgoing markers, and commit diff opening.

**Acceptance Criteria**

- History shows recent commits with author, date, short SHA, subject, and refs.
- Incoming and outgoing boundaries are represented when upstream data exists.
- Selecting a commit opens a read-only commit diff in the file workspace.
- Refresh, loading, and error states are visible.

### 6. Hosted Review Depth

**Gap:** Pi Desktop only creates or views basic GitHub PR metadata; Orca tracks hosted review state, GitHub/GitLab eligibility, checks, comments, merge, and rate limits.

**Goal:** Define and implement the next hosted-review slice after local Changes parity.

**Acceptance Criteria**

- Linked GitHub PR state is shown consistently in Changes or a dedicated review tab.
- PR checks, comments, and merge actions are either implemented or explicitly deferred in a follow-up spec.
- GitLab support remains documented as out of scope unless the milestone adopts it.
- Authentication and CLI prerequisite failures are visible and actionable.

### 7. AI Commit and PR Generation

**Gap:** Pi Desktop's Generate buttons currently show prerequisite errors; Orca supports commit-message and PR-field generation with cancellation, settings, and custom instructions.

**Goal:** Route commit-message and PR-field generation through Pi-owned one-shot generation or session flows.

**Acceptance Criteria**

- Commit-message generation can draft from staged diff context.
- PR title/body generation can draft from branch compare context.
- Generation has loading, cancel, success, and error states.
- No provider secrets are exposed to renderer state.

### 8. Commit Failure Recovery

**Gap:** Pi Desktop displays commit failures; Orca can summarize failures and launch an agent recovery prompt.

**Goal:** Add Pi-assisted recovery for failed commits without hiding the original Git error.

**Acceptance Criteria**

- Commit failures show a concise summary and expandable details.
- A recovery action opens or resumes the relevant Pi project session.
- The prompt includes failure output, changed files, and requested validation.
- The user can still dismiss the dialog without launching Pi.

### 9. Diff Review UX

**Gap:** Pi Desktop renders unified diff text; Orca has richer review affordances around preview/split opening, comments, notes, source links, and commit compare.

**Goal:** Improve diff tabs from readable output to a review workspace.

**Acceptance Criteria**

- Diff tabs preserve file context, diff kind, and compare refs in the title and metadata.
- Large, binary, unsupported, and empty diffs have clear states.
- Commit and branch diff opening use the same tab model.
- Optional source links or comment affordances are scoped in a follow-up design before implementation.

### 10. Git Settings Surface

**Gap:** Pi Desktop has no Git settings surface; Orca exposes base-ref defaults, branch prefix behavior, attribution settings, and API budget panels.

**Goal:** Add the minimum Git settings needed to support the selected-project Changes workflow.

**Acceptance Criteria**

- Users can inspect or configure the default base ref used by compare/rebase flows.
- GitHub attribution and auth-related settings are either implemented or explicitly deferred.
- Settings changes affect source-control operations without restarting the app.
- Settings are documented without duplicating README setup instructions.

### 11. Runtime and Worktree Scope

**Gap:** Pi Desktop is single selected local project only; Orca supports multi-worktree, SSH/runtime contexts, WSL fallbacks, worktree cleanup, and branch management.

**Goal:** Decide which runtime/worktree concepts belong in Pi Desktop before porting any of Orca's broader machinery.

**Acceptance Criteria**

- A follow-up ADR or spec states whether Pi Desktop adopts multi-worktree Git UX.
- SSH/runtime Git operations remain out of scope until cloud/runtime milestones adopt them.
- Branch rename/delete/worktree cleanup are not added without selected-project UX ownership.
- Existing selected-project behavior stays simple and predictable.

### 12. Status Fidelity and Edge Cases

**Gap:** Pi Desktop's status parser is functional but thinner than Orca's edge-case coverage for line stats, unmerged entries, pathspec literals, symlinks, C-quoted paths, and upstream churn.

**Goal:** Bring core parser and safety behavior up to Orca's local-git reliability level.

**Acceptance Criteria**

- Staged, unstaged, and untracked entries include accurate line stats where practical.
- Pathspec literal handling covers spaces, glob characters, non-ASCII paths, and renamed files.
- Discard safety covers symlinks, nested repos, ignored paths, and worktree-root rejection.
- Tests cover the high-risk parser and filesystem safety cases.

## Suggested Sequencing

1. Primary action state machine and destructive confirmations.
2. Conflict rows, status fidelity, and remote/upstream hardening.
3. Git history panel and diff review improvements.
4. AI generation and commit failure recovery.
5. Hosted review depth, Git settings, and any runtime/worktree expansion decisions.

## Verification Notes

Each roadmap item should include focused unit tests for pure logic, main-process temp-repo tests for Git behavior, renderer tests for visible UI states, and at least one Electron UAT path before sign-off.
