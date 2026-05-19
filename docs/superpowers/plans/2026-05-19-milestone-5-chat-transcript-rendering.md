# Milestone 5: Chat Transcript Rendering

> **Status:** Complete (2026-05-19)

**Goal:** Polish the existing live/history Pi transcript (markdown, scroll, unified layout, history loading UX, fixture removal) without rebuilding session plumbing.

**Architecture:** Keep `LiveSessionState` and Pi session IPC (ADR 0001). Add renderer hydration state, `MessageContent` (marked + DOMPurify), stick-to-bottom scroll, and `TranscriptPanel` loading/error surfaces.

## Completed work

- [x] `TranscriptHydrationState` in App with loading/error/loaded lifecycle for `piSession.history`
- [x] Unified `chat-shell--session` layout for resumable chats and active runs; centered start only for empty drafts
- [x] Markdown rendering via `marked` + `dompurify` in `MessageContent`
- [x] `useStickToBottomScroll` with jump-to-latest affordance
- [x] Readability: grouped role labels, status strip, tool `<details>` blocks, system callouts
- [x] Removed `static-transcripts.ts`, `chat-transcript.tsx`, and `continued-chat` routes
- [x] Smoke history via `loadSmokePiSessionHistory` when `PI_DESKTOP_SMOKE_PI_SESSION=1`
- [x] Renderer and smoke tests updated; `pnpm check` passes

## Verification

```bash
pnpm check
```

Manual: open a resumed chat with a session file, confirm markdown headings/code blocks, autoscroll during streaming, and no static fixture transcript.
