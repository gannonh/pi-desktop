# Changes panel — Build completion report (partial)

## Spec

`docs/specs/2026-06-07-changes-panel-design.md`

## SHAs

- Base: `156d85e601e11c69db17c12b3d91a502def6bb96`
- Head: _(uncommitted work on `feat/issue-144-m07c-changes-panel`)_

## Phases completed

| Phase | Status | Notes |
|---|---|---|
| 1 — Git foundation | Done | `src/main/git/*`, RPC schemas, path guard, getStatus + stage/unstage/discard + bulk + checkIgnored + initializeRepository |
| 2 — Changes shell | Done | Kind rename `diffs` → `changes`, live `ChangesPanel`, tree sections, refresh + polling, empty/error/not-a-repo states |
| 3 — Commit workflow | Not started | |
| 4 — Remote workflow | Not started | |
| 5 — Diff tabs | Not started | |
| 6 — Branch compare | Not started | |
| 7 — Create PR (GitHub) | Not started | |
| 8 — AI + conflicts + polish | Not started | |

## Key files added/changed

- `src/main/git/` — runner, repo, status, check-ignored-paths
- `src/main/source-control/source-control-service.ts`
- `src/shared/source-control/` — types, schemas
- `src/shared/git-cquoted-path.ts`, `src/shared/git-discard-path-safety.ts`
- `src/renderer/changes-panel/` — panel shell, context, polling, tree builders
- `src/renderer/right-panel/` — kind rename, body routing
- `src/shared/app-transport.ts`, `src/shared/ipc.ts`, `src/preload/index.ts`, `src/main/app-backend.ts`
- Tests: `tests/main/source-control-*.test.ts`, `tests/renderer/changes-panel.test.tsx`

## Verification run

- `tsc --noEmit` — pass
- `pnpm lint` — pass (3 non-blocking warnings in new tree builder)
- `vitest run` (focused): source-control main tests, changes-panel renderer tests, right-panel integration — pass

## Review gates

- TDD: used for Phase 1 git/service tests and Phase 2 renderer tests (RED → GREEN)
- Spec compliance: Phases 1–2 match spec; Phases 3–8 acceptance criteria not yet met
- Code quality: single-agent self-review; independent subagent review not used
- User override: Build started from spec marked Draft per explicit `/plan-build-verify build` directive

## Approved deviations

- `initializeRepository` RPC added during Phase 2 (required by non-git empty state decision)
- Line stats on status entries deferred (Orca numstat attachment not ported in Phase 1 getStatus)
- Effective upstream probe deferred to Phase 4

## Known follow-ups

- Implement Phases 3–8 per spec ordering
- Port Orca `source-control-primary-action`, `CommitArea`, remote ops, diff tabs, PR dialog, AI generation
- Update `docs/pi-desktop-high-level-roadmap.md` M07C when Phase 2 lands on main
- Full `pnpm check` on macOS after Phases 3–8

## Transition

Build is **partial**. Verify should not claim signoff until Phases 3–8 complete and acceptance criteria 1–12 are evidenced.
