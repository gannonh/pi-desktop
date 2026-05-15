# AI SDK UI Chat Spike

## Status

Proposed for later evaluation.

## Question

Should Pi Desktop use Vercel AI SDK UI, especially `@ai-sdk/react` `useChat`, as the renderer chat state and streaming abstraction?

## Context

Pi Desktop currently owns a custom Pi session chat path:

- `src/main/pi-session/pi-session-runtime.ts` starts, submits to, aborts, and disposes Pi SDK sessions.
- `src/shared/pi-session.ts` defines the typed Zod event contract between main/preload/renderer.
- `src/renderer/session/session-state.ts` reduces Pi session events into renderer state.
- `src/renderer/components/live-session-transcript.tsx` renders live messages and status.

AI SDK UI provides a framework-agnostic chat abstraction with React support through `@ai-sdk/react`. Its `useChat` hook manages message state, streaming status, error state, stop, resume, regenerate, tool outputs, and custom transports.

## Initial Assessment

Do not migrate immediately.

Pi Desktop chat is a long-lived local Pi agent session scoped to a project, workspace, and selected chat. It needs Pi-specific operations for session start, follow-up submit, abort, disposal on scope changes, event filtering, retry state, and runtime error display.

AI SDK UI may still help if its message model and custom transport remove renderer complexity without hiding Pi runtime behavior behind awkward adapters.

## Spike Scope

Create a small prototype, separate from milestone-critical work, that tests whether AI SDK UI fits the Pi session model.

Evaluate:

- Mapping `PiSessionEvent` to AI SDK `UIMessage` parts.
- A custom `ChatTransport` backed by `window.piDesktop.piSession`.
- Session lifecycle support for start, submit, abort, and dispose.
- Preservation of project/chat scope guards and event filtering.
- Runtime error and retry rendering.
- Tool-call or approval extensibility for future Pi tool UX.
- Compatibility with the planned HTTP/WebSocket bridge for `pnpm dev:web`.

## Success Criteria

Adopt AI SDK UI only if the spike shows clear simplification in renderer chat/session state while preserving current behavior:

- Existing smoke flow can stream a Pi response.
- Abort still cancels active work.
- Scope changes dispose or hide stale sessions correctly.
- Errors remain visible and typed.
- Tests can cover the adapter without brittle timing.
- Pi remains the source of providers, tools, sessions, and runtime behavior.

If most complexity moves into an adapter with little net reduction, keep the current custom session state and consider borrowing only the `UIMessage` shape.

## Revisit Triggers

Revisit this before or during work on:

- Durable chat transcript storage.
- Tool-call rendering and approval UX.
- Rich message parts such as files, command output, or artifacts.
- Web preview HTTP/WebSocket chat transport.
- Any refactor of `LiveSessionState` or `PiSessionEvent`.

## Non-goals

- Replacing the Pi TypeScript SDK.
- Moving provider secrets or model calls into the renderer.
- Adopting AI SDK provider/model APIs for Pi runtime behavior.
- Reworking chat UI during the spike unless required to prove fit.
