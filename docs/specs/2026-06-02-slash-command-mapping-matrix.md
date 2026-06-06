# Slash-command mapping matrix

**Milestone:** M003 — CLI Slash-Command Mapping and Affordance Parity; M004 — Dynamic Slash Commands and Skill Invocation Parity  
**Slice:** S009 — Command inventory and mapping baseline; S010 — Composer command palette shell; S011–S014 — Family command mapping; S015 — Gap closure consolidation; S016/S018 — Dynamic command discovery and reload traceability  
**Requirements:** COMMANDS-MAP-01 (`MAP-01`), COMMANDS-OUTCOME-01 (`OUTCOME-01`), COMMANDS-DECISION-01 (`DECISION-01`), DYN-RELOAD-01, DYN-TRACE-01  
**Inventory:** [2026-06-02-slash-command-inventory.md](./2026-06-02-slash-command-inventory.md)  
**Coverage parent:** [2026-05-25-cli-parity-coverage-matrix.md](./2026-05-25-cli-parity-coverage-matrix.md) (CLI-COMMANDS-007)

## Purpose

Authoritative mapping of each built-in Pi CLI slash command to a Desktop disposition, palette registration metadata, and evidence paths. S015 consolidated family-slice outcomes (S011–S014) into final dispositions for all 21 built-in commands. M004 records runtime-discovered command carry-forward evidence for extension commands, prompt templates, skills, and resource reload behavior.

## Matrix schema

| Column | Required | Description |
| --- | --- | --- |
| **CLI command** | Yes | Slash command as typed in Pi TUI (e.g. `/model`). |
| **Description** | Yes | Short user-facing summary (from builtin registry). |
| **Disposition** | Yes | One of: `palette entry`, `existing UI`, `deferred`, `out-of-scope` (capability status; see rules below). |
| **Palette UX** | Yes | `action` — handler mutates Desktop state or opens wired UI; `notice` — palette shows a deferral or guidance notice only; `n/a` — not registered in the palette. |
| **Palette section** | When palette UX is `action` or `notice` | M003 family: `Session`, `Config`, `Output`, or `Meta/Skills`. |
| **Palette entry ID** | When palette UX is `action` or `notice` | Stable slug for palette registry (e.g. `session.new`). |
| **Evidence** | No | Repo path(s) for implementation or existing UI. |
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

S010 shell: `command-palette-registry.ts`, `command-palette-state.ts`, `use-composer-command-palette.ts`, `command-palette-popover.tsx`, `composer.tsx`.

| Section | Primary evidence | Slice |
| --- | --- | --- |
| **Session** | `src/renderer/chat/session-command-palette.ts`, `src/renderer/chat/use-session-command-palette-actions.ts`, `src/renderer/chat/build-command-palette-entries.ts` | S011 |
| **Config** | `src/renderer/chat/config-command-palette-entries.ts`, `src/renderer/chat/command-palette-default-entries.ts` | S012 |
| **Output** | `src/renderer/chat/output-command-palette.ts`, `src/renderer/chat/last-assistant-message.ts` | S013 |
| **Meta/Skills** | `src/renderer/chat/meta-command-palette-entries.ts`, `src/renderer/chat/command-palette-default-entries.ts`, `src/renderer/chat/runtime-command-palette-entries.ts`, `src/renderer/chat/runtime-command-refresh.ts` | S014, S016, S018 |

Wired Session and Output handlers also use `src/renderer/App.tsx`. Exceptions: `/model` → `src/renderer/components/composer-model-selector.tsx`; `/name` → `src/renderer/components/project-sidebar.tsx`. `/reload` is registered only under Meta/Skills (`meta.reload`) and now triggers the M004 runtime-resource refresh path; see [§ Cross-family ownership](#cross-family-ownership-decisions-s015).

## Mapping matrix (built-in commands)

| CLI command | Description | Disposition | Palette UX | Palette section | Palette entry ID | Evidence | M002/M003 notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/changelog` | Show changelog entries | `deferred` | notice | Meta/Skills | `meta.changelog` | `src/renderer/chat/meta-command-palette-entries.ts` | In-app changelog deferred; palette shows visible notice (S014) |
| `/clone` | Duplicate session at current position | `palette entry` | action | Session | `session.clone` | `src/renderer/chat/session-command-palette.ts`, `src/renderer/App.tsx` | Wired via `chat.clone` when the selected chat has a session file (S011) |
| `/compact` | Manually compact session context | `deferred` | notice | Session | `session.compact` | `src/renderer/chat/session-command-palette.ts` | Visible deferral until `piSession.compact` IPC exists (S011) |
| `/copy` | Copy last agent message | `palette entry` | action | Output | `output.copy` | `src/renderer/chat/output-command-palette.ts`, `src/renderer/App.tsx` | Copies the last assistant transcript message via clipboard IPC (S013) |
| `/export` | Export session to HTML/JSONL | `deferred` | notice | Output | `output.export` | `src/renderer/chat/output-command-palette.ts` | Visible deferral until export IPC ships (S013) |
| `/fork` | Fork from previous user message | `palette entry` | action | Session | `session.fork` | `src/renderer/chat/session-command-palette.ts`, `src/renderer/App.tsx` | Wired via `chat.fork` when the selected chat has a session file (S011) |
| `/hotkeys` | Show all keyboard shortcuts | `deferred` | notice | Meta/Skills | `meta.hotkeys` | `src/renderer/chat/meta-command-palette-entries.ts` | Keybindings reference deferred; palette shows visible notice (S014) |
| `/import` | Import session from JSONL | `deferred` | notice | Session | `session.import` | `src/renderer/chat/session-command-palette.ts` | See § Cross-family ownership; visible deferral until JSONL import IPC exists (S011) |
| `/login` | Configure provider auth | `deferred` | notice | Config | `config.login` | `src/renderer/chat/config-command-palette-entries.ts` | Visible deferral until Settings/Auth milestone; secrets stay in main process (S012) |
| `/logout` | Remove provider auth | `deferred` | notice | Config | `config.logout` | `src/renderer/chat/config-command-palette-entries.ts` | Visible deferral until Settings/Auth milestone; no renderer secrets (S012) |
| `/model` | Select model | `existing UI` | action | Config | `config.model` | `src/renderer/components/composer-model-selector.tsx`, `src/renderer/chat/config-command-palette-entries.ts` | Palette opens composer model picker; no draft insertion (S012) |
| `/name` | Set session display name | `palette entry` | action | Session | `session.name` | `src/renderer/components/project-sidebar.tsx`, `src/renderer/App.tsx` | Opens inline rename for the selected project chat (S011) |
| `/new` | Start a new session | `palette entry` | action | Session | `session.new` | `src/renderer/chat/session-command-palette.ts`, `src/renderer/App.tsx` | `chat.create` or `chat.createStandalone` (S011) |
| `/quit` | Quit pi | `out-of-scope` | notice | Meta/Skills | `meta.quit` | `src/renderer/chat/meta-command-palette-entries.ts` | OS/window close is the Desktop equivalent; palette explains (S014) |
| `/reload` | Reload resources | `palette entry` | action | Meta/Skills | `meta.reload` | `src/renderer/chat/meta-command-palette-entries.ts`, `src/renderer/App.tsx`, `src/renderer/chat/runtime-command-refresh.ts`, `src/main/pi-session/pi-session-runtime.ts` | M004 S018 asks Pi to reload resources, replaces active runtime command metadata, and clears stale command entries on refresh failure |
| `/resume` | Resume a different session | `deferred` | notice | Session | `session.resume` | `src/renderer/chat/session-command-palette.ts` | Status guidance to select a chat in the sidebar (existing resume path) |
| `/scoped-models` | Scoped model cycling set | `deferred` | notice | Config | `config.scoped-models` | `src/renderer/chat/config-command-palette-entries.ts` | Palette entry shows visible deferral; Ctrl+P cycling not implemented (S012) |
| `/session` | Show session info and stats | `palette entry` | action | Session | `session.info` | `src/renderer/chat/session-command-palette.ts`, `src/renderer/App.tsx` | Shows selected chat metadata in the project status message (S011) |
| `/settings` | Open settings menu | `deferred` | notice | Config | `config.settings` | `src/renderer/chat/config-command-palette-entries.ts` | Palette entry shows visible deferral until Settings shell ships (S012) |
| `/share` | Share session via gist | `deferred` | notice | Output | `output.share` | `src/renderer/chat/output-command-palette.ts` | Visible deferral until gist share IPC ships (S013) |
| `/tree` | Navigate session tree | `deferred` | notice | Session | `session.tree` | `src/renderer/chat/session-command-palette.ts` | Visible deferral until session tree UI ships (S011) |

## Summary counts

| Metric | Count |
| --- | ---: |
| **Total built-in commands** | 21 |
| **`palette entry` (capability wired)** | 7 |
| **`existing UI`** | 1 |
| **`deferred`** | 12 |
| **`out-of-scope`** | 1 |
| **Palette UX `action`** | 8 |
| **Palette UX `notice`** | 13 |
| **Commands in Session section** | 9 |
| **Commands in Config section** | 5 |
| **Commands in Output section** | 3 |
| **Commands in Meta/Skills section** | 4 |
| **Pending disposition** | 0 |

Disposition counts describe **capability** status. Palette UX counts describe handler behavior (`action` includes `/model` palette alias). Section counts reflect palette **section** assignment. Inventory total (21) matches [2026-06-02-slash-command-inventory.md](./2026-06-02-slash-command-inventory.md).

## Implementation notes

### S010 palette shell

S010 implemented the composer command-palette shell with these evidence paths:

- `src/renderer/chat/command-palette-registry.ts`: section IDs, registry API, allowed Lucide icons, and one stub entry per section.
- `src/renderer/chat/command-palette-state.ts`: slash trigger detection, query filtering, and keyboard action mapping.
- `src/renderer/chat/use-composer-command-palette.ts`: composer integration state, dismissal, active entry movement, and selection handling.
- `src/renderer/components/command-palette-popover.tsx`: grouped shadcn `Command`/`Popover` UI with keyboard and pointer selection.
- `src/renderer/components/composer.tsx`: `/` hint, textarea trigger wiring, and navigation-key interception before prompt submit.

Current behavior: typing `/` at the start of composer text or after whitespace opens the palette; whitespace closes the query; ArrowUp/ArrowDown move selection; Enter selects; Escape dismisses. Stub selection inserts section placeholder text into the draft and does not submit raw slash text.

### S011 session family

S011 replaced the Session section stub with nine concrete palette entries and wired supported actions through `useSessionCommandPaletteActions` and sidebar registration:

- `src/renderer/chat/session-command-palette.ts`: stable `session.*` entry IDs, labels, deferral copy, and handlers.
- `src/renderer/chat/use-session-command-palette-actions.ts`: palette action wiring for new/fork/clone/name/info.
- `src/renderer/chat/build-command-palette-entries.ts`: merges session entries with remaining section stubs.
- `src/renderer/chat/use-composer-command-palette.ts`: accepts optional session actions to build the registry at runtime.
- `src/renderer/projects/project-chat-branch-action.ts`: shared fork/clone guards for palette and sidebar.
- `src/renderer/components/project-sidebar.tsx`: registers `startChatRename`; pending rename via sidebar context.

Verification: `tests/renderer/session-command-palette.test.ts`, `tests/renderer/build-command-palette-entries.test.ts`, and updated registry tests.

### S012 config family

S012 registered and wired Config palette entries with these evidence paths:

- `src/renderer/chat/config-command-palette-entries.ts`: stable `config.*` entry IDs, deferral copy, and pure `CommandPaletteAction` handlers.
- `src/renderer/chat/command-palette-default-entries.ts`: composes config entries with output and meta stubs or entries.
- `src/renderer/chat/build-command-palette-entries.ts`: merges session entries from S011 with default entries.
- `src/renderer/chat/use-composer-command-palette.ts`: applies palette actions (`openModelPicker`, `notice`, `insertPrompt`) via composer callbacks.
- `src/renderer/components/composer.tsx`: opens model picker and surfaces palette deferral notices; clears notices on text change.

Current behavior: typing `/` and filtering to Config shows five concrete entries. **Change model** opens the composer model picker without inserting slash text. **Scoped models**, **Settings**, **Log in**, and **Log out** dismiss the palette and show visible deferral copy in the composer status row. Provider secrets never enter palette entry data or renderer state.

`/reload` remains in the Meta/Skills family. M004 S018 wires it to the runtime command resource refresh path; S012 does not register a `config.reload` alias.

### S013 output family

S013 replaced the Output section stub with three concrete palette entries and wired copy through clipboard IPC:

- `src/renderer/chat/output-command-palette.ts`: stable `output.*` entry IDs, labels, and handlers.
- `src/renderer/chat/last-assistant-message.ts`: finds the last non-empty assistant transcript message for `/copy`.
- `src/renderer/chat/build-command-palette-entries.ts`: merges output entries with remaining section stubs.
- `src/renderer/chat/use-composer-command-palette.ts`: accepts optional palette actions to build the registry at runtime.
- `src/renderer/chat/output-command-palette.ts` (`createOutputCommandPaletteActions`): clipboard copy and visible deferrals for export/share; `src/renderer/App.tsx` wires deps only.

Verification: `tests/renderer/output-command-palette.test.ts`, `tests/renderer/build-command-palette-entries.test.ts`, `tests/renderer/command-palette-registry.test.ts`, and `tests/renderer/last-assistant-message.test.ts`.

### S014 meta / discovery family

S014 classified and registered Meta/Skills palette entries for `/hotkeys`, `/changelog`, `/reload`, and `/quit`; M004 S018 wires `/reload` to the active Pi session resource refresh path:

- `src/renderer/chat/meta-command-palette-entries.ts`: stable `meta.*` entry IDs plus the M004 reload action hook for `meta.reload`.
- `src/renderer/chat/command-palette-registry.ts`: `showPaletteNoticeAction()` is the canonical deferral contract for palette handlers.
- `src/renderer/chat/command-palette-default-entries.ts`: replaces the Meta/Skills section stub with S014 entries.
- `src/renderer/chat/use-composer-command-palette.ts` and `src/renderer/components/composer.tsx`: show visible deferral/out-of-scope copy without inserting raw slash text; clear stale notices on stub selection and successful submit.
- `src/main/pi-session/pi-session-runtime.ts` and `src/shared/pi-session-commands.ts`: `reloadResources` asks Pi to reload before command metadata is rebuilt.
- `src/renderer/chat/runtime-command-refresh.ts` and `src/renderer/App.tsx`: replace active palette command state after refresh and clear stale entries when refresh fails.

Family slices with deferred commands should return `{ type: "notice", message }` (via `showPaletteNoticeAction`) rather than imperative notice callbacks inside handlers.

`/reload` palette ownership is `meta.reload` (Meta/Skills); S012 does not register `config.reload`.

### M004 dynamic command evidence

M004 carries forward runtime-discovered slash-command parity outside the fixed built-in matrix:

- Discovery and metadata: `src/main/pi-session/pi-session-runtime-commands.ts`, `src/main/pi-session/pi-session-runtime.ts`, and `src/shared/pi-session-commands.ts` model Pi extension commands, prompt templates, and skill commands with source, scope, provenance, argument hints, and availability.
- Palette display: `src/renderer/chat/runtime-command-palette-entries.ts`, `src/renderer/chat/build-command-palette-entries.ts`, and `src/renderer/components/composer.tsx` render dynamic command entries alongside built-ins with visible source labels and unavailable-command guidance.
- Reload outcomes: `src/main/pi-session/pi-session-runtime.ts`, `src/renderer/chat/meta-command-palette-entries.ts`, `src/renderer/chat/runtime-command-refresh.ts`, and `src/renderer/App.tsx` wire `/reload` to Pi resource reload, replace active runtime command state, and clear stale commands on refresh failure.
- Verification: `tests/main/pi-session-runtime-commands.test.ts`, `tests/main/pi-session-runtime.test.ts`, `tests/main/app-backend.test.ts`, `tests/renderer/build-command-palette-entries.test.ts`, `tests/renderer/composer-command-palette.test.tsx`, and `tests/renderer/runtime-command-refresh.test.ts` cover metadata, palette display, unavailable guidance, reload requests, state replacement, and failure feedback.

## Cross-family ownership decisions (S015)

| Command | Decision | Rationale |
| --- | --- | --- |
| `/import` | Session family (`session.import`) | JSONL import is a session lifecycle action; S011 owns disposition and deferral |
| `/compact` | Session family (`session.compact`) | Context compaction is session-scoped; S011 owns disposition and deferral |
| `/reload` | Meta/Skills only (`meta.reload`) | Config-family deferral in S012; S014 registers under Meta/Skills. No `config.reload` row; M004 S018 wires resource refresh through Pi |

## Carry-forward and out-of-scope (not in built-in matrix)

| Surface | Disposition | Destination scope | Rationale |
| --- | --- | --- | --- |
| `@` mentions | Deferred | Later composer UX milestone | Not a slash command; composer hint documents planned support |
| Prompt templates (`/<name>`) | M004 dynamic palette entry | M004 Dynamic Commands | Runtime-discovered through Pi `promptTemplates`; S016 displays source/provenance and S018 refreshes changed resources |
| Extension commands | M004 dynamic palette entry | M004 Dynamic Commands | Runtime-discovered via Pi `extensionRunner`; S016 displays source/provenance and S018 refreshes changed resources |
| Skills (`/skill:<name>`) | M004 dynamic palette entry | M004 Dynamic Commands | Runtime-discovered through Pi skill metadata; unavailable skill commands remain visibly unavailable instead of invokable |
| `!` / `!!` bash shortcuts | Deferred | M07D Terminal and Command Output | Terminal-specific; see CLI-BASH-010 |
| `/debug`, easter eggs | Out of scope | — | Not user-facing builtins per S009 exclusion criteria |
