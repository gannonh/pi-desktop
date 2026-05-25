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
| `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/package.json`, `dist/`, `README.md`, `docs/`, and `examples/` | Installed package runtime, docs, and examples | High-confidence source for the currently installed local `pi` executable. Use alongside `pi-mono` because the installed package may differ from the local source checkout. |

### Source confidence notes

- The local `pi-mono` checkout is the primary readable TypeScript source for Desktop integration because Pi Desktop targets the Pi SDK from that repo.
- The installed package under `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent` is the primary source for the currently installed local `pi` executable. During this slice, the installed package reported version `0.75.5` while `/Volumes/EVO/repos/pi-mono/packages/coding-agent/package.json` reported `0.74.0`.
- The next coverage-matrix slice should cite which source it uses when an installed-runtime fact and local-source fact differ.
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

### Desktop source list

| Source cluster | Source paths | Implemented feature areas | Confidence notes |
| --- | --- | --- | --- |
| Product and roadmap context | `docs/pi-desktop-high-level-roadmap.md`, `PRODUCT.md`, `CONTEXT.md`, `AGENTS.md`, `README.md`, `docs/docs-map.md` | Product purpose, app architecture, Desktop/Pi boundary, project/session language, composer terminology, prompt delivery language, run/dev/check commands, completed milestones through M07B. | High for intended product scope and milestone status. Use implementation files for exact behavior. |
| Architecture decisions | `docs/adr/0001-keep-custom-pi-session-chat-state.md`, `docs/adr/0002-composer-attachments-in-renderer.md`, `docs/adr/0003-shadcn-ui-boundary.md` | Custom `LiveSessionState`, Pi session event path, Pi `SessionManager` session metadata, renderer attachment processing, narrow IPC image payloads, custom shell/file workspace UI boundary. | High. These are accepted ADRs and match the inspected code areas. |
| Implemented specs | `docs/specs/2026-05-22-m07b-right-panel-file-workspace.md`, `docs/specs/2026-05-24-world-class-markdown-support-design.md`, `docs/specs/2026-05-24-code-file-editor-design.md` | Right-panel Files workspace, file explorer/viewer/editor, workspace file IPC, path confinement, rich/source/split Markdown authoring, CodeMirror code editor. | High for completed file/Markdown/code workspace scope. |
| Shared transport and IPC contracts | `src/shared/app-transport.ts`, `src/shared/ipc.ts`, `src/shared/preload-api.ts`, `src/shared/pi-session.ts`, `src/shared/project-state.ts`, `src/shared/workspace-files.ts`, `src/preload/index.ts` | Transport-neutral app/project/chat/Pi-session/workspace-files operations, Electron channels, renderer-safe API shape, validated Pi session events, project/chat/session metadata schemas, workspace file result unions. | High. These schemas define the Desktop boundary surface. |
| Electron main and app backend | `src/main/index.ts`, `src/main/app-backend.ts` | Window/preload setup, folder picker, Finder and clipboard IPC, backend operation dispatch, runtime event fanout, session metadata recording, workspace root resolution. | High. This is the main process integration hub. |
| Pi session runtime adapter | `src/main/pi-session/pi-session-runtime.ts`, `src/main/pi-session/pi-session-event-normalizer.ts`, `src/main/pi-session/pi-session-history.ts`, `src/main/pi-session/pi-session-settings.ts`, `src/main/pi-session/pi-session-file-actions.ts`, `src/main/pi-session/smoke-pi-session.ts` | Pi SDK session create/open, prompt submission, steering/follow-up queueing, abort/dispose, model/thinking settings/defaults, queue message labels/IDs, normalized status/message/retry/error/tool events, persisted history loading, rename/fork/clone/branch helpers. | High for runtime integration. Exact provider/model/tool behavior remains owned by Pi. |
| Project and session metadata | `src/main/projects/project-service.ts`, `src/main/projects/project-store.ts`, `src/main/projects/git.ts`, `src/main/projects/project-paths.ts`, `src/main/sessions/pi-session-index.ts`, `src/shared/project-state.ts` | Project create/add/select/rename/remove/open/locate/pin/availability, project chats, standalone chats, chat rename/fork/clone/branch, session refresh, start targets, session status/title sync, validated atomic local store, Pi `SessionManager` index. | High. These files own Desktop metadata and session list behavior. |
| Renderer app/session state | `src/renderer/App.tsx`, `src/renderer/session/session-state.ts` | Top-level project/session state, event filtering, pending start events, history hydration, start/submit prompt, model/thinking changes, queued message operations, abort, `LiveSessionState` reducers for messages/tools/settings/queues/errors. | High. This is the renderer state hub. |
| Chat route and composer view models | `src/renderer/chat/chat-view-model.ts`, `src/renderer/chat/composer-view-model.ts`, `src/renderer/chat/composer-state.ts`, `src/renderer/chat/composer-enter-key.ts`, `src/renderer/chat/composer-attachments-state.ts`, `src/renderer/chat/use-stick-to-bottom-scroll.ts` | Global/project/standalone start states, unavailable project states, session layout decisions, project/model/thinking composer options, runtime disabled reasons, send/abort state, Enter/Shift+Enter/Option+Enter behavior, attachment limits, transcript stick-to-bottom behavior. | High. Pure view-model/helper files make UI behavior traceable. |
| Composer and attachments UI | `src/renderer/components/composer.tsx`, `src/renderer/attachments/attachment-types.ts`, `src/renderer/attachments/attachment-utils.ts`, `src/renderer/attachments/convert-attachments.ts`, `src/renderer/attachments/resize-composer-images.ts` | Composer input, project/model/thinking controls, attachment add/drop/paste/file input, queued message rows with switch/edit/delete, send/abort actions, PDF/DOCX/PPTX/Excel/text/image extraction, document text prompt merge, image resizing and session payload conversion. | High. Matches ADR 0002 and M06 composer scope. |
| Transcript and chat shell UI | `src/renderer/components/chat-shell.tsx`, `src/renderer/components/transcript-panel.tsx`, `src/renderer/components/live-session-transcript.tsx`, `src/renderer/components/message-content.tsx`, `src/renderer/chat/use-stick-to-bottom-scroll.ts` | Start/session layout, transcript loading/error/empty/live states, status strip, retry/error display, grouped message rows, Markdown rendering for user/assistant messages, collapsible tool rows, system callouts, Jump to latest. | High. Maps to M05 transcript rendering and M06 composer placement. |
| Right-panel workspace shell | `src/renderer/right-panel/right-panel-types.ts`, `src/renderer/right-panel/right-panel-state.ts`, `src/renderer/right-panel/right-panel-body.tsx`, `src/renderer/right-panel/right-panel-workspace.tsx`, `src/renderer/right-panel/workspace-file-tabs.tsx`, `src/renderer/right-panel/workspace-tab-ids.ts` | Right-side tab model, default Terminal/Browser/Files/Diffs panel kinds, add/activate/remove/collapse state, singleton Files workspace activation, active file tab strip with dirty markers, mock panel routing. | High for workspace shell. Terminal/browser/diffs are currently mock panel kinds per roadmap. |
| Workspace file main services | `src/shared/workspace-files.ts`, `src/main/workspace-files/path-guard.ts`, `src/main/workspace-files/workspace-files-service.ts`, `src/main/workspace-files/text-file-policy.ts` | Project-scoped list/read/write schemas, project-root path guard, symlink realpath confinement, directory listing, safe text reads/writes, binary/large/not-found/unsupported states, supported file policy and size/null-byte checks. | High. This is the file IO safety boundary. |
| File workspace renderer | `src/renderer/file-workspace/file-workspace-context.tsx`, `src/renderer/file-workspace/file-workspace-state.ts`, `src/renderer/file-workspace/file-workspace-panel.tsx`, `src/renderer/file-workspace/file-explorer.tsx`, `src/renderer/file-workspace/file-viewer.tsx`, `src/renderer/file-workspace/file-editor.tsx`, `src/renderer/file-workspace/file-empty-states.tsx`, `src/renderer/file-workspace/file-explorer-icons.ts`, `src/renderer/file-workspace/file-workspace-guard.ts`, `src/renderer/file-workspace/confirm-discard.ts`, `src/renderer/file-workspace/file-workspace-paths.ts`, `src/renderer/file-workspace/file-workspace-types.ts` | Project-scoped file workspace provider, lazy explorer loading, directory cache, open/select/close tabs, dirty buffers, save state, discard guard, split explorer/viewer layout, breadcrumbs, Markdown mode toggle, keyboard save, blocked states, icons, no-project/missing/unavailable states. | High. This is the implemented right-panel file UX. |
| Markdown and code editing | `src/renderer/markdown/render-markdown-html.ts`, `src/renderer/markdown/markdown-surface.tsx`, `src/renderer/markdown/rich-markdown-editor.tsx`, `src/renderer/markdown/markdown-source-editor.tsx`, `src/renderer/markdown/markdown-code-block.tsx`, `src/renderer/markdown/markdown-image-policy.ts`, `src/renderer/code-editor/code-file-editor.tsx`, `src/renderer/code-editor/code-language.ts`, `src/renderer/code-editor/code-editor-theme.ts` | Sanitized Markdown rendering, Preview/Markdown/Split authoring, rich Markdown editor, Markdown source editor, rendered code block copy behavior, local image policy notices, CodeMirror-backed source editor, language detection, theme/extensions. | High. Matches implemented Markdown/code editor specs. |

### Implemented feature areas by source cluster

- Desktop app shell and transport boundary: Electron main process, preload isolation, typed IPC, app backend operation dispatch, and web-preview-compatible shared transport.
- Pi session runtime: SDK-backed session create/open, prompt and follow-up submission, steering/follow-up queue controls, abort, dispose, runtime settings, event normalization, retry/error/tool events, and persisted history loading.
- Project and session management: project CRUD, availability, pin/open/locate flows, project chats, standalone chats, session refresh/listing, title/status metadata, rename/fork/clone/branch hooks where Pi session file actions support them.
- Composer and prompt inputs: project-start/session composer, model and thinking controls, runtime/auth disabled reasons, attachments, document text extraction, image resizing/payloads, keyboard submission, queued message rows, delivery switching, edit/delete, send, and abort.
- Transcript rendering: live and history transcript state, loading/error/empty states, Markdown rendering, grouped messages, tool rows, status/retry/error display, and stick-to-bottom scrolling.
- Right-panel workspace: tabbed right panel shell, mock Terminal/Browser/Diffs panels, singleton Files workspace, open file tabs, dirty state markers, and file tab close/switch behavior.
- File workspace: project-root-confined file explorer, text file read/write, unsupported/binary/large states, dirty buffers, explicit save, discard prompts, Markdown rich/source/split modes, and CodeMirror code editing.

### T003 source confidence notes

- Implementation files are the source of truth for already-ported Desktop feature sources.
- Roadmap/spec/ADR files provide milestone intent and completion context, but implementation files should settle behavior details in the coverage matrix.
- This inventory identifies implemented Desktop sources and does not classify parity gaps.


## T004 Synthesis for coverage-matrix slice

### Durable output

This file is the durable S001 source inventory output. It contains:

- CLI source evidence in T001.
- CLI capability inventory in T002.
- Desktop implemented feature source inventory in T003.
- Source confidence notes and open questions below.

### How to use this in the coverage-matrix slice

Use T002 rows as the left-side capability set for AUDIT-02. Use T003 source clusters as the Desktop evidence set for AUDIT-03. For each matrix row:

1. Start from one CLI capability row in T002.
2. Copy the cited CLI evidence paths into the matrix evidence field.
3. Inspect the relevant T003 source cluster for Desktop implementation evidence.
4. Classify coverage only after checking the cited implementation files.
5. Record source confidence when evidence comes from docs/specs rather than implementation files.

### Suggested matrix seeds

- Startup/session start: T002 startup modes, SDK embedding, sessions; T003 app backend, Pi runtime adapter, project/session metadata, chat route view model.
- Prompt delivery and queueing: T002 prompt delivery, abort/recovery; T003 runtime adapter, renderer session state, composer, queue controls.
- Model and thinking controls: T002 model selection and thinking controls; T003 Pi session settings, composer view model, composer UI.
- Tool visibility and transcript events: T002 built-in tools and tool events; T003 event normalizer, session state, transcript UI, right-panel workspace.
- Session history and branching: T002 sessions, session tree/fork/clone, compaction; T003 Pi session history, project service, Pi session file actions, session index.
- File and image inputs: T002 file/image inputs; T003 composer attachments, attachment conversion, shared Pi session image schemas.
- Extensibility resources: T002 extensions, skills, prompt templates, themes, Pi packages; T003 shared contracts, app backend, Pi runtime adapter, roadmap non-goals.
- Local file workspace: T002 built-in file tools and file arguments; T003 right-panel workspace, workspace file main services, file workspace renderer, Markdown/code editing.
- Diagnostics and failure visibility: T002 diagnostics/errors, safety/approval patterns; T003 runtime event normalizer, project availability, workspace file error states, product safety docs.

### Assumptions

- Pi remains the source of agent behavior, providers, models, sessions, tools, skills, extensions, prompt templates, and themes.
- Desktop implementation evidence should come from `src/` first, then ADRs/specs/roadmap for intent and completion context.
- Terminal-specific CLI affordances can map to Desktop GUI equivalents in the matrix, but classification should explain the mapping.
- This output is intentionally source inventory only; no parity gap status is assigned here.

### Open questions for the next slice

- Which Pi version should be the baseline for CLI parity classification when installed `pi` and `/Volumes/EVO/repos/pi-mono` differ? Current evidence: installed package `0.75.5`, local source checkout `0.74.0`.
- Should extension/package management be classified as MVP parity, later milestone scope, or out-of-scope for the paused right-panel roadmap replacement?
- Should terminal-only affordances such as `!!command`, Ctrl+G external editor, and terminal theme customization map to explicit Desktop UI requirements or remain CLI-only capabilities?
- Should mock right-panel Terminal/Browser/Diffs tabs count as implemented Desktop sources only for shell/tab behavior, with live tool/terminal/browser parity deferred?

### Verification

- `grep -q '## T001 CLI source material audit' docs/specs/2026-05-25-cli-parity-source-inventory.md`
- `grep -q '## T002 CLI capability inventory' docs/specs/2026-05-25-cli-parity-source-inventory.md`
- `grep -q '## T003 Desktop implemented feature source inventory' docs/specs/2026-05-25-cli-parity-source-inventory.md`
- `grep -q '### Open questions for the next slice' docs/specs/2026-05-25-cli-parity-source-inventory.md`
- `node -e "const a=require('/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/package.json'); console.log(a.version)"`
- `node -e "const a=require('/Volumes/EVO/repos/pi-mono/packages/coding-agent/package.json'); console.log(a.version)"`
