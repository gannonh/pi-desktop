# pi-desktop PRD and Roadmap

## Summary

`pi-desktop` is to the Pi coding agent CLI what the Codex desktop app is to the Codex CLI: a graphical command center that makes local coding-agent work easier to start, inspect, resume, and manage.

`pi-desktop` is a macOS desktop app for the Pi coding agent. The first product goal is a local, open-source desktop command center for coding sessions: project selection, persistent conversations, streaming agent output, tool visibility, file previews, diffs, terminal output, settings, and session history.

The app starts as a desktop shell around the existing Pi runtime through the TypeScript SDK from `/Volumes/EVO/repos/pi-mono`. Later milestones add Git worktrees, extensibility surfaces, automations, browser/computer-use workflows, remote workspaces, and cross-platform support.

## Reference Inputs

- `pi-mono` local repo: `/Volumes/EVO/repos/pi-mono`
- Key Pi packages: `@earendil-works/pi-coding-agent`, `@earendil-works/pi-agent-core`, `@earendil-works/pi-web-ui`
- Codex app public landing page: `https://chatgpt.com/codex/?app-landing-page=true`
- Read-only Codex app inventory from `/Applications/Codex.app/Contents/`

The Codex app inventory informs feature mapping and desktop packaging expectations. `pi-desktop` will use original UI, assets, copy, and implementation.

## Product Goals

- Give Pi a graphical desktop workspace for coding sessions.
- Preserve Pi as the source of agent behavior, tools, provider/model logic, session execution, and extension primitives.
- Make agent work observable through streaming messages, tool calls, terminal output, diffs, file previews, and session state.
- Keep the first release macOS-only.
- Use the Pi TypeScript SDK first for tight integration with the existing runtime.
- Ship milestones sequentially so each stage leaves a runnable, demoable app.

## Non-Goals for MVP

- Cloud workspaces.
- Cross-platform packaging.
- Computer-use automation.
- Browser/Chrome automation.
- Plugin marketplace.
- Full MCP management.
- Multi-agent orchestration.
- In-app PR review parity.
- Reimplementing Pi provider/model/tool internals inside `pi-desktop`.

## Target Users

- Developers who want Pi in a desktop app with persistent workspace context.
- Maintainers who need visible tool execution, diffs, and terminal output.
- Agent power users who want Codex-like session management with an open-source runtime.

## MVP User Experience

1. User opens `pi-desktop`.
2. User selects a local project folder.
3. App shows a project home with recent sessions and a new-session action.
4. User starts a Pi-backed coding session.
5. App streams user messages, assistant messages, thinking/tool events, and errors.
6. User can inspect tool calls, terminal output, file previews, and diffs.
7. User can abort an active run and send follow-up or steering instructions.
8. App persists session metadata and lets the user resume recent work.
9. User can configure model, provider/auth handoff, thinking level, theme, and project instructions.

## Architecture

### App Shell

Electron main process owns:

- App lifecycle.
- Windows.
- Native menus.
- Native file/folder dialogs.
- Secure IPC.
- App packaging.
- Update support in a later milestone.

### Renderer

Renderer owns:

- Project home.
- Session UI.
- Message stream.
- Tool timeline.
- File preview panels.
- Diff panels.
- Terminal/output panels.
- Settings.
- Session browser.

### Pi Runtime Adapter

The runtime adapter owns the boundary between `pi-desktop` and `pi-mono`.

Responsibilities:

- Create and manage Pi SDK sessions.
- Subscribe to agent events.
- Normalize event data for renderer state.
- Send prompts, steering messages, follow-ups, aborts, retries, and model changes.
- Surface runtime errors without hiding failures.
- Keep Pi provider/model/tool behavior inside Pi packages.

### Local Store

The local store tracks desktop metadata:

- Recent projects.
- Workspace display names.
- Session index.
- Session UI metadata.
- App preferences.
- Provider/auth references where safe.

The store should avoid duplicating full Pi session history if Pi already persists it.

## Data Flow

1. Renderer sends user action to Electron main through a typed IPC command.
2. Main delegates session actions to the Pi runtime adapter.
3. Pi runtime emits agent events.
4. Adapter normalizes events into renderer-safe data.
5. Renderer updates message stream, tool timeline, panels, and status indicators.
6. Local store persists app metadata at stable points.

Errors should travel through the same event path as normal session state so the UI can show what failed and where.

## Security and Trust

MVP guardrails:

- Start from explicit folder selection.
- Show the current workspace path clearly.
- Show tool calls and terminal output as first-class events.
- Provide abort controls during active work.
- Use typed IPC and narrow preload APIs.
- Keep provider secrets out of renderer-accessible state.
- Fail visibly when auth, runtime creation, filesystem access, or tool execution fails.

Later guardrails:

- Permission policies for destructive tools.
- Workspace trust prompts.
- Plugin/package trust surfaces.
- Sandboxed or isolated execution modes.
- Audit logs for automation.

## Roadmap

### Milestone 0: Foundation

Goal: establish a runnable macOS Electron app with project conventions.

Deliverables:

- Electron, Vite, TypeScript project scaffold.
- App window with basic shell layout.
- Local development commands.
- Lint, typecheck, and test commands.
- `.gitignore` and repo hygiene.
- Initial app state and IPC conventions.
- Basic packaging skeleton for macOS.

Acceptance:

- App starts locally.
- A smoke test verifies main window boot.
- CI or local check command validates formatting, linting, typechecking, and tests.

### Milestone 1: Project Home

Goal: let users select and revisit local workspaces.

Deliverables:

- Open-folder flow.
- Recent projects list.
- Workspace metadata store.
- Project home route.
- New session entry point.
- Empty and error states for missing/unavailable folders.

Acceptance:

- User can open a local folder and see it as the active workspace.
- Recent projects persist across app restarts.
- Missing folders show a visible recovery path.

### Milestone 2: Pi Session MVP

Goal: run a real Pi-backed coding session through the SDK.

Deliverables:

- Pi SDK dependency and runtime adapter.
- Session creation for selected workspace.
- Prompt submission.
- Streaming assistant messages.
- Agent status indicators.
- Abort support.
- Retry support where Pi exposes it.
- Runtime error display.

Acceptance:

- User can ask Pi a question in a selected workspace and see a streamed response.
- User can abort an active run.
- Runtime startup/auth/model errors display clearly.

### Milestone 3: Coding Panels

Goal: make agent work inspectable.

Deliverables:

- Tool call timeline.
- Tool result renderer.
- Terminal/output panel.
- File preview panel.
- Patch/diff panel.
- Active panel navigation.
- Collapsed/expanded tool output state.

Acceptance:

- Tool calls render with status, input summary, and result summary.
- File read/write/edit events can be inspected.
- Diffs are readable before and after file edits.

### Milestone 4: Session Management

Goal: make desktop sessions resumable and navigable.

Deliverables:

- Session list for the active workspace.
- Resume existing session.
- Session names.
- Session metadata persistence.
- Session stats view.
- Branch/fork/clone support where Pi SDK exposes stable APIs.

Acceptance:

- User can quit the app, reopen it, and resume a previous session.
- User can distinguish sessions by project, name, recency, and status.

### Milestone 5: Settings and Auth

Goal: expose core Pi configuration in desktop UI.

Deliverables:

- Provider/auth setup flow or handoff to Pi auth storage.
- Model selector.
- Thinking level selector.
- Project instructions display.
- Theme and appearance settings.
- App preferences storage.
- Diagnostics view for Pi runtime and environment.

Acceptance:

- User can configure the active model and thinking level.
- Auth failures explain the required next action.
- Settings persist across restarts.

### Milestone 6: Worktrees and Git UX

Goal: support branch-based coding workflows.

Deliverables:

- Git status summary.
- Worktree list.
- Create worktree flow.
- Switch workspace/worktree flow.
- Diff overview.
- Commit preparation surface.
- PR-oriented metadata view.

Acceptance:

- User can create or switch to a Git worktree from the app.
- User can inspect changed files and diffs.
- User can prepare a commit with explicit file selection.

### Milestone 7: Extensibility

Goal: expose Pi customization through desktop surfaces.

Deliverables:

- Skills view.
- Prompt templates view.
- Extensions/packages view.
- Enable/disable controls.
- Package install/update/remove flows where Pi APIs are stable.
- Trust and source metadata display.

Acceptance:

- User can see discovered skills/prompts/extensions for a workspace.
- User can enable, disable, or inspect available customization sources.

### Milestone 8: Automation and Advanced Surfaces

Goal: explore Codex-like advanced desktop workflows after the local core is stable.

Deliverables:

- Automation model and UI prototype.
- Scheduled task runner prototype.
- Browser/in-app browser research spike.
- Computer-use research spike.
- Remote/cloud workspace research spike.
- MCP settings research spike.
- PR review workflow prototype.

Acceptance:

- Each advanced feature has a tested prototype or a documented decision to defer.
- Automation work includes visible status, logs, and cancellation.

## Success Metrics

- User can run a useful Pi coding session from the desktop app.
- Session output exposes message, tool, terminal, and diff state in one view.
- App restart and session resume are reliable.
- Tool and file changes are visible before the user commits.
- Runtime failures are actionable.
- Milestones can be executed independently without blocking on cloud infrastructure.

## Risks

- Pi SDK APIs may need stabilization for desktop embedding.
- `pi-web-ui` may accelerate UI work but may not fit desktop coding-specific panels directly.
- Session persistence may duplicate Pi storage unless boundaries stay explicit.
- Electron security needs discipline from the first IPC boundary.
- Native packaging, signing, and updates can consume time if pulled into MVP too early.
- Provider auth UX may differ across Pi-supported providers.

## Open Questions

- Should `pi-desktop` live as an independent repo with published packages from `pi-mono`, or should it temporarily consume `pi-mono` through a local workspace link during early development?
- Which UI stack should the renderer use: React, Lit/web components, or a minimal custom stack aligned with `pi-web-ui`?
- Should the app reuse `pi-web-ui` components directly, fork/adapt them, or treat them as reference APIs only?
- What is the first provider/auth path for demos?
- Should local session metadata use SQLite, IndexedDB, or file-backed JSON for the first milestones?
- Which Pi SDK APIs need public contracts before Milestone 2 starts?

## First Implementation Planning Target

The first executable plan should cover Milestone 0 only. It should create a minimal macOS Electron app, establish repo commands, and leave clear interfaces for the runtime adapter and renderer state without implementing the agent session yet.
