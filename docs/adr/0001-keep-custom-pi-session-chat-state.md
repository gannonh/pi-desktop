# ADR 0001: Keep custom Pi session chat state for M04

## Status

Accepted

## Context

M03.2 evaluated whether Pi Desktop should adopt Vercel AI SDK UI, especially `@ai-sdk/react` `useChat`, as the renderer chat state and streaming abstraction.

Pi Desktop sessions are local Pi agent sessions scoped to project, workspace, and selected chat. The renderer currently owns explicit session state through `LiveSessionState`, `PiSessionEvent`, and the session lifecycle wiring in `App.tsx`.

The spike found that AI SDK UI can represent transcript text with `UIMessage` parts, but a custom transport still needs to own Pi-specific concerns:

- Pi session id tracking.
- Pending start event buffering.
- Stale-event filtering across project and chat scope changes.
- Start, submit, abort, and dispose lifecycle handling.
- Typed runtime error and retry state.
- Tool-role and future tool-call mapping.

## Decision

Do not adopt `@ai-sdk/react` `useChat` for M04.

M04 will continue with the custom `LiveSessionState` path and existing Pi session lifecycle wiring.

AI SDK `UIMessage` remains a possible future transcript storage or rich-message shape, especially before durable transcript storage, tool-call rendering, approval UX, or a larger chat-state refactor.

## Consequences

- M04 can build durable project and session management on the current explicit Pi session state model.
- Pi remains the source of provider, tool, model, session, and runtime behavior.
- The repo does not retain AI SDK dependencies or prototype transport code for this no-go decision.
- Future work should revisit AI SDK UI only if it removes renderer complexity without hiding Pi runtime behavior behind a large adapter.
