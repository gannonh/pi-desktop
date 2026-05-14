# Milestone 1 Project Home Design

## Goal

Let users create, select, revisit, and recover local projects, with chats grouped under projects in the sidebar.

## Scope

Milestone 1 builds the Codex-like project and chat navigation shell.

It includes:

- Project list in the sidebar.
- Chat metadata grouped under each project.
- Add project menu.
- JSON-backed project metadata store.
- Missing folder detection and recovery.
- Empty states for no project, no chats, and missing folders.
- Inactive chat entry points that make the Milestone 2 Pi runtime dependency visible.

It does not include real Pi session execution, message streaming, provider auth, session persistence from Pi, worktree creation, chat archiving, or permanent worktree management.

## UX Model

Projects contain chats. The sidebar is the primary project surface.

The app shell should show:

- Top-level app actions such as New chat, Search, Plugins, and Automations as visible inactive controls where their backing feature is outside Milestone 1.
- A Projects section.
- Project rows with folder icons, overflow actions, and nested recent chats.
- A Chats section label below Projects if needed for parity with the current shell shape.

Selecting a chat opens that chat route. Selecting a project with no chats opens a centered composer state for that project.

The app should not add a separate high-level project overview page in Milestone 1.

## Add Project Flow

The Projects section includes an add-project menu with two actions:

- Start from scratch.
- Use an existing folder.

### Start from scratch

Start from scratch creates a new local folder under:

```text
/Users/gannonhall/Documents
```

The folder name uses the next available `New project N` name. The app should create the folder, initialize a git repository, ensure the default branch is `main`, store the project, and select it.

If folder creation or git initialization fails, project creation fails visibly. The app should not add a project record for a folder that was not created successfully.

### Use an existing folder

Use an existing folder opens the native folder picker. The selected folder name becomes the project display name. The app stores the selected path as a project and selects it.

Cancelling the folder picker leaves the current state unchanged.

## Project Menu

Each project row has an overflow menu with these items:

- Pin project.
- Open in Finder.
- Create permanent worktree.
- Rename project.
- Archive chats.
- Remove.

Pin project toggles the pinned state and moves pinned projects above unpinned projects.

Open in Finder opens the project path with the operating system file manager.

Rename project changes the stored display name only. It does not rename the folder.

Remove deletes only the desktop project metadata after confirmation. It does not delete files from disk.

Create permanent worktree and Archive chats appear in Milestone 1, but they are disabled and show a coming-soon hint.

## Empty States

### No project selected

The main area shows:

```text
What should we work on?
```

The composer is visible. Its project selector shows `Work in a project`.

The user can add or select a project from the sidebar or composer project selector.

### Selected project with no chats

The sidebar shows the project row and a `No chats` child row.

The main area shows:

```text
What should we build in {projectName}?
```

The composer is visible and the project selector is set to the selected project.

Prompt submission remains unavailable until Milestone 2. The disabled state should make the runtime limitation visible.

### Selected project with chats

The sidebar shows chat metadata under the project. Selecting a chat opens a static chat route based on the stored metadata.

Milestone 1 stores chat metadata only. It does not store or render full Pi message history.

## Missing Folder Recovery

The app checks folder availability when loading projects and when selecting a project.

If a folder is missing or unavailable:

- The project remains visible in the sidebar.
- The project row uses warning styling.
- Selecting the project shows a recovery screen.
- Workspace-dependent actions are unavailable.
- Chat metadata remains attached to the project record.

The recovery screen includes:

- Locate folder.
- Remove.

Locate folder opens the native folder picker and updates the project path. If the located path exists, the project becomes available and its existing chat metadata appears again.

If the located folder name differs from the prior path, the app keeps the stored project display name unless the user renames it.

Remove deletes only the desktop project metadata and its associated chat metadata.

## Data Model

Use a JSON store in Electron `app.getPath("userData")`, for example:

```text
project-store.json
```

Main process owns store reads and writes. Renderer code receives renderer-safe DTOs through typed IPC.

Store fields:

- `projects`: project records.
- `selectedProjectId`: current selected project, if any.
- `chatsByProject`: chat metadata grouped by project id.

Project record fields:

- `id`
- `displayName`
- `path`
- `createdAt`
- `updatedAt`
- `lastOpenedAt`
- `pinned`
- `availability`

Chat metadata fields:

- `id`
- `projectId`
- `title`
- `status`
- `updatedAt`

Availability should be a discriminated union, such as:

- `available`
- `missing`
- `unavailable`

The app should validate JSON at load time. Malformed store data should produce a visible error instead of silently replacing user data.

## Ordering

Projects sort as:

1. Pinned projects.
2. Unpinned projects by most recent activity or selection.

Chat metadata under each project sorts by most recent update.

## IPC and Preload API

Add typed IPC handlers for project and chat metadata actions:

- `project:getState`
- `project:createFromScratch`
- `project:addExistingFolder`
- `project:select`
- `project:rename`
- `project:remove`
- `project:openInFinder`
- `project:locateFolder`
- `project:setPinned`
- `project:checkAvailability`
- `chat:create`
- `chat:select`

All IPC results use the existing typed result pattern. Inputs and outputs should be validated at the IPC boundary.

Main process owns:

- Native dialogs.
- File and folder checks.
- JSON store writes.
- Git initialization.
- Opening folders in Finder.

Renderer owns:

- Sidebar rendering.
- Empty states.
- Menu state.
- Current project and chat selection state from DTOs.

## Error Handling

Errors should be visible in the app.

Expected errors include:

- Store read failure.
- Store validation failure.
- Store write failure.
- Folder creation failure.
- Git initialization failure.
- Existing-folder selection with no selected path.
- Missing or unavailable project folder.
- Finder open failure.

The app should fail loud at the failing operation. It should not fall back to mock projects or synthetic success states.

## Testing

Unit tests should cover:

- JSON store load and save.
- Empty store initialization.
- Malformed JSON failure.
- Project ordering with pinned projects first.
- Next `New project N` name selection.
- Project recovery preserving chat metadata.
- IPC schema validation for project and chat payloads.
- Store validation rejecting unexpected fields.

Integration tests should cover:

- Creating a new project through the main-process service.
- Git initialization on `main`.
- Adding an existing folder.
- Selecting a project.
- Renaming a project.
- Removing a project.
- Locating a missing project folder.

Smoke tests should cover:

- App boots.
- Global empty state renders `What should we work on?`.
- Projects section and add-project control are visible.
- Selecting or creating a project with no chats renders the project composer state.

Manual verification should cover:

- Create a new project.
- Confirm the folder exists in `/Users/gannonhall/Documents`.
- Confirm git branch is `main`.
- Add an existing folder.
- Restart the app and confirm projects persist.
- Move or delete a project folder and confirm missing-folder recovery UI.
- Locate the folder and confirm chat metadata reappears.

## Acceptance

Milestone 1 is complete when:

- User can create a new local project from scratch.
- User can add an existing local folder as a project.
- User can see projects and their chat metadata in the sidebar.
- User can select a project and see the correct empty state.
- User can restart the app and see recent projects preserved.
- User can see missing folders and recover or remove them.
- Project metadata persists in JSON under Electron user data.
