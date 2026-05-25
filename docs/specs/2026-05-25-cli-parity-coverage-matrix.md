# CLI parity coverage matrix

## Baseline

- Milestone: M001 CLI Parity Audit and Gap Roadmap
- Slice: S002 Gap-prioritized roadmap synthesis
- Source inventory: `docs/specs/2026-05-25-cli-parity-source-inventory.md`
- CLI baseline: installed Pi package `0.75.5`, with local readable source checkout `/Volumes/EVO/repos/pi-mono` at `0.74.0`
- Desktop baseline commit before S002: `fcd9fa8e`
- Evidence date: 2026-05-25

## Classification vocabulary

- Release-blocking: needed before the next local Desktop release can satisfy the MVP observability, settings/auth, or recovery expectations already stated in the roadmap.
- Deferred: valid Pi capability that should remain in a later Desktop milestone after the local session, file, diff, terminal, settings, and auth path is stable.
- Desktop-native equivalent: Desktop already maps the CLI capability through GUI session, composer, transcript, project, or file-workspace flows.
- Out of scope: CLI, terminal, packaging, or runtime-internal behavior that Desktop should not reproduce as a product feature.

## Priority summary

### Release-blocking gaps

- Right-panel diff and patch review: the roadmap promises inspectable diffs, while current Desktop evidence only identifies a mock Diffs panel kind.
- Right-panel terminal and command output: the roadmap promises terminal/tool output visibility, while current Desktop evidence has transcript tool rows and mock terminal tabs but no dedicated live output surface.
- Settings, auth, and diagnostics: Pi exposes provider/auth, settings, model, thinking, runtime diagnostics, and auth guidance, while Desktop has model/thinking composer controls and runtime errors but no Settings/Auth milestone implementation yet.
- Tool event detail: Pi emits tool lifecycle events. Desktop renders readable transcript rows, but detailed tool/output inspection remains future right-panel work.

### Deferred gaps

- Session tree navigation, advanced branch controls, compaction controls/events, export/share, changelog/help polish, extension/package/resource management, update management, and explicit safety policy UI.
- These are important for power users but do not block the next local release once core observability, settings/auth, and recovery surfaces are visible.

### Desktop-native equivalents

- Interactive session start, SDK-backed live sessions, prompt delivery, steering/follow-up queues, abort, model/thinking selection, project/session metadata, transcript rendering, attachments, and project file browsing/editing map to existing Desktop GUI flows.

### Out-of-scope CLI parity

- `--print`, JSON mode, RPC mode, terminal compatibility docs, TUI theme parity, and reimplementation of Pi provider/model/tool internals remain CLI/runtime concerns.

## Capability records

### CLI-STARTUP-001: Startup and modes

- Classification: Desktop-native equivalent.
- Release impact: Desktop starts sessions through project/chat selection instead of terminal flags.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/cli/args.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/main.ts`, `docs/usage.md`, `README.md`.
- Desktop evidence: `src/main/pi-session/pi-session-runtime.ts`, `src/renderer/chat/chat-view-model.ts`, `src/renderer/components/composer.tsx`.
- Disposition: keep GUI start/resume flows as the parity target.

### CLI-MODES-002: Print and JSON modes

- Classification: Out of scope.
- Release impact: one-shot terminal and JSON stream modes are integration surfaces, not Desktop user workflows.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/cli/args.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/json.md`.
- Desktop evidence: `src/shared/app-transport.ts`, `src/main/app-backend.ts` for Desktop transport boundaries.
- Disposition: do not add Desktop UI parity for `--print` or `--mode json`.

### CLI-RPC-003: RPC mode

- Classification: Out of scope.
- Release impact: Desktop uses the TypeScript SDK first, as recorded in the roadmap.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/rpc.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/modes/rpc/`.
- Desktop evidence: `docs/pi-desktop-high-level-roadmap.md`, `src/main/pi-session/pi-session-runtime.ts`.
- Disposition: keep RPC as an alternate integration reference, not a Desktop feature target.

### CLI-SDK-004: SDK embedding

- Classification: Desktop-native equivalent.
- Release impact: SDK parity is core Desktop architecture and already implemented for sessions.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/sdk.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/examples/sdk/`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/sdk.ts`.
- Desktop evidence: `src/main/pi-session/pi-session-runtime.ts`, `src/main/pi-session/pi-session-event-normalizer.ts`, `src/renderer/session/session-state.ts`.
- Disposition: continue treating the SDK as the runtime boundary.

### CLI-TUI-005: Interactive TUI shell

- Classification: Desktop-native equivalent.
- Release impact: terminal shell layout maps to app shell, sidebar, transcript, and composer.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/modes/interactive/interactive-mode.ts`, `docs/usage.md`.
- Desktop evidence: `src/renderer/App.tsx`, `src/renderer/components/chat-shell.tsx`, `src/renderer/components/live-session-transcript.tsx`.
- Disposition: no terminal-layout parity needed.

### CLI-EDITOR-006: Editor input

- Classification: Desktop-native equivalent.
- Release impact: Desktop composer covers multiline input, attachments, keyboard submit behavior, and visible send/abort state.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/modes/interactive/interactive-mode.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/keybindings.md`.
- Desktop evidence: `src/renderer/components/composer.tsx`, `src/renderer/chat/composer-enter-key.ts`, `src/renderer/chat/composer-attachments-state.ts`, `src/renderer/attachments/convert-attachments.ts`.
- Disposition: keep `@file` autocomplete and external editor behavior deferred unless a later UX milestone adopts them.

### CLI-COMMANDS-007: Slash commands

- Classification: Deferred.
- Release impact: core commands map to GUI controls, but complete slash-command parity is a power-user layer.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/modes/interactive/interactive-mode.ts`, `README.md`, `docs/usage.md`.
- Desktop evidence: `src/renderer/components/composer.tsx`, `src/main/pi-session/pi-session-file-actions.ts`, `src/main/projects/project-service.ts`.
- Disposition: cover commands through focused GUI milestones instead of adding a broad slash-command clone.

### CLI-DELIVERY-008: Prompt delivery while busy

- Classification: Desktop-native equivalent.
- Release impact: steering and follow-up are active MVP behaviors.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/usage.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/sdk.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/modes/interactive/interactive-mode.ts`.
- Desktop evidence: `src/main/pi-session/pi-session-runtime.ts`, `src/renderer/session/session-state.ts`, `src/renderer/components/composer.tsx`.
- Disposition: preserve queue visibility and editing in the composer.

### CLI-ABORT-009: Abort and recovery

- Classification: Desktop-native equivalent.
- Release impact: abort and visible runtime errors are already part of the chat/composer path.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/usage.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/sdk.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/modes/interactive/interactive-mode.ts`.
- Desktop evidence: `src/main/pi-session/pi-session-runtime.ts`, `src/renderer/session/session-state.ts`, `src/renderer/chat/composer-view-model.ts`.
- Disposition: keep recovery gaps tied to diagnostics work.

### CLI-BASH-010: Bash shortcuts

- Classification: Deferred.
- Release impact: command-output visibility is release-blocking, but `!` and `!!` prefix parity is a terminal-specific affordance.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/usage.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/modes/interactive/interactive-mode.ts`.
- Desktop evidence: `src/renderer/components/live-session-transcript.tsx`, `src/renderer/right-panel/right-panel-body.tsx`.
- Disposition: prioritize right-panel command output before deciding whether Desktop needs explicit bash shortcut UI.

### CLI-TOOLS-011: Built-in tools

- Classification: Out of scope.
- Release impact: Pi owns tool definitions and execution semantics.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/tools/`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/cli/args.ts`.
- Desktop evidence: `src/main/pi-session/pi-session-event-normalizer.ts`, `src/renderer/components/transcript-panel.tsx`.
- Disposition: Desktop should inspect and render tool events, not reimplement built-in tools.

### CLI-TOOL-EVENTS-012: Tool events

- Classification: Release-blocking.
- Release impact: MVP observability requires first-class tool and terminal output inspection; current right-panel Terminal and Diffs surfaces are not live.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/agent/src/types.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/tools/`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/json.md`.
- Desktop evidence: `src/main/pi-session/pi-session-event-normalizer.ts`, `src/renderer/session/session-state.ts`, `src/renderer/components/live-session-transcript.tsx`, `src/renderer/right-panel/right-panel-body.tsx`.
- Disposition: target M07D Terminal and Command Output.

### CLI-SESSIONS-013: Sessions

- Classification: Desktop-native equivalent.
- Release impact: Desktop project/chat/session lists already map to Pi session persistence.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/sessions.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/session-manager.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/main.ts`.
- Desktop evidence: `src/main/sessions/pi-session-index.ts`, `src/main/projects/project-service.ts`, `src/renderer/App.tsx`.
- Disposition: continue using Pi `SessionManager` metadata as the persisted session source.

### CLI-BRANCH-014: Session tree, fork, and clone

- Classification: Deferred.
- Release impact: branch helpers exist where Pi exposes them, but full tree navigation is not required for the next local release.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/sessions.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/session-format.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/session-manager.ts`.
- Desktop evidence: `src/main/pi-session/pi-session-file-actions.ts`, `src/main/pi-session/pi-session-history.ts`, `src/main/projects/project-service.ts`.
- Disposition: keep advanced tree UI for a later session-history milestone.

### CLI-COMPACTION-015: Compaction

- Classification: Deferred.
- Release impact: Pi owns automatic context management; Desktop can defer explicit compaction controls/events.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/compaction.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/compaction/`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/settings.md`.
- Desktop evidence: `src/main/pi-session/pi-session-event-normalizer.ts`, `src/renderer/session/session-state.ts`.
- Disposition: add to later settings/session-history scope if maintainer feedback requires it.

### CLI-AUTH-016: Providers and auth

- Classification: Release-blocking.
- Release impact: the roadmap promises provider/auth handoff and actionable auth failures; Settings/Auth remains unimplemented.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/README.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/providers.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/model-registry.ts`, `/Volumes/EVO/repos/pi-mono/packages/ai/src/`.
- Desktop evidence: `src/main/pi-session/pi-session-runtime.ts`, `src/renderer/chat/composer-view-model.ts`, `docs/pi-desktop-high-level-roadmap.md`.
- Disposition: target M0X Settings and Auth before broad extensibility work.

### CLI-MODELS-017: Model selection

- Classification: Desktop-native equivalent.
- Release impact: Desktop exposes model selection through composer controls backed by Pi runtime settings.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/cli/args.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/models.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/model-resolver.ts`.
- Desktop evidence: `src/main/pi-session/pi-session-settings.ts`, `src/renderer/chat/composer-view-model.ts`, `src/renderer/components/composer.tsx`.
- Disposition: fold advanced defaults into Settings/Auth.

### CLI-THINKING-018: Thinking controls

- Classification: Desktop-native equivalent.
- Release impact: Desktop exposes thinking level controls through composer/runtime state.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/cli/args.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/settings.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/sdk.md`.
- Desktop evidence: `src/main/pi-session/pi-session-settings.ts`, `src/renderer/chat/composer-view-model.ts`, `src/renderer/components/composer.tsx`.
- Disposition: fold persistent defaults into Settings/Auth.

### CLI-SETTINGS-019: Settings

- Classification: Release-blocking.
- Release impact: Desktop needs a visible settings surface for the roadmap's MVP settings/auth goal.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/settings.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/settings-manager.ts`.
- Desktop evidence: `src/main/pi-session/pi-session-settings.ts`, `src/renderer/chat/composer-view-model.ts`, `docs/pi-desktop-high-level-roadmap.md`.
- Disposition: target M0X Settings and Auth.

### CLI-CONTEXT-020: Context files and system prompts

- Classification: Deferred.
- Release impact: Pi loads context files; Desktop should display project instructions later but does not need to reimplement loading.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/usage.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/resource-loader.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/system-prompt.ts`.
- Desktop evidence: `AGENTS.md`, `src/main/pi-session/pi-session-runtime.ts`, `docs/pi-desktop-high-level-roadmap.md`.
- Disposition: include project-instructions display in Settings/Auth or a later project-context milestone.

### CLI-FILES-021: File and image inputs

- Classification: Desktop-native equivalent.
- Release impact: attachments and project file workspace cover the user-facing Desktop path.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/cli/file-processor.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/utils/clipboard-image.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/sdk.md`.
- Desktop evidence: `src/renderer/attachments/convert-attachments.ts`, `src/renderer/attachments/resize-composer-images.ts`, `src/main/workspace-files/workspace-files-service.ts`, `src/renderer/file-workspace/file-workspace-panel.tsx`.
- Disposition: no new release-blocking work.

### CLI-KEYS-022: Keybindings and terminal compatibility

- Classification: Out of scope.
- Release impact: terminal compatibility docs do not map directly to Desktop release requirements.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/keybindings.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/terminal-setup.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/tmux.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/windows.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/termux.md`.
- Desktop evidence: `src/renderer/chat/composer-enter-key.ts`, `docs/pi-desktop-high-level-roadmap.md`.
- Disposition: only keep Desktop-native keyboard shortcuts where the GUI needs them.

### CLI-EXTENSIONS-023: Extensions

- Classification: Deferred.
- Release impact: Pi extension execution remains runtime-owned; Desktop management UI can follow local core release work.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/extensions.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/examples/extensions/`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/extensions/`.
- Desktop evidence: `docs/pi-desktop-high-level-roadmap.md` M0X Extensibility.
- Disposition: target M0X Extensibility after Settings/Auth.

### CLI-SKILLS-024: Skills

- Classification: Deferred.
- Release impact: Pi owns skill discovery/loading; Desktop inspection and management can follow core release work.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/skills.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/resource-loader.ts`.
- Desktop evidence: `docs/pi-desktop-high-level-roadmap.md` M0X Extensibility.
- Disposition: target M0X Extensibility.

### CLI-TEMPLATES-025: Prompt templates

- Classification: Deferred.
- Release impact: prompt-template discovery and invocation are power-user resource management surfaces.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/prompt-templates.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/prompt-templates.ts`.
- Desktop evidence: `docs/pi-desktop-high-level-roadmap.md` M0X Extensibility.
- Disposition: target M0X Extensibility.

### CLI-THEMES-026: Themes

- Classification: Out of scope.
- Release impact: Desktop has its own design system and should not copy TUI theme parity.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/themes.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/modes/interactive/theme/`.
- Desktop evidence: `DESIGN.md`, `src/renderer/styles.css`, `docs/adr/0003-shadcn-ui-boundary.md`.
- Disposition: keep Desktop appearance work in Desktop design tokens.

### CLI-PACKAGES-027: Pi packages

- Classification: Deferred.
- Release impact: package/resource management can follow extensibility inspection.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/packages.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/package-manager-cli.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/package-manager.ts`.
- Desktop evidence: `docs/pi-desktop-high-level-roadmap.md` M0X Extensibility.
- Disposition: target M0X Extensibility after core settings/auth and observability.

### CLI-EXPORT-028: Export and sharing

- Classification: Deferred.
- Release impact: useful session output feature, but lower priority than diff, terminal, settings, and auth.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/README.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/usage.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/export-html/`.
- Desktop evidence: `src/renderer/components/live-session-transcript.tsx`, `src/main/sessions/pi-session-index.ts`.
- Disposition: schedule after session-history and transcript polish work.

### CLI-DIAGNOSTICS-029: Diagnostics and errors

- Classification: Release-blocking.
- Release impact: visible runtime, auth, filesystem, and tool failures are explicit Desktop safety requirements.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/main.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/core/auth-guidance.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/settings.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/usage.md`.
- Desktop evidence: `src/main/pi-session/pi-session-event-normalizer.ts`, `src/renderer/session/session-state.ts`, `src/renderer/file-workspace/file-empty-states.tsx`, `docs/pi-desktop-high-level-roadmap.md`.
- Disposition: target M0X Settings and Auth plus right-panel failure states.

### CLI-UPDATES-030: Updates and telemetry

- Classification: Deferred.
- Release impact: update/package telemetry does not block the next Desktop local release.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/settings.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/usage.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/package-manager-cli.ts`.
- Desktop evidence: `docs/pi-desktop-high-level-roadmap.md` packaging and update notes.
- Disposition: revisit during packaging/release management.

### CLI-SAFETY-031: Safety and approvals

- Classification: Deferred.
- Release impact: Desktop must show tool and filesystem state clearly now; explicit permission-policy UI can follow.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/docs/extensions.md`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/examples/extensions/confirm-destructive.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/examples/extensions/permission-gate.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/examples/extensions/protected-paths.ts`.
- Desktop evidence: `docs/pi-desktop-high-level-roadmap.md`, `src/main/workspace-files/path-guard.ts`, `src/shared/preload-api.ts`.
- Disposition: schedule after tool/output and workspace trust surfaces mature.

### CLI-HELP-032: Help surfaces

- Classification: Deferred.
- Release impact: help polish can follow core settings/auth and observability.
- CLI evidence: `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/cli/args.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/package-manager-cli.ts`, `/Volumes/EVO/repos/pi-mono/packages/coding-agent/src/modes/interactive/interactive-mode.ts`, `README.md`.
- Desktop evidence: `README.md`, `docs/docs-map.md`, `docs/pi-desktop-high-level-roadmap.md`.
- Disposition: revisit with onboarding/settings work.

## T005 verification notes

- Every T002 capability row from `docs/specs/2026-05-25-cli-parity-source-inventory.md` has one capability record above.
- Each release-blocking or deferred item includes a release impact statement and disposition.
- Desktop-native equivalents cite implementation paths under `src/` when available.
