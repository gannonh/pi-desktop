---
name: run-preview-server
description: Launch the pi-desktop renderer as a Vite web preview and open it in the Codex integrated browser for visual review, screenshots, annotation feedback, or preview mock-data inspection. Use when the user asks to run the app as a web app, start the preview server, open the local preview, inspect localhost preview UI, update web preview mock content, or prepare the app for browser-based feedback.
---

# Run Preview Server

## Workflow

1. Work from the pi-desktop repo root.
2. Confirm `package.json` includes `dev:web`. If it is missing, stop and report that the preview harness is unavailable.
3. Start the preview server with:

```bash
pnpm dev:web
```

1. Keep the server session running. Do not stop an existing preview server unless the user asks.
2. Use the Local URL printed by Vite, usually `http://127.0.0.1:5173/`.
3. Open that URL in the Codex integrated browser with the Browser plugin or `browser-use:browser` skill.
4. Verify the page renders by checking for visible app text such as `PROJECTS`, `Project home`, or `What should we work on?`.
5. Report the preview URL and whether the server is still running.

## Failure Handling

- If `pnpm dev:web` fails, surface the relevant terminal output.
- If the browser opens a blank or errored page, reload once, then report the observed error.
- If Vite chooses another port, use the URL from the terminal output.
- Do not launch Electron as a substitute for this skill.

## During Feedback

- After code changes, reload the integrated browser preview.
- Keep the preview server alive for annotation review.
- When the user asks to stop the preview, send Ctrl-C to the server session and confirm it exited.

## Preview Mock Data

- The browser preview runs the renderer through Vite with no Electron preload.
- On `http:` or `https:`, `src/renderer/main.tsx` calls `installDevPreviewApi()` from `src/renderer/dev-preview-api.ts`.
- `installDevPreviewApi()` installs an in-memory `window.piDesktop` only when one does not already exist.
- Electron runs with the real preload API from `src/preload/index.ts`, so the mock API is not installed there.
- Preview projects and project chats live in the `store` object in `src/renderer/dev-preview-api.ts`.
- Preview projectless chats live in the `standaloneChats` array in the same file.
- The preview API uses the same public `PiDesktopApi` shape as Electron and returns `ProjectStateViewResult` values.
- Preview actions mutate memory only. Reloading the page resets data to the constants in `dev-preview-api.ts`.

When adding preview scenarios:

1. Add project rows with `project(...)` and list them in `store.projects`.
2. Add project chat rows with `chat(...)` under `store.chatsByProject[project.id]`.
3. Add projectless chat rows with `standaloneChat(...)` in `standaloneChats`.
4. Include representative states: pinned project, missing project, long title, running chat, more than five chats, and projectless chat.
5. Keep preview data schema-compatible with `src/shared/project-state.ts`.
6. Do not add preview-only data to Electron main, preload, or the JSON project store.
