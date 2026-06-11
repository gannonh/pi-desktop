# Git settings (Wave 5.2)

## Status

Implemented on `feat/wave5-52-git-settings`.

## Scope

Per-project Git settings stored in the project store and surfaced from the Changes panel.

### Shipped

- **Default base ref** — `project.gitSettings.defaultBaseRef` (default `main`) used by branch compare, rebase-from-base defaults, and pull request compare ref resolution when upstream does not provide a distinct base.
- **Changes panel access** — Git settings button in the Changes header opens a shadcn `Dialog` to view and edit the default base ref.
- **Immediate effect** — Updates persist through `project.setGitSettings` and apply on the next compare/rebase/PR generation without restarting the app.
- **Migration** — Existing project records without `gitSettings` load with `{ defaultBaseRef: "main" }`.

### Deferred

- GitHub attribution and co-author settings
- Branch prefix behavior
- API budget / rate-limit panels
- Global (non-project) Git preferences

See [#156](https://github.com/gannonh/pi-desktop/issues/156) for acceptance criteria. README setup for `gh` auth is not duplicated here.

## Verification

- `tests/main/project-service.test.ts` — git settings persistence
- `tests/renderer/pull-request-compare-refs.test.ts` — configured base ref
- Renderer Changes panel tests — settings dialog and compare defaults
