# Slash-command mapping matrix

**Milestone:** M003 — CLI Slash-Command Mapping and Affordance Parity  
**Slice:** S009 — Command inventory and mapping baseline; S010 — Composer command palette shell; S011–S014 — Family command mapping; S015 — Gap closure consolidation  
**Requirements:** COMMANDS-MAP-01 (`MAP-01`), COMMANDS-OUTCOME-01 (`OUTCOME-01`), COMMANDS-DECISION-01 (`DECISION-01`)  
**Inventory:** [2026-06-02-slash-command-inventory.md](./2026-06-02-slash-command-inventory.md)  
**Coverage parent:** [2026-05-25-cli-parity-coverage-matrix.md](./2026-05-25-cli-parity-coverage-matrix.md) (CLI-COMMANDS-007)

## Purpose

Authoritative mapping of each built-in Pi CLI slash command to a Desktop disposition, palette registration metadata, and evidence paths. S015 consolidated family-slice outcomes (S011–S014) into final dispositions for all 21 built-in commands.

## Matrix schema

| Column | Required | Description |
| --- | --- | --- |
| **CLI command** | Yes | Slash command as typed in Pi TUI (e.g. `/model`). |
| **Description** | Yes | Short user-facing summary (from builtin registry). |
| **Disposition** | Yes | One of: `palette entry`, `existing UI`, `deferred`, `out-of-scope`. |
| **Palette section** | When disposition is `palette entry` or `deferred` | M003 family: `Session`, `Config`, `Output`, or `Meta/Skills`. |
| **Palette entry ID** | When disposition is `palette entry` or `deferred` | Stable slug for palette registry (e.g. `session.new`). |
| **Additional evidence** | No | Repo path only when not covered by [§ Family evidence index](#family-evidence-index) (e.g. `App.tsx`, composer model picker). |
| **M002/M003 notes** | No | Blockers, wiring, or slice ownership; deferral UX may apply under `palette entry` or `deferred`. |

Disposition values map to M001 coverage vocabulary: `deferred` / `out-of-scope` here align with **Deferred** / **Out of scope** in the [coverage matrix](./2026-05-25-cli-parity-coverage-matrix.md#classification-vocabulary).

### Disposition definitions

`palette entry` — wired palette handler (including notice-only deferrals). `existing UI` — equivalent GUI outside the palette registry. `deferred` — later milestone; palette shows a visible deferral notice. `out-of-scope` — not targeted for Desktop parity (e.g. `/quit` via OS/window close).

### Palette sections (M003 families)

| Section | Typical commands |
| --- | --- |
| **Session** | Lifecycle, tree, fork/clone, compact, import/resume |
| **Config** | Auth, model, scoped models, settings |
| **Output** | Copy, export, share |
| **Meta/Skills** | Help surfaces, changelog, resource reload, app exit |

## Family evidence index

| Section | Primary evidence |
| --- | --- |
| **Session** | `src/renderer/chat/session-command-palette.ts` |
| **Config** | `src/renderer/chat/config-command-palette-entries.ts` |
| **Output** | `src/renderer/chat/output-command-palette.ts` |
| **Meta/Skills** | `src/renderer/chat/meta-command-palette-entries.ts` |

Wired Session and Output handlers also use `src/renderer/App.tsx`. Exceptions: `/model` → `src/renderer/components/composer-model-selector.tsx`; `/name` → `src/renderer/components/project-sidebar.tsx`.

## Mapping matrix (built-in commands)

| CLI command | Description | Disposition | Palette section | Palette entry ID | Additional evidence | M002/M003 notes |
| --- | --- | --- | --- | --- | --- | --- |
| `/changelog` | Show changelog entries | `deferred` | Meta/Skills | `meta.changelog` | — | Defer; in-app changelog (S014) |
| `/clone` | Duplicate session at current position | `palette entry` | Session | `session.clone` | `src/renderer/App.tsx` | Wired via `chat.clone` when session file present (S011) |
| `/compact` | Manually compact session context | `deferred` | Session | `session.compact` | — | Defer; `piSession.compact` IPC (S011) |
| `/copy` | Copy last agent message | `palette entry` | Output | `output.copy` | `src/renderer/App.tsx` | Last assistant message via clipboard IPC (S013) |
| `/export` | Export session to HTML/JSONL | `deferred` | Output | `output.export` | — | Defer; export IPC (S013) |
| `/fork` | Fork from previous user message | `palette entry` | Session | `session.fork` | `src/renderer/App.tsx` | Wired via `chat.fork` when session file present (S011) |
| `/hotkeys` | Show all keyboard shortcuts | `deferred` | Meta/Skills | `meta.hotkeys` | — | Defer; keybindings reference (S014) |
| `/import` | Import session from JSONL | `deferred` | Session | `session.import` | — | See § Cross-family ownership; defer JSONL import IPC (S011) |
| `/login` | Configure provider auth | `palette entry` | Config | `config.login` | — | Notice until Settings/Auth; secrets in main (S012) |
| `/logout` | Remove provider auth | `palette entry` | Config | `config.logout` | — | Notice until Settings/Auth (S012) |
| `/model` | Select model | `existing UI` | Config | `config.model` | `src/renderer/components/composer-model-selector.tsx` | Composer model picker; palette opens picker (S012) |
| `/name` | Set session display name | `palette entry` | Session | `session.name` | `src/renderer/components/project-sidebar.tsx` | Inline rename for selected chat (S011) |
| `/new` | Start a new session | `palette entry` | Session | `session.new` | `src/renderer/App.tsx` | `chat.create` / `chat.createStandalone` (S011) |
| `/quit` | Quit pi | `out-of-scope` | Meta/Skills | `meta.quit` | — | OS/window close; palette explains (S014) |
| `/reload` | Reload resources | `deferred` | Meta/Skills | `meta.reload` | — | See § Cross-family ownership (S012/S014) |
| `/resume` | Resume a different session | `palette entry` | Session | `session.resume` | `src/renderer/App.tsx` | Sidebar chat selection guidance (S011) |
| `/scoped-models` | Scoped model cycling set | `deferred` | Config | `config.scoped-models` | — | Defer; Ctrl+P cycling (S012) |
| `/session` | Show session info and stats | `palette entry` | Session | `session.info` | `src/renderer/App.tsx` | Chat metadata in project status (S011) |
| `/settings` | Open settings menu | `deferred` | Config | `config.settings` | — | Defer; Settings shell (S012) |
| `/share` | Share session via gist | `deferred` | Output | `output.share` | — | Defer; gist share IPC (S013) |
| `/tree` | Navigate session tree | `deferred` | Session | `session.tree` | — | Defer; session tree UI (S011) |

## Summary counts

| Metric | Count |
| --- | ---: |
| **Total built-in commands** | 21 |
| **`palette entry`** | 9 |
| **`existing UI`** | 1 |
| **`deferred`** | 10 |
| **`out-of-scope`** | 1 |
| **Commands in Session section** | 9 |
| **Commands in Config section** | 5 |
| **Commands in Output section** | 3 |
| **Commands in Meta/Skills section** | 4 |

Section counts reflect palette **section** assignment, not wired vs deferred. Inventory total (21) matches [2026-06-02-slash-command-inventory.md](./2026-06-02-slash-command-inventory.md).

## Cross-family ownership decisions (S015)

| Command | Decision | Rationale |
| --- | --- | --- |
| `/import` | Session family (`session.import`) | JSONL import is a session lifecycle action; S011 owns disposition and deferral |
| `/compact` | Session family (`session.compact`) | Context compaction is session-scoped; S011 owns disposition and deferral |
| `/reload` | Meta/Skills palette entry (`meta.reload`) | S012 classified as Config-family deferral; S014 registers the palette entry under Meta/Skills. Implementation deferred until extensibility milestone; no `config.reload` palette registration |

## Carry-forward and out-of-scope (not in built-in matrix)

| Surface | Disposition | Destination scope | Rationale |
| --- | --- | --- | --- |
| `@` mentions | Deferred | Later composer UX milestone | Not a slash command; composer hint documents planned support |
| Prompt templates (`/<name>`) | Deferred | M0X Extensibility | Runtime-discovered; not fixed built-in rows |
| Extension commands | Deferred | M0X Extensibility | Runtime-discovered via `extensionRunner` |
| Skills (`/skill:<name>`) | Deferred | M0X Extensibility | Runtime-discovered when `enableSkillCommands` is on |
| `!` / `!!` bash shortcuts | Deferred | M07D Terminal and Command Output | Terminal-specific; see CLI-BASH-010 |
| `/debug`, easter eggs | Out of scope | — | Not user-facing builtins per S009 exclusion criteria |

## Implementation evidence by slice

| Slice | Evidence (beyond [family index](#family-evidence-index)) |
| --- | --- |
| **S010** | `command-palette-registry.ts`, `command-palette-state.ts`, `use-composer-command-palette.ts`, `command-palette-popover.tsx`, `composer.tsx` — palette shell and `/` trigger |
| **S011** | `build-command-palette-entries.ts` merges session entries with default section entries; `App.tsx` wires lifecycle handlers; `project-sidebar.tsx` for `/name` |
| **S012** | Config entries and model-picker handler; `/reload` not under Config (see § Cross-family ownership) |
| **S013** | `last-assistant-message.ts` for `/copy`; `App.tsx` clipboard wiring |
| **S014** | Meta/Skills `showNotice` handlers; `meta.reload` palette ownership |
