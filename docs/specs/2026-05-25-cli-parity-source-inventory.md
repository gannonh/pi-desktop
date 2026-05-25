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

Pending.

## T003 Desktop implemented feature source inventory

Pending.

## T004 Synthesis for coverage-matrix slice

Pending.
