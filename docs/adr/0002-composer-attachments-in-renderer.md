# ADR 0002: Composer attachments processed in the renderer

## Status

Accepted

## Context

The composer paperclip control was a disabled shell placeholder. Pi's `AgentSession.prompt()` accepts optional `ImageContent[]`, and pi-web-ui already implements attachment picking, document extraction, and conversion to LLM content blocks.

pi-web-ui's `loadAttachment` relies on browser APIs (canvas PDF previews, `docx-preview`, etc.). Electron main has no DOM for that pipeline.

## Decision

- Port pi-web-ui attachment utilities into `src/renderer/attachments/` rather than depending on `@earendil-works/pi-web-ui` (avoids Lit/mini-lit in the React renderer bundle).
- Process files in the renderer; submit processed payloads through existing `piSession.start` / `piSession.submit` IPC.
- Extend shared schemas with optional `images: ImageContent[]` and allow an empty `prompt` when at least one image is present. Document text is inlined into `prompt` via `convertAttachments`.
- Resize oversized images in the renderer (canvas) before IPC to stay within provider inline limits.
- Forward `images` through `pi-session-runtime` into `AgentSession.prompt({ images, streamingBehavior })`.
- Do not adopt pi-web-ui's `user-with-attachments` message role; persisted sessions use standard Pi `user` messages.

## Consequences

- Large base64 payloads cross IPC locally (acceptable for desktop; capped at 10 files × 20MB).
- pdf.js worker must be bundled for Vite/Electron (`import.meta.url` worker src).
- Queued message rows remain text-only in v1; attachments on steer/follow-up still reach the SDK.
- Transcript v1 shows document text and `[Image attached]` markers rather than inline thumbnails.
