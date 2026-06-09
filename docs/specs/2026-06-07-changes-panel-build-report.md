# Changes panel — Build completion report

## Spec

`docs/specs/2026-06-07-changes-panel-design.md`

## SHAs

- Base: `156d85e601e11c69db17c12b3d91a502def6bb96`
- Phase 1-2 checkpoint: `f88b4090f5c0d5231f9aa8bbf4d7d8a02c37d601`
- Head (M07C): `feat/issue-144-m07c-changes-panel` branch head at initial build completion
- Wave 1 follow-up: `99a6cfa8a33b49bb377d4be11276e8ee5446052c` on `wave1` ([PR #160](https://github.com/gannonh/pi-desktop/pull/160))

## Phases completed

| Phase | Status | Notes |
|---|---|---|
| 1 — Git foundation | Done | `src/main/git/*`, RPC schemas, path guard, getStatus + stage/unstage/discard + bulk + checkIgnored + initializeRepository |
| 2 — Changes shell | Done | Kind rename `diffs` → `changes`, live `ChangesPanel`, tree sections, refresh + polling, empty/error/not-a-repo states |
| 3 — Commit workflow | Done | Commit textarea, commit RPC, success and visible failure feedback, draft reset after successful commit |
| 4 — Remote workflow | Done | Upstream status, fetch, pull, push, sync, fast-forward, publish, and rebase RPC/UI actions |
| 5 — Diff tabs | Done | `getDiff` RPC, `FileDiffTab` union, read-only unified diff rendering, binary/too-large states |
| 6 — Branch compare | Done | Compare controls, compare metadata, branch diff opening into file workspace diff tabs |
| 7 — Create PR (GitHub) | Done | GitHub-only `gh pr create` / `gh pr view` main-process path and Changes create/link UI |
| 8 — AI + conflicts + polish | Done with scoped caveat | Conflict badges and abort actions implemented. AI generation controls show visible prerequisite errors until the Pi one-shot generation adapter is adopted. |

## Key files added/changed

- `src/main/git/` — runner, repo, status, diff, commit, remote, branch compare, conflict abort, GitHub PR helpers
- `src/main/source-control/source-control-service.ts` — guarded project-root source-control service
- `src/shared/source-control/` — typed source-control schemas and payload types
- `src/shared/app-transport.ts`, `src/shared/ipc.ts`, `src/shared/preload-api.ts`, `src/preload/index.ts`, `src/main/app-backend.ts` — source-control RPC transport
- `src/renderer/changes-panel/` — live Changes UI, commit area, remote actions, compare, PR creation, status tree
- `src/renderer/file-workspace/` — `FileEditorTab | FileDiffTab` model and read-only diff viewer
- `src/renderer/right-panel/` — `changes` kind rename and body routing
- Tests: `tests/main/source-control-*.test.ts`, `tests/renderer/changes-panel.test.tsx`, `tests/renderer/file-workspace-state.test.ts`

## Verification run

- `pnpm format:check` — pass
- `pnpm lint` — pass
- `pnpm exec tsc --noEmit` — pass
- Focused `vitest run` for source-control git/service/backend, Changes panel, and file workspace state — pass
- `pnpm check` — pass; includes coverage at 80.03% branch coverage, Electron package build, and 9 Playwright smoke tests

## Review gates

- TDD: used for new git/service tests, diff-tab state tests, and Changes panel renderer tests (RED → GREEN).
- Spec compliance: implemented the requested source-control operations and renderer surfaces for AC 1-12, with the AI-generation caveat below.
- Code quality: single-agent self-review. Independent subagent review was unavailable because the exposed subagent tool requires explicit user delegation.
- User override: Build continued from spec marked Draft per explicit `/plan-build-verify build` directive in the active goal.

## Approved deviations and caveats

- `initializeRepository` RPC was added during Phase 2 to support the non-git empty state decision.
- Web preview source-control remains unavailable by design per the spec; the mock API exposes typed unavailable methods only.
- AI commit message and PR field controls surface visible prerequisite errors instead of invoking a Pi one-shot adapter. This satisfies the visible-error branch of AC 8 but is not a full Pi generation path.
- Remote and PR operations depend on local `git`/`gh` availability and repository auth state; failures are returned visibly through the existing source-control error path.

## Wave 1 follow-up (Orca Git parity §1.1–1.2)

Shipped on `wave1` per `docs/specs/2026-06-08-orca-git-parity-roadmap.md`:

| Item | Status | Notes |
|---|---|---|
| Primary action resolver | Done | `source-control-primary-action-resolver.ts`; `ChangesPanel` dynamic primary + dropdown with disabled reasons |
| Diverged-branch sync guard | Done | `syncRemote` rejects ahead+behind; resolver promotes rebase over one-click Sync |
| Destructive discard confirmations | Done | Type-specific `AlertDialog` copy for single and bulk discard |
| Tests | Done | `tests/renderer/source-control-primary-action-resolver.test.ts`, extended `changes-panel.test.tsx`, `tests/main/source-control-git.test.ts` |

## Known follow-ups

- Replace visible AI prerequisite errors with the planned main-process Pi one-shot generation adapter.
- Add manual UAT evidence against a real authenticated GitHub remote before release signoff.
- Continue Orca Git parity from Wave 2 onward (`docs/specs/2026-06-08-orca-git-parity-roadmap.md`).

## Transition

M07C build implementation is complete enough to enter Verify. Wave 1 primary-action and discard-confirmation follow-up shipped on `wave1`. Full `pnpm check` passed on both milestones; final signoff still requires acceptance evidence review against the criteria above.
