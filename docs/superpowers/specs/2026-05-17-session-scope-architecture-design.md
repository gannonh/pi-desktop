# Session Scope Architecture Design

## Summary

Align `pi-desktop` sidebar session lists with Pi CLI session scopes while keeping Desktop-owned navigation intentional.

- `PROJECTS` represents folders pinned in Desktop.
- Project chat rows represent Pi sessions for that folder, regardless of whether the session started in Desktop or Pi CLI.
- `CHATS` represents Desktop quick-start chats in a Desktop-owned pseudo workspace.
- `CHATS` does not list every session outside pinned projects.

## Problem

Pi CLI `/resume` has two scopes:

- Current folder: sessions whose cwd matches the active folder.
- All: sessions across all folders.

`pi-desktop` currently treats project chat rows as current-folder sessions and treats the sidebar `CHATS` section as all sessions outside tracked projects. That makes the sidebar disagree with the intended product model and causes confusion when comparing a pinned project with Pi CLI current-folder resume.

## Target Semantics

### Projects

A project is a pinned folder in Desktop.

Projects appear in the sidebar only when the user adds or creates them in Desktop. Desktop stores this pinned-folder list in the project store.

Project chat rows are Pi session rows for that folder. For a project path `P`, Desktop derives rows from `SessionManager.list(P, sessionDirFor(P))`, matching Pi CLI current-folder resume for `P`.

Project chat rows include sessions started from:

- Pi CLI in that folder.
- Desktop while that project is selected.
- Future Desktop project actions that target that folder.

### Chats

`CHATS` is a Desktop quick-start area for projectless work.

Rows in `CHATS` come from sessions whose cwd is a Desktop-owned pseudo workspace, for example an app-controlled `desktop-chats` folder under the Pi or app data directory.

Starting a chat from `CHATS` creates or resumes a Pi session in that pseudo workspace. These chats do not duplicate sessions shown under pinned projects.

### All-folder resume

Pi CLI all-folder scope does not map to persistent sidebar `CHATS`.

A future global resume/search picker can expose all-folder sessions. That picker can use `SessionManager.listAll()` or equivalent indexing without changing sidebar ownership.

## Data Model

Desktop-owned project store remains the source for:

- Pinned project folder records.
- Selected project and selected chat ids.
- Per-session UI metadata such as last opened, attention, and transient status.

Pi `SessionManager` remains the source for:

- Session existence.
- Session name and first-message title.
- Session cwd.
- Session created and modified timestamps.
- Session file path.
- Session history and branch data.

`standaloneChats` becomes Desktop quick-start chat metadata. It is populated from the Desktop pseudo workspace only.

## Backend Flow

On state refresh:

1. Load pinned projects from the Desktop project store.
2. For each available project, list sessions for that exact project path via `SessionManager.list(project.path, sessionDirFor(project.path))`.
3. Merge project session rows with Desktop UI metadata by session path.
4. List quick-start `CHATS` from the Desktop pseudo workspace only.
5. Preserve drafts only where they represent an unsent new chat in a selected project or quick-start context.

When starting a session:

- If a project is selected, use that project path as cwd.
- If a quick-start chat is selected or the user starts from `CHATS`, use the Desktop pseudo workspace as cwd.
- Record UI metadata keyed by session path after the Pi session file exists.

## Renderer Flow

The sidebar renders:

- `PROJECTS`: pinned folders with expandable current-folder session rows.
- `CHATS`: quick-start sessions from the Desktop pseudo workspace.

Selecting a project row activates project context.
Selecting a project chat activates that project and chat.
Selecting a `CHATS` row activates quick-start context.

The chat panel can still hydrate messages from persisted session history for any selected Pi-backed chat.

## Migration

Existing `standaloneChats` that point to arbitrary external cwd values do not remain in `CHATS` after this change.

A safe migration path:

- Keep the project store schema compatible for one release if possible.
- On refresh, rebuild quick-start rows from the Desktop pseudo workspace.
- Leave external sessions discoverable later through global resume/search, not the sidebar.
- Preserve `sessionUiByPath` metadata because it can still apply when a session appears under a pinned project or future global resume.

## Testing

Unit coverage asserts:

- Project chat rows exactly use `listProjectSessions(project.path)` and include CLI-origin sessions for that folder.
- `CHATS` rows are loaded only from the Desktop pseudo workspace.
- Sessions from pinned project paths are not duplicated in `CHATS`.
- Sessions from arbitrary unpinned folders are not shown in `CHATS`.
- Starting from project context uses the project path as cwd.
- Starting from `CHATS` uses the Desktop pseudo workspace as cwd.
- Persisted message hydration still works for both project and quick-start sessions.

Smoke or UAT coverage compares:

- Pi CLI `/resume` current-folder list for `pi-desktop`.
- Desktop `pi-desktop` project chat rows.
- Desktop `CHATS` quick-start rows.

## Non-Goals

- Building a global all-folder resume picker now.
- Adding search, filters, or folder grouping for all sessions now.
- Migrating old external standalone sessions into projects automatically.
- Changing Pi CLI session storage semantics.
