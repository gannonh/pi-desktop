# CLI parity source inventory

## Scope

Milestone M001, slice S001. This document records source evidence and inventories for the CLI parity audit. It intentionally does not classify Desktop parity gaps.

## T001 CLI source material audit

### Authoritative source list

| Source | Type | Authority notes |
| --- | --- | --- |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/package.json` | Package manifest and published entrypoint | Authoritative for package name, `pi` binary entrypoint, exported SDK entrypoint, bundled docs/examples, and package-level scripts. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/cli/args.ts` | CLI argument parser and help renderer | Authoritative for top-level flags, package subcommands, built-in tool names, environment variables, and help examples. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/main.ts` | CLI process entrypoint | Authoritative for mode selection, stdin handling, session resolution, runtime setup, diagnostics, model scope, export, and session startup behavior. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/modes/interactive/interactive-mode.ts` | Interactive TUI command/input implementation | Authoritative for slash-command handling, shell command shortcuts, queued prompt behavior, clipboard image paste, model/settings/session selectors, and abort/streaming behavior. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/modes/index.ts` plus `src/modes/print` and `src/modes/rpc` implementations | Mode dispatch and non-interactive runtimes | Authoritative for print, JSON, and RPC execution surfaces where docs need implementation confirmation. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/sdk.ts` and `src/index.ts` | SDK public API exports | Authoritative for programmatic session API exported to Desktop and third-party integrations. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/agent-session-runtime.ts` and `src/core/agent-session-services.ts` | Runtime/session service composition | Authoritative for session replacement, cwd-bound resource loading, diagnostics, and runtime creation behavior. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/session-manager.ts` | Session persistence and listing | Authoritative for saved-session location, session IDs, current-project and global lookup, fork/clone/import support. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/compaction/` | Compaction implementation | Authoritative for manual, threshold, overflow, and branch-summary compaction behavior. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/settings-manager.ts` | Settings loader and merge behavior | Authoritative for global/project settings, path resolution, resource discovery settings, retry/message-delivery settings, and defaults. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/model-registry.ts`, `src/core/model-resolver.ts`, and `/Volumes/EVO/repos/pi-mono/packages/ai/src/` | Provider/model registry and AI transport layer | Authoritative for provider authentication, model resolution, thinking support, OAuth/API key behavior, and provider transport behavior. |
| `/Volumes/EVO/repos/pi-mono/packages/agent/src/types.ts` and `/Volumes/EVO/repos/pi-mono/packages/agent/src/agent-loop.ts` | Agent event/tool loop core | Authoritative for agent lifecycle events, turn lifecycle, message updates, tool execution events, and loop behavior. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/tools/` | Built-in tool definitions | Authoritative for built-in read, bash, edit, write, grep, find, and ls tool schemas and behavior. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/extensions/` and `docs/extensions.md` | Extension runtime and docs | Authoritative for extension discovery, lifecycle events, custom commands, tools, UI components, rendering hooks, and package resources. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/skills.md` plus skill loader/resource code | Skill docs and behavior | Authoritative for skill locations, commands, on-demand loading, and Agent Skills compatibility. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/prompt-templates.md` plus prompt-template tests | Prompt template docs and behavior | Authoritative for prompt-template discovery, `/template` expansion, and resource loading. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/themes.md` plus TUI theme code | Theme docs and behavior | Authoritative for built-in/custom theme selection, theme file schema, and rendering tokens. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/packages.md` and `src/package-manager-cli.ts` | Pi package docs and package CLI | Authoritative for `pi install/remove/update/list/config`, package resource filters, local/global install behavior, and package security notes. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/usage.md` and `README.md` | User-facing usage docs | High-confidence user-visible capability summary. Treat as docs evidence and confirm nuanced behavior in source files above. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/sessions.md` and `docs/session-format.md` | Session docs and schema | High-confidence source for session commands, JSONL structure, tree navigation, labels, compaction summaries, and SessionManager API. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/sdk.md` and `examples/sdk/` | SDK docs and runnable examples | High-confidence source for embedding capabilities and Desktop integration points. Confirm exported API details in `src/index.ts` and `src/core/sdk.ts`. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/rpc.md` | RPC protocol docs | High-confidence source for headless JSONL RPC commands, responses, events, and state API. Confirm command handlers in RPC mode implementation. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/json.md` | JSON event mode docs | High-confidence source for JSON stream event shapes and examples. Confirm against agent/coding-agent event types. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/keybindings.md`, `terminal-setup.md`, `tmux.md`, `windows.md`, `termux.md` | Terminal/platform docs | High-confidence source for keyboard shortcuts, keybinding customization, terminal compatibility, and platform notes. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/examples/extensions/` | Extension examples | Evidence for extension API breadth and supported integration patterns. Use as example evidence, not as complete capability definition. |
| `/Volumes/EVO/repos/pi-mono/packages/coding-agent/examples/sdk/` | SDK examples | Evidence for embedding and runtime integration patterns. Use with SDK docs and exported types. |
| `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/README.md`, `docs/`, and `examples/` | Installed package docs and examples | Useful installed-reference mirror for user-facing docs. Local development repo remains primary when source and installed package differ. |

### Source confidence notes

- The local `pi-mono` checkout is the primary implementation source for M001 because Desktop integrates against the Pi TypeScript SDK from that repo.
- The installed package under `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent` is useful for currently installed docs and examples, but it should be treated as a mirror unless a task specifically audits installed runtime behavior.
- User-facing docs summarize capabilities well, while source files and tests should settle command semantics, event shapes, settings precedence, and edge cases.
- Example files demonstrate intended extension and SDK usage, but they do not define the full product surface.

## T002 CLI capability inventory

### Capability inventory

| Area | User-visible capability | Evidence | Notes for later coverage classification |
| --- | --- | --- | --- |
| Startup and modes | Start Pi in interactive terminal mode by running `pi`; pass initial prompt messages and `@file` references; read piped stdin in non-interactive contexts. | `src/cli/args.ts`, `src/main.ts`, `docs/usage.md`, `README.md` | Desktop should compare project-start/session-start flows against this input model. |
| Print and JSON modes | Run one-shot prompts with `--print`/`-p`, emit structured events with `--mode json`, and export sessions via CLI flags. | `src/cli/args.ts`, `docs/usage.md`, `docs/json.md` | JSON mode event shape can feed later transcript/event coverage checks. |
| RPC mode | Run `pi --mode rpc` with JSONL commands and responses for prompt, steer, follow-up, abort, session replacement, state, model, thinking, queue, and settings operations. | `docs/rpc.md`, `src/modes/rpc/`, `src/core/agent-session-runtime.ts` | Desktop uses SDK first, but RPC defines an alternate integration and protocol surface. |
| SDK embedding | Create `AgentSession` and `AgentSessionRuntime`, subscribe to events, prompt, queue steering/follow-up messages, set model/thinking, navigate session trees, compact, abort, and dispose. | `docs/sdk.md`, `examples/sdk/`, `src/index.ts`, `src/core/sdk.ts` | High-priority Desktop source because the app integrates through the TypeScript SDK. |
| Interactive TUI shell | Render startup header, messages, editor, and footer with cwd, session name, token/cache/cost/context usage, current model, shortcuts, loaded resources, and status. | `README.md`, `docs/usage.md`, `src/modes/interactive/interactive-mode.ts` | Compare against Desktop shell state visibility rather than terminal layout. |
| Editor input | Support file reference autocomplete with `@`, path completion with Tab, multiline input, image paste/drag, external editor via Ctrl+G, and command autocomplete. | `README.md`, `docs/usage.md`, `docs/keybindings.md`, `src/modes/interactive/interactive-mode.ts` | Desktop composer should map these to GUI affordances. |
| Slash commands | Built-in commands include `/login`, `/logout`, `/model`, `/scoped-models`, `/settings`, `/resume`, `/new`, `/name`, `/session`, `/tree`, `/fork`, `/clone`, `/compact`, `/copy`, `/export`, `/import`, `/share`, `/reload`, `/hotkeys`, `/changelog`, and `/quit`. | `README.md`, `docs/usage.md`, `src/modes/interactive/interactive-mode.ts` | Source has extra implementation-only/debug commands; classify only user-facing commands later. |
| Prompt delivery while busy | Submit steering messages during streaming, submit follow-up messages for after active work, switch delivery via settings, and surface queue updates. | `docs/usage.md`, `docs/settings.md`, `docs/rpc.md`, `docs/sdk.md`, `src/modes/interactive/interactive-mode.ts` | Desktop product language already names steering/follow-up behavior in `CONTEXT.md`. |
| Abort and recovery | Abort active agent operation with Escape/RPC/SDK, restore queued messages to editor in TUI, and surface prompt preflight rejection separately from later run failures. | `docs/usage.md`, `docs/rpc.md`, `docs/sdk.md`, `src/modes/interactive/interactive-mode.ts` | Later matrix should distinguish abort run, prompt rejection, retry, and error display. |
| Bash shortcuts | Run `!command` and send output to the model, or `!!command` and hide output from context; prevent overlapping bash commands. | `docs/usage.md`, `README.md`, `src/modes/interactive/interactive-mode.ts` | Desktop may expose this through tool events or terminal surfaces rather than editor prefix syntax. |
| Built-in tools | Provide built-in `read`, `bash`, `edit`, `write`, plus read-only `grep`, `find`, and `ls`; allow enabling/disabling all tools, built-in tools, or a tool allowlist. | `src/cli/args.ts`, `src/core/tools/`, `docs/usage.md` | Later matrix should separate model-callable tool availability from user-visible tool inspection. |
| Tool events | Emit lifecycle events for tool execution start, update, end, result payloads, and error state. | `docs/json.md`, `packages/agent/src/types.ts`, `src/core/tools/` | Desktop transcript and panels can map against this event model. |
| Sessions | Persist sessions under `~/.pi/agent/sessions/` by cwd, continue latest with `-c`, browse with `-r` or `/resume`, name sessions, inspect session info, delete from picker, and override session dir. | `docs/sessions.md`, `docs/session-format.md`, `src/core/session-manager.ts`, `src/main.ts` | Desktop has project/session management, so later classification needs command-by-command parity. |
| Session tree, fork, clone | Navigate a session tree in-place with `/tree`, branch from prior turns, fork into a new session, clone the active branch, label entries, and summarize abandoned branches. | `docs/sessions.md`, `docs/session-format.md`, `src/modes/interactive/components/tree-selector.ts`, `src/core/session-manager.ts` | Tree semantics are central to resume/history parity. |
| Compaction | Manually compact with `/compact [prompt]`; auto-compact near or over context limits; branch summarization on tree navigation; expose compaction events and settings. | `docs/compaction.md`, `docs/json.md`, `docs/settings.md`, `src/core/compaction/` | Later coverage should separate user controls, event rendering, and settings. |
| Providers and auth | Authenticate with subscription providers through `/login` or API keys through env/auth file; support Anthropic, OpenAI, Azure OpenAI, DeepSeek, Google, Vertex, Bedrock, Mistral, Groq, Cerebras, Cloudflare, xAI, OpenRouter, Vercel AI Gateway, ZAI, OpenCode, Hugging Face, Fireworks, Together, Kimi, MiniMax, Xiaomi, and GitHub Copilot. | `README.md`, `docs/providers.md`, `src/core/model-registry.ts`, `packages/ai/src/` | Desktop should keep provider secrets out of renderer state while reflecting auth status. |
| Model selection | Select provider/model with flags, `/model`, Ctrl+L, provider-prefixed model IDs, fuzzy/glob patterns, default provider/model settings, and `--list-models`. | `src/cli/args.ts`, `docs/models.md`, `docs/usage.md`, `src/core/model-resolver.ts` | Desktop composer model controls map here. |
| Thinking controls | Set thinking with `--thinking`, model shorthand `model:thinking`, `/settings`, Shift+Tab, SDK calls, and settings defaults; levels are `off`, `minimal`, `low`, `medium`, `high`, `xhigh`. | `src/cli/args.ts`, `docs/settings.md`, `docs/sdk.md`, `README.md` | Desktop composer thinking controls map here. |
| Settings | Load global `~/.pi/agent/settings.json` and project `.pi/settings.json`, merge project overrides, resolve relative resource paths by scope, edit common settings through `/settings`. | `docs/settings.md`, `src/core/settings-manager.ts`, `src/modes/interactive/components/settings-selector.ts` | Later classification should identify which settings are surfaced in Desktop. |
| Context files and system prompts | Load global and ancestor/current `AGENTS.md` or `CLAUDE.md`, project/global `.pi/SYSTEM.md`, and `APPEND_SYSTEM.md`; disable context files with `--no-context-files`. | `docs/usage.md`, `src/core/resource-loader.ts`, `src/core/system-prompt.ts` | Desktop project instructions and context display should map against this behavior. |
| File and image inputs | Include files with `@file` CLI args, file references in editor, image paste/drag, image resize/block settings, and image payloads through SDK/RPC prompt APIs. | `docs/usage.md`, `docs/quickstart.md`, `docs/sdk.md`, `docs/rpc.md`, `src/cli/file-processor.ts`, `src/utils/clipboard-image.ts` | Desktop attachments should classify text documents and images separately. |
| Keybindings and terminal compatibility | Provide defaults for clear/quit, tree, model selector, model cycling, thinking cycling, tool/thinking collapse, external editor, queue retrieval, and platform-specific terminal setup. | `README.md`, `docs/keybindings.md`, `docs/terminal-setup.md`, `docs/tmux.md`, `docs/windows.md`, `docs/termux.md` | Desktop keybinding parity may differ due GUI conventions. |
| Extensions | Discover TypeScript extensions globally/project-locally, load explicit `--extension` paths, register custom tools/commands/UI/renderers, intercept lifecycle/tool/session/model events, and hot-reload with `/reload`. | `docs/extensions.md`, `examples/extensions/`, `src/core/extensions/`, `src/core/resource-loader.ts` | Later coverage should distinguish extension execution from Desktop plugin UX. |
| Skills | Discover Agent Skills from global, project, package, settings, and CLI locations; expose `/skill:name`; load full `SKILL.md` on demand; support helper scripts/references/assets. | `docs/skills.md`, `src/core/resource-loader.ts`, skill tests | Desktop should preserve Pi as skill runtime source. |
| Prompt templates | Discover prompt templates from configured locations/packages, expand via slash command, and allow disabling or explicit loading. | `docs/prompt-templates.md`, `src/core/prompt-templates.ts`, prompt-template tests | Later coverage should inspect template listing and invocation affordances. |
| Themes | Load built-in and custom themes, select via `/settings` or settings, hot-reload themes, and customize export colors. | `docs/themes.md`, `src/modes/interactive/theme/` | Desktop has its own design system; parity may be semantic rather than visual. |
| Pi packages | Install, remove, update, list, and configure packages that bundle extensions, skills, prompts, and themes; support global/project scope and npm/git sources. | `docs/packages.md`, `src/package-manager-cli.ts`, `src/core/package-manager.ts` | Desktop may later need package/resource management surfaces. |
| Export and sharing | Copy last assistant response, export session HTML, upload private gist share link, and configure share viewer URL. | `README.md`, `docs/usage.md`, `src/core/export-html/`, `src/modes/interactive/interactive-mode.ts` | Later Desktop transcript/history export classification should include these. |
| Diagnostics and errors | Print settings/runtime diagnostics, missing cwd recovery prompts, auth guidance, startup warnings, transient retry events, and verbose/offline startup controls. | `src/main.ts`, `src/core/auth-guidance.ts`, `docs/settings.md`, `docs/usage.md`, retry tests | Desktop should surface equivalent failures visibly. |
| Updates and telemetry | Check versions unless offline/skip flag; send install/update telemetry unless disabled; provide `pi update` and package update commands. | `docs/settings.md`, `docs/usage.md`, `src/package-manager-cli.ts`, package manager code | Likely later Desktop settings/update surface. |
| Safety and approvals | Core Pi design omits built-in permission popups and plan mode, but supports extension-based permission gates, protected paths, and custom workflow controls. | `docs/usage.md`, `docs/extensions.md`, `examples/extensions/confirm-destructive.ts`, `examples/extensions/permission-gate.ts`, `examples/extensions/protected-paths.ts` | Later gap matrix should not infer native approval UI where Pi relies on extensions. |
| Help surfaces | Show `--help`, package-command help, `/hotkeys`, `/changelog`, README/docs, and command completion in the editor. | `src/cli/args.ts`, `src/package-manager-cli.ts`, `src/modes/interactive/interactive-mode.ts`, `README.md` | Desktop help/onboarding can map to equivalent discoverability rather than exact terminal text. |

### T002 source confidence notes

- Capability rows cite implementation files when behavior affects runtime semantics.
- Docs are sufficient evidence for user-facing command names and usage examples, with implementation files listed where command handling or event behavior matters.
- This inventory avoids Desktop coverage claims and leaves parity classification for the next slice.


## T003 Desktop implemented feature source inventory

Pending.

## T004 Synthesis for coverage-matrix slice

Pending.
