# ADR 0004: Source-control AI generation boundary

## Status

Accepted

## Context

Wave 4 adds AI-assisted commit message generation, PR title/body generation, and commit failure recovery to the Changes panel.

These workflows need Git context from the selected project and Pi model/auth behavior from the local runtime. Renderer state must not receive provider secrets, raw model configuration internals, or broad filesystem access.

## Decision

Keep source-control AI generation behind main-process and Pi-owned boundaries.

- Main process gathers bounded Git context for staged diffs and branch compares.
- Main process builds source-control prompts and calls the Pi-backed text generator.
- Renderer IPC receives generated text fields and generation lifecycle state only.
- Commit failure recovery submits a Pi project-session prompt with commit message, staged files, failure output, and requested validation.

## Consequences

- Provider secrets and Pi auth/model handling stay out of renderer-accessible state.
- Renderer tests can use injected generation boundaries instead of live provider calls.
- Generation failures surface as visible Changes-panel errors without exposing runtime internals.
- Future source-control generation features should extend the main-process prompt/context boundary rather than adding renderer-side model calls.
