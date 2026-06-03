# Slash-command mapping matrix

**Milestone:** M003 — CLI Slash-Command Mapping and Affordance Parity  
**Slice:** S009 — Command inventory and mapping baseline; S010 — Composer command palette shell; S011–S014 — Family command mapping; S015 — Gap closure consolidation  
**Requirements:** COMMANDS-MAP-01 (`MAP-01`), COMMANDS-OUTCOME-01 (`OUTCOME-01`), COMMANDS-DECISION-01 (`DECISION-01`)  
**Inventory:** [2026-06-02-slash-command-inventory.md](./2026-06-02-slash-command-inventory.md)  
**Coverage parent:** [2026-05-25-cli-parity-coverage-matrix.md](./2026-05-25-cli-parity-coverage-matrix.md) (CLI-COMMANDS-007)

## Purpose

Authoritative mapping of each built-in Pi CLI slash command to a Desktop disposition, palette registration metadata, and evidence paths. S015 consolidated family-slice outcomes (S011–S014) into final dispositions for all 21 built-in commands.

> **Implementation status (2026-06-03):** Mapping and dispositions are final. S011–S014 palette wiring is integrated on branch `cursor/m003-palette-integration-cdb1`; merge to `main` closes M003 implementation.

## Matrix schema

| Column | Required | Description |
| --- | --- | --- |
| **CLI command** | Yes | Slash command as typed in Pi TUI (e.g. `/model`). |
| **Description** | Yes | Short user-facing summary (from builtin registry). |
| **Disposition** | Yes | One of: `palette entry`, `existing UI`, `deferred`, `out-of-scope` (capability status; see rules below). |
| **Palette UX** | Yes | `action` — handler mutates Desktop state or opens wired UI; `notice` — palette shows a deferral or guidance notice only; `n/a` — not registered in the palette. |
| **Palette section** | When palette UX is `action` or `notice` | M003 family: `Session`, `Config`, `Output`, or `Meta/Skills`. |
| **Palette entry ID** | When palette UX is `action` or `notice` | Stable slug for palette registry (e.g. `session.new`). |
| **Additional evidence** | No | Repo path only when not covered by [§ Family evidence index](#family-evidence-index) (e.g. `App.tsx`, composer model picker). |
| **M002/M003 notes** | No | Blockers, wiring, or slice ownership. |

Disposition values map to M001 coverage vocabulary: `deferred` / `out-of-scope` here align with **Deferred** / **Out of scope** in the [coverage matrix](./2026-05-25-cli-parity-coverage-matrix.md#classification-vocabulary).

### Disposition definitions

Apply these rules in order:

| Disposition | Rule |
| --- | --- |
| `palette entry` | Palette UX is `action`: handler performs Desktop work (IPC, navigation, clipboard, or opens wired UI such as the model picker). |
| `existing UI` | Primary affordance is outside the palette; palette may still register an alias (`action`) for discoverability (e.g. `/model`). |
| `deferred` | Capability is a later milestone; palette UX is `notice` when a row is registered. |
| `out-of-scope` | Not targeted for Desktop parity; palette UX may be `notice` to explain the equivalent (e.g. `/quit` → window close). |

`deferred` rows are often still registered in the palette; disposition describes **capability** status, not whether a palette row exists.

### Palette sections (M003 families)

| Section | Typical commands |
| --- | --- |
| **Session** | Lifecycle, tree, fork/clone, compact, import/resume |
| **Config** | Auth, model, scoped models, settings |
| **Output** | Copy, export, share |
| **Meta/Skills** | Help surfaces, changelog, resource reload, app exit |

## Family evidence index

Paths below are introduced by S011–S014 (not on `main` until that stack merges). S010 shell: `command-palette-registry.ts`, `command-palette-state.ts`, `use-composer-command-palette.ts`, `command-palette-popover.tsx`, `composer.tsx`.

| Section | Primary evidence | Slice |
| --- | --- | --- |
| **Session** | `src/renderer/chat/session-command-palette.ts`, `build-command-palette-entries.ts` | S011 |
| **Config** | `src/renderer/chat/config-command-palette-entries.ts` | S012 |
| **Output** | `src/renderer/chat/output-command-palette.ts`, `last-assistant-message.ts` | S013 |
| **Meta/Skills** | `src/renderer/chat/meta-command-palette-entries.ts` | S014 |

Wired Session and Output handlers also use `src/renderer/App.tsx`. Exceptions: `/model` → `src/renderer/components/composer-model-selector.tsx`; `/name` → `src/renderer/components/project-sidebar.tsx`. `/reload` is registered only under Meta/Skills (`meta.reload`); see [§ Cross-family ownership](#cross-family-ownership-decisions-s015).

## Mapping matrix (built-in commands)

| CLI command | Description | Disposition | Palette UX | Palette section | Palette entry ID | Additional evidence | M002/M003 notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/changelog` | Show changelog entries | `deferred` | notice | Meta/Skills | `meta.changelog` | — | Defer; in-app changelog (S014) |
| `/clone` | Duplicate session at current position | `palette entry` | action | Session | `session.clone` | `src/renderer/App.tsx` | Wired via `chat.clone` when session file present (S011) |
| `/compact` | Manually compact session context | `deferred` | notice | Session | `session.compact` | — | Defer; `piSession.compact` IPC (S011) |
| `/copy` | Copy last agent message | `palette entry` | action | Output | `output.copy` | `src/renderer/App.tsx` | Last assistant message via clipboard IPC (S013) |
| `/export` | Export session to HTML/JSONL | `deferred` | notice | Output | `output.export` | — | Defer; export IPC (S013) |
| `/fork` | Fork from previous user message | `palette entry` | action | Session | `session.fork` | `src/renderer/App.tsx` | Wired via `chat.fork` when session file present (S011) |
| `/hotkeys` | Show all keyboard shortcuts | `deferred` | notice | Meta/Skills | `meta.hotkeys` | — | Defer; keybindings reference (S014) |
| `/import` | Import session from JSONL | `deferred` | notice | Session | `session.import` | — | See § Cross-family ownership; defer JSONL import IPC (S011) |
| `/login` | Configure provider auth | `deferred` | notice | Config | `config.login` | — | Defer; Settings/Auth; secrets in main (S012) |
| `/logout` | Remove provider auth | `deferred` | notice | Config | `config.logout` | — | Defer; Settings/Auth (S012) |
| `/model` | Select model | `existing UI` | action | Config | `config.model` | `src/renderer/components/composer-model-selector.tsx` | Composer model picker; palette alias opens picker (S012) |
| `/name` | Set session display name | `palette entry` | action | Session | `session.name` | `src/renderer/components/project-sidebar.tsx` | Inline rename for selected chat (S011) |
| `/new` | Start a new session | `palette entry` | action | Session | `session.new` | `src/renderer/App.tsx` | `chat.create` / `chat.createStandalone` (S011) |
| `/quit` | Quit pi | `out-of-scope` | notice | Meta/Skills | `meta.quit` | — | OS/window close; palette explains (S014) |
| `/reload` | Reload resources | `deferred` | notice | Meta/Skills | `meta.reload` | — | Meta/Skills owns `meta.reload`; see § Cross-family ownership |
| `/resume` | Resume a different session | `deferred` | notice | Session | `session.resume` | — | Sidebar chat selection guidance (S011) |
| `/scoped-models` | Scoped model cycling set | `deferred` | notice | Config | `config.scoped-models` | — | Defer; Ctrl+P cycling (S012) |
| `/session` | Show session info and stats | `palette entry` | action | Session | `session.info` | `src/renderer/App.tsx` | Chat metadata in project status (S011) |
| `/settings` | Open settings menu | `deferred` | notice | Config | `config.settings` | — | Defer; Settings shell (S012) |
| `/share` | Share session via gist | `deferred` | notice | Output | `output.share` | — | Defer; gist share IPC (S013) |
| `/tree` | Navigate session tree | `deferred` | notice | Session | `session.tree` | — | Defer; session tree UI (S011) |

## Summary counts

| Metric | Count |
| --- | ---: |
| **Total built-in commands** | 21 |
| **`palette entry` (capability wired)** | 6 |
| **`existing UI`** | 1 |
| **`deferred`** | 13 |
| **`out-of-scope`** | 1 |
| **Palette UX `action`** | 7 |
| **Palette UX `notice`** | 14 |
| **Commands in Session section** | 9 |
| **Commands in Config section** | 5 |
| **Commands in Output section** | 3 |
| **Commands in Meta/Skills section** | 4 |

Disposition counts describe **capability** status. Palette UX counts describe handler behavior (`action` includes `/model` palette alias). Section counts reflect palette **section** assignment. Inventory total (21) matches [2026-06-02-slash-command-inventory.md](./2026-06-02-slash-command-inventory.md).

## Cross-family ownership decisions (S015)

| Command | Decision | Rationale |
| --- | --- | --- |
| `/import` | Session family (`session.import`) | JSONL import is a session lifecycle action; S011 owns disposition and deferral |
| `/compact` | Session family (`session.compact`) | Context compaction is session-scoped; S011 owns disposition and deferral |
| `/reload` | Meta/Skills only (`meta.reload`) | Config-family deferral in S012; S014 registers under Meta/Skills. No `config.reload` row; implementation deferred until extensibility milestone |

## Carry-forward and out-of-scope (not in built-in matrix)

| Surface | Disposition | Destination scope | Rationale |
| --- | --- | --- | --- |
| `@` mentions | Deferred | Later composer UX milestone | Not a slash command; composer hint documents planned support |
| Prompt templates (`/<name>`) | Deferred | M0X Extensibility | Runtime-discovered; not fixed built-in rows |
| Extension commands | Deferred | M0X Extensibility | Runtime-discovered via `extensionRunner` |
| Skills (`/skill:<name>`) | Deferred | M0X Extensibility | Runtime-discovered when `enableSkillCommands` is on |
| `!` / `!!` bash shortcuts | Deferred | M07D Terminal and Command Output | Terminal-specific; see CLI-BASH-010 |
| `/debug`, easter eggs | Out of scope | — | Not user-facing builtins per S009 exclusion criteria |
