# ADR 0005: Source-control worktree and runtime scope

## Status

Accepted

## Context

Pi Desktop anchors filesystem, git, and Pi session work to a **single selected project** (`ProjectRecord.path`). The Changes panel (`docs/specs/2026-06-07-changes-panel-design.md`) already scopes all source-control operations to that checkout with path guards and no multi-worktree polling.

Orca's Git surface is broader. It tracks multiple worktrees per repository, runs git against SSH/runtime contexts (`connectionId`), applies WSL fallbacks, exposes worktree cleanup flows, and surfaces branch rename/delete affordances across worktree state.

Wave 5.3 ([#157](https://github.com/gannonh/pi-desktop/issues/157)) exists to record product boundaries before any Orca worktree or runtime machinery is ported. The high-level roadmap still lists worktrees under a future **M0X: Worktrees and Git UX** milestone (`docs/pi-desktop-high-level-roadmap.md`); that milestone is not the current Orca Git parity track.

## Decision

Pi Desktop keeps **selected-project-only** source control for the current milestone wave. Broader Orca worktree and runtime git concepts stay out of scope until a future milestone explicitly adopts them with UX ownership.

1. **No multi-worktree Git UX in the current milestone**
   - Do not adopt Orca's multi-worktree sidebar, per-worktree status polling, or worktree switcher.
   - Git identity in product code remains `projectId` + guarded `projectPath`, not Orca's `worktreePath` registry.
   - One selected project maps to one local checkout; users who need parallel branches use separate project entries or external git workflows.

2. **SSH and runtime git operations remain out of scope**
   - Do not port Orca `connectionId` git paths, remote-runtime checkout operations, or SSH-backed status/commit flows.
   - Revisit only when cloud workspace or remote-runtime milestones define authentication, path authority, and failure surfaces for non-local checkouts.

3. **Branch rename, branch delete, and worktree cleanup are deferred**
   - Do not add these operations from Orca without a selected-project UX design that states ownership, confirmation copy, and failure recovery.
   - Existing branch create/checkout/compare flows in Changes stay as-is; destructive branch lifecycle actions are not implied by current parity work.

4. **Keep selected-project Changes behavior simple and predictable**
   - Preserve the existing model: manual refresh and polling while Changes is active, single checkout, path confinement, and resolver-driven primary actions.
   - Do not add worktree-root rejection semantics beyond what already protects the selected project root.
   - Future complexity (extra worktrees, runtime git, branch lifecycle) requires a dedicated spec and milestone pull-forward, not incremental Orca porting.

## Consequences

- Wave 5.1 hosted review and Wave 5.2 git settings can proceed without worktree/runtime dependencies.
- Implementation must not introduce `worktreePath` registries, multi-checkout polling, or SSH git IPC "for parity."
- The **M0X: Worktrees and Git UX** roadmap item remains the natural home for any future multi-worktree product work; it is not superseded by this ADR but is explicitly deferred from the Orca Git parity waves.
- Revisit triggers are recorded in `docs/specs/2026-06-10-worktree-scope-followups.md`.

## References

- Changes panel constraints: `docs/specs/2026-06-07-changes-panel-design.md`
- Orca Git parity roadmap Wave 5.3: `docs/specs/2026-06-08-orca-git-parity-roadmap.md`
- Tracking issue: [#157](https://github.com/gannonh/pi-desktop/issues/157)
