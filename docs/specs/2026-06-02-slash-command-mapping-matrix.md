# Slash-command mapping matrix

**Milestone:** M003 — CLI Slash-Command Mapping and Affordance Parity  
**Slice:** S009 — Command inventory and mapping baseline  
**Requirements:** COMMANDS-MAP-01 (`MAP-01`)  
**Inventory:** [2026-06-02-slash-command-inventory.md](./2026-06-02-slash-command-inventory.md)  
**Coverage parent:** [2026-05-25-cli-parity-coverage-matrix.md](./2026-05-25-cli-parity-coverage-matrix.md) (CLI-COMMANDS-007)

## Purpose

Schema and scaffold rows mapping each built-in Pi CLI slash command to a Desktop disposition, palette registration metadata, and evidence paths. Family slices (Planned Slices 3–6) and S010 (palette shell) fill dispositions without changing this schema.

## Matrix schema

| Column | Required | Description |
| --- | --- | --- |
| **CLI command** | Yes | Slash command as typed in Pi TUI (e.g. `/model`). |
| **Description** | Yes | Short user-facing summary (from builtin registry). |
| **Disposition** | Yes | One of: `palette entry`, `existing UI`, `deferred`, `out-of-scope`, `Pending` (initial scaffold). |
| **Palette section** | When disposition is `palette entry` or `Pending` | M003 family: `Session`, `Config`, `Output`, or `Meta/Skills`. |
| **Palette entry ID** | When disposition is `palette entry` or `Pending` | Stable slug for S010 registry (e.g. `session.new`). Kebab-case segment after family prefix. |
| **Desktop evidence path** | When known | Repo path(s) for existing UI or partial implementation. |
| **M002/M003 notes** | No | Cross-milestone context, gaps, or slice ownership. |
| **Blocked by family slice** | No | Planned Slice id when disposition cannot close until a family slice lands. |

### Disposition definitions

| Disposition | Meaning |
| --- | --- |
| `palette entry` | Primary affordance is the composer command palette (S010+). |
| `existing UI` | Desktop already exposes equivalent GUI without palette registration. |
| `deferred` | Intentionally later milestone; document rationale in notes. |
| `out-of-scope` | Not targeted for Desktop parity (e.g. terminal-only quit). |
| `Pending` | Scaffold default; family slice or S010 assigns final disposition. |

### Palette sections (M003 families)

| Section | Typical commands |
| --- | --- |
| **Session** | Lifecycle, tree, fork/clone, compact, import/resume |
| **Config** | Auth, model, scoped models, settings, reload |
| **Output** | Copy, export, share |
| **Meta/Skills** | Help surfaces, changelog, app exit |

### Example rows (one per disposition type)

| CLI command | Description | Disposition | Palette section | Palette entry ID | Desktop evidence path | M002/M003 notes | Blocked by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/new` | Start a new session | `palette entry` | Session | `session.new` | — | Example: palette-first session affordance | S010 |
| `/model` | Select model | `existing UI` | Config | `config.model` | `src/renderer/components/composer-model-selector.tsx` | Example: composer model picker already ships | — |
| `/hotkeys` | Show keyboard shortcuts | `deferred` | Meta/Skills | `meta.hotkeys` | — | Example: defer until Desktop keybindings milestone | — |
| `/quit` | Quit pi | `out-of-scope` | Meta/Skills | `meta.quit` | — | Example: use OS/window close, not palette | — |

## Mapping matrix (built-in commands)

Disposition is **`Pending`** until a family slice or S010 updates it. Palette columns are pre-filled for stable S010 registration.

| CLI command | Description | Disposition | Palette section | Palette entry ID | Desktop evidence path | M002/M003 notes | Blocked by family slice |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/changelog` | Show changelog entries | Pending | Meta/Skills | `meta.changelog` | — | | Planned Slice 6 |
| `/clone` | Duplicate session at current position | Pending | Session | `session.clone` | — | | Planned Slice 3 |
| `/compact` | Manually compact session context | Pending | Session | `session.compact` | — | Optional `[prompt]` in CLI | Planned Slice 3 |
| `/copy` | Copy last agent message | Pending | Output | `output.copy` | — | | Planned Slice 5 |
| `/export` | Export session to HTML/JSONL | Pending | Output | `output.export` | — | | Planned Slice 5 |
| `/fork` | Fork from previous user message | Pending | Session | `session.fork` | — | | Planned Slice 3 |
| `/hotkeys` | Show all keyboard shortcuts | Pending | Meta/Skills | `meta.hotkeys` | — | | Planned Slice 6 |
| `/import` | Import session from JSONL | Pending | Session | `session.import` | — | | Planned Slice 3 |
| `/login` | Configure provider auth | Pending | Config | `config.login` | — | Secrets stay in main process | Planned Slice 4 |
| `/logout` | Remove provider auth | Pending | Config | `config.logout` | — | | Planned Slice 4 |
| `/model` | Select model | Pending | Config | `config.model` | `src/renderer/components/composer-model-selector.tsx` | May remain `existing UI` after review | Planned Slice 4 |
| `/name` | Set session display name | Pending | Session | `session.name` | — | | Planned Slice 3 |
| `/new` | Start a new session | Pending | Session | `session.new` | — | | Planned Slice 3 |
| `/quit` | Quit pi | Pending | Meta/Skills | `meta.quit` | — | Likely `out-of-scope` | Planned Slice 6 |
| `/reload` | Reload resources | Pending | Config | `config.reload` | — | Extensions/skills/themes | Planned Slice 4 |
| `/resume` | Resume a different session | Pending | Session | `session.resume` | — | | Planned Slice 3 |
| `/scoped-models` | Scoped model cycling set | Pending | Config | `config.scoped-models` | — | | Planned Slice 4 |
| `/session` | Show session info and stats | Pending | Session | `session.info` | — | | Planned Slice 3 |
| `/settings` | Open settings menu | Pending | Config | `config.settings` | — | | Planned Slice 4 |
| `/share` | Share session via gist | Pending | Output | `output.share` | — | | Planned Slice 5 |
| `/tree` | Navigate session tree | Pending | Session | `session.tree` | — | | Planned Slice 3 |

## Summary counts

| Metric | Count |
| --- | ---: |
| **Total built-in commands** | 21 |
| **Pending disposition** | 21 |
| **Session family** | 9 |
| **Config family** | 6 |
| **Output family** | 3 |
| **Meta/Skills family** | 3 |

## Handoff to S010 (palette shell)

S010 should import section names and `palette entry ID` values from this matrix. Stub handlers may register all Pending rows; family slices replace stubs with real actions without schema changes.

## Handoff to family slices

| Planned slice | Palette section | Commands (palette entry IDs) |
| --- | --- | --- |
| Planned Slice 3 (Session) | Session | `session.*` (9 rows) |
| Planned Slice 4 (Config) | Config | `config.*` (6 rows) |
| Planned Slice 5 (Output) | Output | `output.*` (3 rows) |
| Planned Slice 6 (Meta/Skills) | Meta/Skills | `meta.*` (3 rows) |
