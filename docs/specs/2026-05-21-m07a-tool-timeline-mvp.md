# M07A Tool Timeline MVP Spec
## Status
Implemented
## Goal
Make live Pi tool execution inspectable in Pi Desktop through a transcript-adjacent coding panel that shows tool status, tool input summaries, result summaries, expandable raw details, and bash-style output.
## Background
The roadmap splits the original M07 Coding Panels scope into three PR-sized milestones. M07A is the first slice and focuses on the tool timeline foundation. M07B will add file activity and previews. M07C will add diff and patch review.

Current session plumbing already streams Pi session events through `src/main/pi-session/pi-session-event-normalizer.ts`, validates renderer-safe events in `src/shared/pi-session.ts`, and reduces them into `LiveSessionState` in `src/renderer/session/session-state.ts`. The live transcript renders from that state in `src/renderer/components/chat-shell.tsx`, `src/renderer/components/transcript-panel.tsx`, and `src/renderer/components/live-session-transcript.tsx`.

Pi emits `tool_execution_start`, `tool_execution_update`, and `tool_execution_end` events with `toolCallId`, `toolName`, arguments, partial results, final results, and `isError`. Pi Desktop currently drops those events and only renders flattened tool result messages in the transcript.

Recommended approach: extend the existing custom Pi session state path.

- Why: it matches ADR 0001 and keeps Pi-specific runtime details explicit across main, preload, renderer state, and tests.
  
- Trade-offs: it adds new renderer state alongside the existing flat transcript message list, so Build must keep the reducer small and typed.
  

Alternative: derive a timeline only from tool result transcript messages.

- Why it might fit: it avoids new event variants.
  
- Trade-offs: it loses active/running state, partial updates, input summaries, and failed execution visibility.
  

Alternative: introduce a separate coding-panel IPC stream.

- Why it might fit: it could isolate panel data from transcript data.
  
- Trade-offs: it duplicates session scoping, stale-event filtering, and browser-preview transport work already handled by `PiSessionEvent`.
  
## Requirements
- Normalize Pi `tool_execution_start`, `tool_execution_update`, and `tool_execution_end` events into renderer-safe `PiSessionEvent` variants.
  
- Preserve session scoping and stale-event filtering for tool events using the existing `sessionId` path.
  
- Track tool executions in `LiveSessionState` without replacing the current transcript message model.
  
- Render a coding panel shell alongside the transcript in session layouts.
  
- Render a tool timeline with each tool call's status, tool name, input summary, result summary, and received timestamp where available.
  
- Show active, completed, and failed tool calls with distinct readable states.
  
- Support expandable raw input and output details for each tool call.
  
- Render bash or terminal-style output in a monospace block when the tool result content or details provide command/output text.
  
- Provide browser-preview smoke data for active, completed, and failed tool calls.
  
- Keep runtime, validation, and renderer failures visible through existing error paths.
  
## Non-goals
- File activity extraction, file preview panels, and file availability states. Those belong to M07B.
  
- Diff, patch, and git-backed changed-file review. Those belong to M07C.
  
- Durable structured tool timeline hydration for older saved sessions. M07A may continue to show historical tool result messages in the transcript.
  
- Tool approval, tool cancellation per call, or permission prompts.
  
- New provider, model, auth, extension, or tool execution behavior in Pi.
  
- Replacing `LiveSessionState` with AI SDK UI state or `useChat`.
  
- Persisting coding panel UI preferences across restarts.
  
## Proposed approach
Extend the existing session event contract with tool execution events, then add a small typed tool execution collection to `LiveSessionState`. The renderer should consume this state from `ChatShell` and render a coding panel in the session layout next to the transcript.

The first UI slice should stay simple: a tool timeline list with expandable details. Bash output gets special formatting because terminal output is the most common inspectable tool result. Other tools use generic summaries and raw JSON/text details until later milestones add file and diff-specific surfaces.
## User experience / workflow
During a live session:

1. The user sends a prompt from the existing composer.
  
2. When Pi starts a tool call, the coding panel appears in the session layout and adds a running timeline row.
  
3. The row shows the tool name, running status, and a compact input summary.
  
4. Partial updates refresh the row summary or raw output when Pi emits them.
  
5. When the tool finishes, the row changes to completed or failed and shows the final result summary.
  
6. The user can expand the row to inspect raw arguments and raw output.
  
7. For bash-style results, the expanded view shows command/output text in a monospace terminal block.
  
8. The transcript remains readable and continues to stream assistant and tool messages as it does today.
  

Layout expectations:

- Desktop-width session layouts should show the transcript and coding panel in one session surface.
  
- Narrow layouts may stack the coding panel below the transcript or collapse it to a full-width section.
  
- Empty sessions should not show an empty coding panel before the first tool event.
  
- Start-state layouts should remain centered until the app enters the session layout.
  
## Technical design
### Shared event schema
Update `src/shared/pi-session.ts`:

- Add a `PiSessionToolExecutionStatusSchema` with `running`, `completed`, and `failed`.
  
- Add schemas for sanitized JSON-like tool arguments and results. Use `z.unknown()` only at the edge if a stricter JSON value schema would block Pi SDK data that is already renderer-safe after serialization.
  
- Add `tool_execution_start`, `tool_execution_update`, and `tool_execution_end` variants to `PiSessionEventSchema`.
  
- Include `sessionId`, `toolCallId`, `toolName`, `receivedAt`, and relevant payload fields.
  
- Keep payload fields bounded to serializable data that can pass through IPC and the web preview transport.
  

Suggested event shape:

```ts
type PiSessionToolExecutionEvent =
  | {
      type: "tool_execution_start";
      sessionId: string;
      toolCallId: string;
      toolName: string;
      args: unknown;
      receivedAt: string;
    }
  | {
      type: "tool_execution_update";
      sessionId: string;
      toolCallId: string;
      toolName: string;
      args: unknown;
      partialResult: unknown;
      receivedAt: string;
    }
  | {
      type: "tool_execution_end";
      sessionId: string;
      toolCallId: string;
      toolName: string;
      args: unknown;
      result: unknown;
      isError: boolean;
      receivedAt: string;
    };
```

If Build finds that final Pi `tool_execution_end` events do not include args, the reducer should preserve args from the matching start/update event instead of inventing a fallback summary.
### Event normalization
Update `src/main/pi-session/pi-session-event-normalizer.ts`:

- Map Pi `tool_execution_start` to the shared start event.
  
- Map Pi `tool_execution_update` to the shared update event.
  
- Map Pi `tool_execution_end` to the shared end event.
  
- Keep runtime error sanitization separate from tool output sanitization.
  
- Ensure event payloads are serializable before they cross IPC.
  

Add small serialization helpers if needed:

- Convert `undefined` to omitted fields or `null`.
  
- Convert `Error` instances to `{ name, message }` without stack traces.
  
- Convert unsupported values such as functions and symbols to readable placeholders.
  
- Avoid silently dropping the whole event when one nested value is unsupported.
  
### Renderer session state
Update `src/renderer/session/session-state.ts`:

- Add `LiveToolExecution` or equivalent state with:
  
- `id` from `toolCallId`
  
- `toolName`
  
- `status`
  
- `args`
  
- `partialResult`
  
- `result`
  
- `isError`
  
- `startedAt`, `updatedAt`, and `endedAt` where available
  
- Add `toolExecutions: LiveToolExecution[]` to `LiveSessionState`.
  
- Reset tool executions with initial session state and history hydration unless M07A implements structured history for future sessions.
  
- Reduce start/update/end events idempotently by `toolCallId`.
  
- Preserve rows when duplicate end events arrive or final tool result messages arrive after tool execution events.
  
- Mark in-flight tools failed or stopped visibly when a runtime error arrives before their end event.
  
### View model helpers
Add a focused renderer module, likely under `src/renderer/tools/`, for timeline presentation:

- `summarizeToolArgs(toolName, args)`
  
- `summarizeToolResult(toolName, result, isError)`
  
- `getToolOutputText(toolName, result)`
  
- `isTerminalTool(toolName, result)`
  
- `formatToolTimestamp(value)` if timestamp formatting is needed outside existing helpers
  

Keep these helpers pure and covered by unit tests. The helpers should return concise strings and visible unavailable labels instead of throwing for unexpected data.
### Coding panel UI
Add components under `src/renderer/components/` or a `src/renderer/tools/` feature folder:

- `CodingPanel`
  
- `ToolTimeline`
  
- `ToolTimelineItem`
  
- `ToolExecutionDetails`
  

Wire the panel through `ChatShell` only for session layouts. `ProjectMain` and app-level session scoping should not need new ownership logic.

The panel should:

- Use semantic sections and buttons for expandable rows.
  
- Keep status labels text-visible, not color-only.
  
- Show raw input and output in `<pre>` blocks or existing markdown-safe content blocks.
  
- Bound extremely long output visually with scrolling or max height while preserving copyable text.
  
- Avoid rendering secrets from runtime errors beyond existing sanitization. Tool command/output may be user workspace content and should be visible because the feature exists to inspect agent work.
  
### Browser preview smoke data
Update `src/renderer/dev-preview-api.ts` to emit tool execution events during preview streams:

- Completed bash call with command and output.
  
- Failed bash call or generic tool call with an error result.
  
- Active/running call that remains visible briefly during the stream.
  

Update smoke or renderer tests so the preview path proves the panel can render those states.
### Styling
Update `src/renderer/styles.css` surgically:

- Add a session layout that supports transcript plus coding panel.
  
- Add timeline row, status, summary, details, and terminal block styles.
  
- Preserve existing transcript scroll behavior and bottom composer placement.
  
- Add responsive behavior for narrower widths.
  
## Data and API changes
- Shared `PiSessionEventSchema` gains tool execution event variants.
  
- `PiSessionEvent` and transport envelopes automatically include the new variants through existing shared schemas.
  
- `LiveSessionState` gains `toolExecutions` or equivalent renderer-only state.
  
- No new IPC channel is required.
  
- No durable storage migration is required.
  
- No preload API method is required.
  
## Error handling and edge cases
- Unknown or malformed tool payloads should produce readable summaries such as `Input unavailable` or `Result unavailable` while preserving raw inspectable data when possible.
  
- If a tool update arrives before a start event, the reducer should create a running row from the update.
  
- If a tool end arrives before a start event, the reducer should create a completed or failed row from the end event.
  
- Duplicate start/update/end events should not create duplicate timeline rows.
  
- Tool events for stale session IDs should continue to be ignored by the existing session scope logic.
  
- Sessionless runtime errors should not create tool rows.
  
- Runtime errors should stop streaming assistant messages and mark active tool rows as failed or interrupted with a visible state.
  
- Very long output should stay inspectable without expanding the whole page height.
  
- Browser preview fixtures should avoid secret-looking values.
  
## Test strategy
Unit and integration tests:

- `tests/shared/pi-session.test.ts`: validate new tool execution event schema variants.
  
- `tests/main/pi-session-event-normalizer.test.ts`: verify start, update, end normalization and serializable payload handling.
  
- `tests/renderer/session-state.test.ts`: verify reducer behavior for start/update/end, out-of-order events, duplicate events, runtime errors, and history reset.
  
- New renderer tool view-model tests: verify argument/result summaries and terminal output extraction.
  
- New or updated renderer component tests: verify coding panel rows render active, completed, failed, expanded raw details, and terminal output.
  
- `tests/renderer/chat-shell.test.ts`: verify the session layout includes the coding panel only when tool executions exist or when the chosen design calls for an empty panel during active sessions.
  
- `tests/renderer/dev-preview-api.test.ts`: verify preview streams emit tool execution events.
  

Smoke tests:

- Update the relevant Playwright smoke test to submit a preview prompt and assert that the tool timeline appears with at least one completed bash-style row and one visible failure state.
  

Verification commands:

- `pnpm test -- tests/shared/pi-session.test.ts tests/main/pi-session-event-normalizer.test.ts tests/renderer/session-state.test.ts`
  
- `pnpm test -- tests/renderer/chat-shell.test.ts tests/renderer/dev-preview-api.test.ts`
  
- Add any new test files to the targeted command list during Build.
  
- `pnpm typecheck`
  
- `pnpm check` before merge when practical.
  
## Implementation plan
### Phase 1: Shared event contract and normalization
- [ ] 
  
  Update `src/shared/pi-session.ts` with tool execution event schemas and exported types.
  
- [ ] 
  
  Update `tests/shared/pi-session.test.ts` for start, update, and end variants.
  
- [ ] 
  
  Update `src/main/pi-session/pi-session-event-normalizer.ts` to emit tool execution events.
  
- [ ] 
  
  Add normalizer tests in `tests/main/pi-session-event-normalizer.test.ts` for successful, failed, partial, and serializable payload cases.
  
- [ ] 
  
  Verification: targeted shared and main tests pass.
  
### Phase 2: Renderer state model
- [ ] 
  
  Extend `LiveSessionState` in `src/renderer/session/session-state.ts` with tool execution state.
  
- [ ] 
  
  Reduce tool start, update, and end events idempotently.
  
- [ ] 
  
  Reset tool execution state on initial state and history hydration.
  
- [ ] 
  
  Mark active tool rows visibly failed or interrupted on runtime errors.
  
- [ ] 
  
  Update existing tests affected by the new state shape.
  
- [ ] 
  
  Add reducer tests for ordered, out-of-order, duplicate, failed, and runtime-error flows.
  
- [ ] 
  
  Verification: renderer session-state tests pass.
  
### Phase 3: Tool timeline view model
- [ ] 
  
  Add pure summary helpers under a named renderer feature folder such as `src/renderer/tools/`.
  
- [ ] 
  
  Implement generic input/result summaries.
  
- [ ] 
  
  Implement bash or terminal output extraction for common Pi tool result shapes.
  
- [ ] 
  
  Add tests for expected and malformed payloads.
  
- [ ] 
  
  Verification: new view-model tests pass.
  
### Phase 4: Coding panel UI
- [ ] 
  
  Add coding panel and timeline components.
  
- [ ] 
  
  Wire the panel into `ChatShell` session layouts without changing start-state behavior.
  
- [ ] 
  
  Add expandable raw input/output details.
  
- [ ] 
  
  Add terminal-style rendering for bash output.
  
- [ ] 
  
  Update `src/renderer/styles.css` for desktop and responsive layouts.
  
- [ ] 
  
  Add component and chat-shell tests for visible timeline states.
  
- [ ] 
  
  Verification: renderer component tests pass.
  
### Phase 5: Browser preview and smoke coverage
- [ ] 
  
  Update `src/renderer/dev-preview-api.ts` to emit active, completed, and failed tool execution events.
  
- [ ] 
  
  Update preview API tests for emitted events.
  
- [ ] 
  
  Update smoke coverage to assert the tool timeline in a browser-preview prompt flow.
  
- [ ] 
  
  Verification: preview tests and smoke tests pass locally where practical.
  
### Phase 6: Final verification and docs closeout
- [ ] 
  
  Run targeted test commands from this spec.
  
- [ ] 
  
  Run `pnpm typecheck`.
  
- [ ] 
  
  Run `pnpm check` before merge when practical.
  
- [ ] 
  
  Update roadmap status or follow-up docs only if implementation changes accepted milestone scope.
  
- [ ] 
  
  Commit the coherent change set with a Conventional Commit message.
  
## Acceptance criteria
- [ ] 
  
  Live Pi tool calls render in a coding panel with status, input summary, and result summary.
  
- [ ] 
  
  Tool rows show active, completed, and failed states with text-visible labels.
  
- [ ] 
  
  Bash or terminal-style output can be expanded and read without leaving the chat surface.
  
- [ ] 
  
  Raw tool input and output can be expanded for inspection.
  
- [ ] 
  
  Tool event failures remain visible and do not get flattened into assistant text only.
  
- [ ] 
  
  Existing transcript streaming, follow-up submission, abort, and history loading behavior still pass their current tests.
  
- [ ] 
  
  Browser preview includes active, completed, and failed tool-call smoke data.
  
## Build handoff
- Spec path: `docs/specs/2026-05-21-m07a-tool-timeline-mvp.md`
  
- Approved scope: Extend Pi Desktop's existing custom Pi session event path to normalize live tool execution events, store them in renderer session state, and render a transcript-adjacent Tool Timeline MVP with expandable raw details and bash-style output.
  
- Non-goals: M07B file activity and preview, M07C diff and patch review, tool approval, new IPC channels, durable structured tool timeline hydration, AI SDK `useChat` adoption, provider/auth changes, persisted coding-panel preferences.
  
- Ordered task list: Phase 1 shared event contract and normalization, Phase 2 renderer state model, Phase 3 tool timeline view model, Phase 4 coding panel UI, Phase 5 browser preview and smoke coverage, Phase 6 final verification and docs closeout.
  
- Verification commands: targeted `pnpm test` commands listed in Test strategy, `pnpm typecheck`, and `pnpm check` before merge when practical.
  
- Required fixtures or test data: Browser preview emits synthetic active, completed, and failed tool execution events. No credentials or external services are required.
  
- Known risks: Pi tool result details may vary by tool, final end events may not include args, long output can harm layout if unbounded, and adding state to `LiveSessionState` affects many tests that assert exact state shape.
  
- Blocking open questions: None.
  
## Open questions
- None.
  
## Build completion report
- Spec path: `docs/specs/2026-05-21-m07a-tool-timeline-mvp.md`
  
- Branch: `feat/M07A-tool-timeline-mvp`
  
- Tasks completed: Phases 1–5 (shared events, normalizer, session state, view model, coding panel UI, dev preview fixtures)
  
- Files changed:
  
  - `src/shared/pi-session.ts`
    
  - `src/main/pi-session/pi-session-event-normalizer.ts`
    
  - `src/renderer/session/session-state.ts`
    
  - `src/renderer/tools/tool-timeline-view-model.ts`
    
  - `src/renderer/components/coding-panel.tsx`, `tool-timeline.tsx`, `tool-timeline-item.tsx`
    
  - `src/renderer/components/chat-shell.tsx`
    
  - `src/renderer/dev-preview-api.ts`
    
  - `src/renderer/styles.css`
    
  - Tests under `tests/shared`, `tests/main`, `tests/renderer`
    
- Verification:
  
  - `pnpm test -- tests/shared/pi-session.test.ts tests/main/pi-session-event-normalizer.test.ts tests/renderer/session-state.test.ts tests/renderer/tool-timeline-view-model.test.ts tests/renderer/coding-panel.test.ts tests/renderer/chat-shell.test.ts tests/renderer/dev-preview-api.test.ts` — 416 tests passed (full vitest run)
    
  - `pnpm typecheck` — passed
    
- Review gates: Single-agent path; spec compliance and code quality checked inline during implementation. Independent subagent review was not used.
  
- Approved deviations: None.
  
- Known follow-ups: Full `pnpm check` (including smoke) not run in this session; structured tool timeline hydration for saved sessions remains out of scope per spec.
