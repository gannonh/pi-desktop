# M07A.2 Right Panel Tab Shell Spec
## Status
Implemented
## Goal
Build a UI-first right-side tab workspace beside the chat column, using mock data first, so Pi Desktop can iterate on concrete panels like Terminal, Browser, Markdown/File, and Diffs/PR before wiring each panel to live runtime data.
## Background
M07A added structured Pi tool execution events and a first right-side Tools panel. That proved the event pipeline, but the visible UX duplicates tool rows already present in the transcript. The product target is broader: a three-column coding-agent workspace with projects and sessions on the left, the main conversation in the middle, and arbitrary tabbed work surfaces on the right.

Comparable UI references provided by the user show the right column acting as a tabbed surface for Markdown, browser, terminal, PR/diff status, and a plus-menu for opening new tabs. The right panel should host concrete work surfaces and artifacts, not raw tool-call logs.

Recommended branch strategy: continue on `feat/M07A-tool-timeline-mvp`. M07A is not ready for PR as a standalone user-facing experience because the current panel duplicates transcript tool rows. M07A.2 should complete the PR story by reshaping the panel into the intended shell.
## Requirements
- Preserve the existing left project/session sidebar and middle chat transcript/composer flow.
  
- Replace the primary right-side Tools panel experience with a right-panel tab shell.
  
- Provide mock tabs for:
  
  - Terminal
    
  - Browser
    
  - Markdown/File
    
  - Diffs/PR
    
- Provide an add/open-tab affordance with a menu of supported panel kinds.
  
- Allow selecting tabs and preserving the active tab while the user continues chatting.
  
- Render believable mock content for each panel kind, focused on layout, hierarchy, and interaction affordances.
  
- Remove the duplicated raw tool-call list from the right-side primary UI.
  
- Support responsive behavior: the right panel should be hideable, stackable, or otherwise usable on narrower widths.
  
- Add preview/mock coverage so design iteration can happen without a real terminal, browser, PR, or file integration.
  
## Non-goals
- Real terminal process execution.
  
- Real embedded browser/webview navigation.
  
- Real Markdown file loading from disk.
  
- Real GitHub PR API or git diff wiring.
  
- Real file explorer, file viewer, or file editor integration. That belongs to M07B.
  
- Real diff extraction or review workflows. That belongs to M07C.
  
- Durable tab persistence across app restarts.
  
- Drag-and-drop tab reordering.
  
- Multi-window, detached panels, or cloud workspace behavior.
  
- A generic Activity panel.
  
- A raw tool-call panel.
  
- Replacing the M07A tool event state model.
  
## Proposed approach
Build a renderer-owned right-panel workspace model with mock panel descriptors. Treat this as UI shell work first:

- Define panel kinds and mock panel state in a small renderer feature folder.
  
- Render a tab strip or vertical tab list in the right rail.
  
- Render one active panel body at a time.
  
- Provide a plus/open menu to add mock panels.
  
- Keep panel state local to the renderer for M07A.2.
  
- Remove or hide the current standalone Tools rail from the default session layout.
  

The implementation should bias toward UX clarity rather than premature backend integration. The shell should make it obvious that the right side is a workspace for artifacts and operational views, not another transcript.
## User experience / workflow
1. The user sees the existing project/session sidebar on the left.
  
2. The user chats in the center column as before.
  
3. The right column shows a tabbed workspace with mock tabs such as `PR #11`, `Terminal`, `README.md`, and `Browser`.
  
4. Selecting a tab changes the right panel body without changing the selected chat.
  
5. The plus/open affordance opens a menu: Changes, Terminal, Browser, File, Markdown.
  
6. Choosing a menu item adds or activates a mock tab of that kind.
  
7. The transcript remains the conversational source of truth.
  
8. On narrow layouts, the right panel remains usable through stacking, collapse, or an explicit show/hide control.
  
## Technical design
### Panel model
Add a renderer feature folder such as `src/renderer/right-panel/` with types like:

```ts
type RightPanelKind = "terminal" | "browser" | "markdown" | "diffs";

type RightPanelTab = {
  id: string;
  kind: RightPanelKind;
  title: string;
  subtitle?: string;
  mock: boolean;
};
```

Provide helpers for:

- Creating default mock tabs.
  
- Adding a tab by kind.
  
- Selecting a tab.
  
- Resolving the active tab body data.
  
### Layout integration
Update `ChatShell` or a named session-layout component so the session area becomes:

- Transcript/chat column.
  
- Right panel workspace column.
  
- Bottom composer remains anchored to the chat flow.
  

The implementation should avoid passing right-panel ownership into Electron main or app backend. M07A.2 is renderer-only state and mock content.
### Panel renderers
Add small focused components:

- `RightPanelWorkspace`
  
- `RightPanelTabs`
  
- `RightPanelAddMenu`
  
- `RightPanelBody`
  
- `TerminalPanelMock`
  
- `BrowserPanelMock`
  
- `MarkdownPanelMock`
  
- `DiffsPanelMock`
  

Mock content should match the intended product semantics:

- Terminal: prompt, cwd, command output block.
  
- Browser: URL bar, back/forward/reload affordances, page preview placeholder.
  
- Markdown/File: document heading, readable markdown content, path/title metadata.
  
- Diffs/PR: PR title/status, changed files, checks, diff summary rows.
  
### Current Tools panel treatment
The current M07A Tools panel should not remain as a standalone primary rail. Replace it with the right-panel shell. Keep the M07A tool execution data model available for future wiring, but do not expose raw tool calls as one of the default right-side tabs.
### Mock data
Add mock tabs and bodies in a named mock module, likely under `src/renderer/right-panel/right-panel-mock-data.ts`. Use browser preview and component tests to exercise:

- Default tabs.
  
- Selecting each panel kind.
  
- Adding a new mock tab.
  
### Styling
Update `src/renderer/styles.css` or a feature-owned stylesheet boundary if the repo adopts one later.

Expected visual shape:

- Right panel has a distinct tab strip/header and active body.
  
- The plus/open affordance is discoverable near the right tabs.
  
- Active tab state is visible.
  
- Panel bodies use dense, inspectable UI, not chat bubbles.
  
- The center chat remains visually dominant.
  
## Data and API changes
- No new IPC channels.
  
- No main-process data changes.
  
- No durable storage migration.
  
- Renderer-only panel kind/tab types and mock data.
  
- Existing M07A tool execution data remains internal until a later panel needs it.
  
## Error handling and edge cases
- If the active tab is removed, select the nearest remaining tab.
  
- If no tabs exist, show an empty right-workspace state with the add-tab affordance.
  
- Long terminal output, markdown, and diff content should scroll inside the panel, not expand the full app width or height.
  
- The plus menu should remain keyboard accessible.
  
- The chat transcript should still scroll independently from right-panel content.
  
## Test strategy
- Unit tests for right-panel tab state helpers: default tabs, add tab, select tab, remove/select fallback if implemented.
  
- Component tests for `RightPanelWorkspace`: renders tabs, selected body, add menu, and mock panels.
  
- Chat shell tests: right panel shell appears in session layout; chat transcript and composer still render.
  
- Dev preview/mock tests: default right-panel tabs appear and can switch.
  
- Smoke or Playwright coverage, if practical: browser preview can select/add a tab and still send a prompt.
  
- Existing M07A tests must continue to pass.
  

Verification commands:

```bash
pnpm test -- tests/renderer/right-panel*.test.ts tests/renderer/chat-shell.test.ts
pnpm typecheck
pnpm test:smoke
```

Run `pnpm check` before opening the PR when practical.
## Implementation plan
### Phase 1: Model and mock data
- [ ] 
  
  Add right-panel kind/tab types and pure state helpers.
  
- [ ] 
  
  Add default mock tabs and mock content for Terminal, Browser, Markdown/File, and Diffs/PR.
  
- [ ] 
  
  Add unit tests for selecting and adding tabs.
  
### Phase 2: Shell components
- [ ] 
  
  Add `RightPanelWorkspace`, tab strip/list, add menu, and active body components.
  
- [ ] 
  
  Add mock panel body renderers.
  
- [ ] 
  
  Add component tests for default tabs, switching, and add-tab behavior.
  
### Phase 3: Integrate into chat session layout
- [ ] 
  
  Replace the standalone Tools rail with the right-panel workspace.
  
- [ ] 
  
  Do not expose raw tool calls as a default tab.
  
- [ ] 
  
  Keep transcript and composer behavior unchanged.
  
- [ ] 
  
  Add/adjust chat-shell tests.
  
### Phase 4: Visual pass and preview data
- [ ] 
  
  Style the three-column layout and responsive behavior.
  
- [ ] 
  
  Add browser-preview mock state for the right-panel shell.
  
- [ ] 
  
  Capture or update UAT evidence if the visual change is substantial.
  
### Phase 5: Verification and PR prep
- [ ] 
  
  Run targeted tests.
  
- [ ] 
  
  Run `pnpm typecheck`.
  
- [ ] 
  
  Run `pnpm check` when practical.
  
- [ ] 
  
  Update M07A spec/build notes if M07A.2 changes the final PR story.
  
- [ ] 
  
  Open one PR for M07A + M07A.2.
  
## Acceptance criteria
- [ ] 
  
  The right side reads as a tabbed workspace, not a duplicate tool-call list.
  
- [ ] 
  
  User can switch between mock Terminal, Browser, Markdown/File, and Diffs/PR tabs.
  
- [ ] 
  
  User can add a mock tab from the right-side add/open menu.
  
- [ ] 
  
  Chat remains the primary conversational flow while the right panel preserves selected tab state.
  
- [ ] 
  
  Raw tool calls are not exposed as a default right-side panel.
  
- [ ] 
  
  Existing transcript, composer, and session tests continue to pass.
  
## Build handoff
- Spec path: `docs/specs/2026-05-21-m07a2-right-panel-tab-shell.md`
  
- Approved scope: Renderer-only right-panel tab shell with mock panel data, add/select tab interactions, no raw tool-call default panel, and responsive layout.
  
- Non-goals: Real terminal/browser/markdown/PR/file explorer/file editor/diff integrations, durable tab persistence, backend IPC, M07B/M07C wiring, generic Activity panel, and raw tool-call panel.
  
- Ordered task list: Phase 1 model and mock data, Phase 2 shell components, Phase 3 chat layout integration, Phase 4 visual pass and preview data, Phase 5 verification and PR prep.
  
- Verification commands: targeted right-panel/chat-shell tests, `pnpm typecheck`, `pnpm test:smoke`, and `pnpm check` before PR when practical.
  
- Required fixtures or test data: Mock right-panel tabs and mock bodies.
  
- Known risks: Shell layout can disrupt transcript scrolling/composer anchoring; mock content can overfit screenshots if not kept generic; removing the current Tools rail must not break M07A event plumbing tests.
  
- Blocking open questions: None.
  
## Build completion report
- Spec path: `docs/specs/2026-05-21-m07a2-right-panel-tab-shell.md`
  
- Base SHA: `c406e359f4916eb6079f9fb20e6de00f4029e66d`
  
- Final head SHA: uncommitted at build time (branch `feat/M07A-tool-timeline-mvp`)
  
- Tasks completed: Phase 1 model and mock data, Phase 2 shell components, Phase 3 chat layout integration, Phase 4 visual pass and preview/smoke coverage, Phase 5 targeted verification
  
- Files changed:
  
  - `src/renderer/right-panel/*` (types, state, mock data, workspace, tabs, add menu, body, panel mocks)
    
  - `src/renderer/components/chat-shell.tsx`
    
  - `src/renderer/styles.css`
    
  - `tests/renderer/right-panel-state.test.ts`, `tests/renderer/right-panel-workspace.test.tsx`
    
  - `tests/renderer/chat-shell.test.ts`
    
  - `tests/smoke/dev-web.spec.ts`
    
- Verification:
  
  - `pnpm test -- tests/renderer/right-panel-state.test.ts tests/renderer/right-panel-workspace.test.tsx tests/renderer/chat-shell.test.ts` — passed (428 tests in full vitest run)
    
  - `pnpm typecheck` — passed
    
  - `pnpm test:smoke` — 9 passed
    
  - `pnpm check` — format and lint passed after Biome fixes; full check not re-run after lint fixes (coverage + second smoke omitted)
    
- Review gates: Single-agent path — spec compliance and code quality self-review against approved spec and non-goals; independent subagent review not used
  
- Approved deviations: None
  
- Known follow-ups: Tab close UI not exposed (remove helper exists for edge cases); full `pnpm check` with coverage recommended before PR; M07A `CodingPanel` retained for future wiring but removed from session layout
  
- PR prep: Open one PR for M07A + M07A.2 per spec (user-driven)
  
## Open questions
- None.
