---
name: run-preview-server
description: Launch the pi-desktop renderer as a Vite web preview and open it in the Codex integrated browser for visual review, screenshots, and annotation feedback. Use when the user asks to run the app as a web app, start the preview server, open the local preview, inspect localhost preview UI, or prepare the app for browser-based feedback.
---

# Run Preview Server

## Workflow

1. Work from the pi-desktop repo root.
2. Confirm `package.json` includes `dev:web`. If it is missing, stop and report that the preview harness is unavailable.
3. Start the preview server with:

```bash
pnpm dev:web
```

4. Keep the server session running. Do not stop an existing preview server unless the user asks.
5. Use the Local URL printed by Vite, usually `http://127.0.0.1:5173/`.
6. Open that URL in the Codex integrated browser with the Browser plugin or `browser-use:browser` skill.
7. Verify the page renders by checking for visible app text such as `PROJECTS`, `Project home`, or `What should we work on?`.
8. Report the preview URL and whether the server is still running.

## Failure Handling

- If `pnpm dev:web` fails, surface the relevant terminal output.
- If the browser opens a blank or errored page, reload once, then report the observed error.
- If Vite chooses another port, use the URL from the terminal output.
- Do not launch Electron as a substitute for this skill.

## During Feedback

- After code changes, reload the integrated browser preview.
- Keep the preview server alive for annotation review.
- When the user asks to stop the preview, send Ctrl-C to the server session and confirm it exited.
