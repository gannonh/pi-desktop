# Milestone 2 Chat Shell Design

## Goal

Establish the main chat surface and composer before Pi runtime integration.

## Approved Direction

- Use Pi-native labels such as `Ask Pi anything`.
- Give composer controls local UI state for review.
- Keep prompt submission disconnected from Pi runtime.
- Include static route variants for start, empty chat, and continued chat.
- Keep sidebar project metadata in the existing project boundary.

## Scope

Milestone 2 includes:

- Global start state.
- Project-scoped start state.
- Empty chat route.
- Static continued chat route.
- Main composer layout, controls, and interaction states.
- Project selector shell inside the composer.
- Model, access, mode, attachment, voice, and send control placement.
- Disabled and runtime-unavailable states.
- Responsive sizing and alignment for the main chat surface.

Runtime execution, real message streaming, persisted Pi transcripts, provider auth, model configuration persistence, file attachments, voice capture, and prompt submission wiring belong to later milestones.

## Architecture

Create a renderer feature boundary for the chat shell.

Core units:

- `ChatShell`: main layout for start, empty chat, and continued chat.
- `ChatStartState`: centered title, composer, and prompt suggestions.
- `ChatTranscript`: static timeline and metadata header for selected chats.
- `Composer`: local textarea, project selector shell, access selector, model selector, mode selector, attachment, voice, and send controls.
- `chat-view-model`: maps `ProjectStateView` into route-ready chat shell props.

`ProjectMain` should decide whether the selected project is recoverable or unavailable, then hand valid chat states to `ChatShell`.

Existing project state remains the source for selected project and selected chat metadata. Static transcript content is fixture data for review only.

## Route Model

Use a discriminated route state for the chat shell:

- `global-start`: no selected project and no selected chat.
- `project-start`: selected available project with no selected chat.
- `empty-chat`: selected chat metadata exists with no static transcript fixture.
- `continued-chat`: selected chat metadata exists with a static transcript fixture.
- `unavailable-project`: selected project is missing or unavailable.

The unavailable project route can continue using the existing recovery screen.

If selected chat metadata is absent, resolve to the nearest safe route with visible context:

- No project: `global-start`.
- Available project: `project-start`.
- Missing or unavailable project: `unavailable-project`.

## UX

The global start state shows:

```text
What should we work on?
```

The project start state shows:

```text
What should we build in {projectName}?
```

The composer appears centered in start states. The project-scoped start state shows the active project inside the composer footer.

The continued chat route anchors the composer to the bottom of the main panel. The transcript scrolls above it and includes realistic static content:

- elapsed work metadata.
- assistant response.
- compact file or diff summary card.
- user follow-up bubble.
- static chat title or metadata.

The empty chat route uses the same bottom composer placement with no transcript messages.

## Composer

The composer has two rows.

Input row:

- Attachment control.
- Textarea with `Ask Pi anything. @ to use skills or mention files`.
- Voice control.
- Send control.

Control row:

- Project selector shell.
- Local mode selector, such as `Work locally`.
- Branch or workspace label when available.
- Access selector.
- Model selector.

Composer local behavior:

- Textarea accepts typed input.
- Send is disabled when text is empty.
- Send is disabled when runtime is unavailable.
- Selectors open local menus or expose pressed/open states where useful for review.
- Runtime unavailable state shows a concise status label.
- Project selector shows `Work in a project` globally and the selected project name for project routes.

## Responsive Layout

Start states use a centered column with a constrained composer width. The title and composer should remain visible on small desktop windows.

Chat routes use a full-height column:

- Metadata header at the top when selected chat metadata exists.
- Transcript area fills available space and scrolls.
- Composer stays anchored to the bottom.

The layout should avoid text overflow in buttons, selectors, transcript cards, and narrow window widths.

## Error Handling

Errors stay visible in the main surface.

Expected states:

- Runtime unavailable: disable send and show a concise status label.
- Missing project: show recovery actions.
- Unavailable project: show the stored availability reason.
- Invalid selected chat metadata: resolve to the nearest safe route with project context.

The UI should fail visibly for project store or project action errors through the existing status message path.

## Testing

Unit tests should cover:

- View model route selection for global start, project start, empty chat, continued chat, and unavailable project.
- Project selector labels for global and project routes.
- Composer state for empty text, typed text, runtime unavailable, and selected project label.
- Static transcript fixture selection for known chat metadata.

Smoke tests should cover:

- App boots into global start state.
- Selecting an available project shows the project start state.
- Selecting a static chat shows a continued chat shell.
- Composer is centered in start states.
- Composer is bottom anchored in chat routes.

Manual review should cover:

- Global start state.
- Project-scoped start state.
- Empty chat route.
- Continued chat route.
- Runtime-unavailable disabled state.
- Narrow window sizing.

## Acceptance

Milestone 2 is complete when:

- User can review the chat start states without Pi runtime integration.
- Composer controls and disabled states match the approved mocks.
- Project context is visible in the composer when a project is selected.
- Empty and continued static chat routes are visible.
- The main chat shell is ready for prompt submission wiring in Milestone 3.
