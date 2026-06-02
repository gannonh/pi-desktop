# Slash-command inventory (user-facing)

**Milestone:** M003 — CLI Slash-Command Mapping and Affordance Parity  
**Slice:** S009 — Command inventory and mapping baseline  
**Requirements:** COMMANDS-INV-01 (`INV-01`)  
**Related:** [2026-05-25-cli-parity-source-inventory.md](./2026-05-25-cli-parity-source-inventory.md), [2026-06-02-slash-command-mapping-matrix.md](./2026-06-02-slash-command-mapping-matrix.md)

## Purpose

Authoritative, deduplicated inventory of **built-in** Pi CLI interactive slash commands for M003 mapping and palette registration. Extension commands, prompt templates, and `/skill:*` invocations are documented separately because they are discovered at runtime.

## Sources audited

| Source | Role |
| --- | --- |
| [`BUILTIN_SLASH_COMMANDS`](file:///Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/slash-commands.ts) | Canonical built-in command names and descriptions |
| [`interactive-mode.ts`](file:///Volumes/EVO/repos/pi-mono/packages/coding-agent/src/modes/interactive/interactive-mode.ts) (`setupEditorSubmitHandler`, `createBaseAutocompleteProvider`) | Submit handlers and autocomplete registration |
| [Pi `README.md`](file:///Volumes/EVO/repos/pi-mono/packages/coding-agent/README.md) | User-facing command table |
| [M001 source inventory](./2026-05-25-cli-parity-source-inventory.md) | Prior slash-command row (2026-05-25) |

## Exclusion criteria

Commands are **excluded** from this inventory when they match any of:

1. **Not in `BUILTIN_SLASH_COMMANDS`** and only handled as hard-coded easter eggs or debug hooks in `interactive-mode.ts` (not advertised in README/usage).
2. **Extension-registered** (`extensionRunner.getRegisteredCommands()`), including renamed invocations when conflicting with builtins.
3. **Prompt templates** (`session.promptTemplates`) — user-defined `/templatename` expansions.
4. **Skills** (`/skill:<name>`) when `enableSkillCommands` is on — discovered from loaded skills.
5. **Non-slash editor prefixes** — `!` / `!!` bash shortcuts (see M001 CLI-BASH-010).

Excluded handlers found in `interactive-mode.ts` (not in `BUILTIN_SLASH_COMMANDS`):

| Command | Reason |
| --- | --- |
| `/debug` | Implementation-only diagnostics |
| `/arminsayshi` | Easter egg |
| `/dementedelves` | Easter egg |

## Dynamic command surfaces (out of inventory table)

| Surface | Pattern | Registration |
| --- | --- | --- |
| Prompt templates | `/<template-name>` | `promptTemplates` + autocomplete |
| Extension commands | `/<name>` or `/<invocationName>` | `extensionRunner.getRegisteredCommands()` |
| Skills | `/skill:<skill-name>` | `resourceLoader.getSkills()` when enabled |

Family slices and S010 (palette shell) should treat these as **registrable at runtime**, not fixed rows in the built-in matrix.

## Built-in inventory (21 commands)

Alphabetical by command name. CLI path column uses repo-relative paths under `pi-mono/packages/coding-agent/`.

| # | Command | Description (from builtin registry) | Primary CLI evidence |
| --- | --- | --- | --- |
| 1 | `/changelog` | Show changelog entries | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 2 | `/clone` | Duplicate the current session at the current position | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 3 | `/compact` | Manually compact the session context | `src/core/slash-commands.ts`, `interactive-mode.ts`; optional `[prompt]` per README |
| 4 | `/copy` | Copy last agent message to clipboard | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 5 | `/export` | Export session (HTML default, or path) | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 6 | `/fork` | Create a new fork from a previous user message | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 7 | `/hotkeys` | Show all keyboard shortcuts | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 8 | `/import` | Import and resume a session from JSONL | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 9 | `/login` | Configure provider authentication | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 10 | `/logout` | Remove provider authentication | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 11 | `/model` | Select model (opens selector UI) | `src/core/slash-commands.ts`, `interactive-mode.ts`; args: `provider/id` |
| 12 | `/name` | Set session display name | `src/core/slash-commands.ts`, `interactive-mode.ts`; args: `<name>` |
| 13 | `/new` | Start a new session | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 14 | `/quit` | Quit pi | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 15 | `/reload` | Reload keybindings, extensions, skills, prompts, themes | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 16 | `/resume` | Resume a different session | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 17 | `/scoped-models` | Enable/disable models for Ctrl+P cycling | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 18 | `/session` | Show session info and stats | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 19 | `/settings` | Open settings menu | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 20 | `/share` | Share session as a secret GitHub gist | `src/core/slash-commands.ts`, `interactive-mode.ts` |
| 21 | `/tree` | Navigate session tree (switch branches) | `src/core/slash-commands.ts`, `interactive-mode.ts` |

## M001 parity check

The M001 source inventory slash-command row (2026-05-25) lists: `/login`, `/logout`, `/model`, `/scoped-models`, `/settings`, `/resume`, `/new`, `/name`, `/session`, `/tree`, `/fork`, `/clone`, `/compact`, `/copy`, `/export`, `/import`, `/share`, `/reload`, `/hotkeys`, `/changelog`, `/quit`.

**Result:** All 20 M001-listed commands are present in this inventory. **`/import`** is included (listed in M001 and `BUILTIN_SLASH_COMMANDS`). No additional user-facing builtins were found in `interactive-mode.ts` beyond the three excluded debug/easter-egg handlers.

**Count:** 21 built-in commands (M001 prose listed 20 names but omitted none that exist in the registry; this inventory adds explicit `/import` alignment with `BUILTIN_SLASH_COMMANDS`).

## Handoff notes (S010 / family slices)

- Palette section names and stable entry IDs live in [2026-06-02-slash-command-mapping-matrix.md](./2026-06-02-slash-command-mapping-matrix.md).
- Do not re-audit `slash-commands.ts` per slice unless Pi CLI version bumps; refresh this spec instead.
