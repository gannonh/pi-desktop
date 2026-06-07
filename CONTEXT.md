# Pi Desktop

A local graphical command center for Pi coding-agent sessions: projects, chats, and the composer as the primary input surface for agent work.

## Language

**Composer**:
The chat input surface where the user chooses project context, model, thinking level, and sends messages to the active Pi session.
_Avoid_: Input bar, prompt box

**Command palette**:
The slash-triggered composer popover for Desktop command affordances. Typing `/` at the start of composer text or after whitespace opens it; Arrow keys move, Enter selects, and Escape dismisses. The S010 shell has section stubs until family slices wire concrete command actions.
_Avoid_: Slash-command clone, prompt command

**Project start**:
The composer state for starting new agent work in a selected project before the first prompt creates a session-backed chat.
_Avoid_: Empty project chat, pre-session chat

**Pi default model**:
The model Pi uses for future new sessions when the user has not chosen a different model in the current composer. Composer model selection follows Pi CLI behavior and updates this default.
_Avoid_: Project default model, app default model

**Pi default thinking level**:
The thinking level Pi uses for future new sessions when the user has not chosen a different level in the current composer. Composer thinking selection follows Pi CLI behavior and updates this default.
_Avoid_: Project thinking default, app thinking default

**Prompt**:
A user-authored message submitted to start or continue agent work in the current chat session.
_Avoid_: Message (when referring only to user input), command

**Attachment**:
A file the user adds in the composer before Send: images (vision input) or documents whose extracted text is merged into the prompt. Attachments appear as removable tiles above the composer input; they are processed in the renderer and submitted with the prompt.
_Avoid_: Upload, file picker (as product noun)

**Session-backed chat**:
A chat whose Pi session can be resumed or loaded as transcript history.
_Avoid_: Real chat, saved chat

**Live session**:
The currently active in-memory Pi runtime for the selected chat or project start flow.
_Avoid_: Active chat, running chat

**Steering message**:
A prompt submitted while the agent is running. It is queued and delivered at Pi's next steering point in the active run; it does not stop the current agent work by itself.
_Avoid_: Interrupt message, instant interruption, steer (as a standalone noun in user-facing copy)

**Follow-up message**:
A prompt submitted while the agent is running and held until the active run has no remaining tool calls or steering messages.
_Avoid_: Generic queued message, deferred prompt

**Queued message delivery**:
The delivery type of a queued running-session prompt: **steering message** or **follow-up message**. In Pi Desktop, queued messages appear in a compact row above the composer with an inline action to switch delivery while still queued, plus delete and overflow actions.
_Avoid_: Queue type, queue priority

**Prompt delivery**:
How a submitted prompt is handed to Pi when the session is idle or busy: as a normal turn start, as a steering message, or as a follow-up message. In a running session, Send/Enter uses **steering message** delivery and Option+Enter uses **follow-up message** delivery.
_Avoid_: Streaming behavior, queue mode

**Abort run**:
User-initiated cancellation of the agent's current active run in the live session.
_Avoid_: Stop, kill, cancel session

**Composer run focus**:
While a run is active, the composer presents one primary action at a time: **Abort run** when the input is empty, or Send (for a **steering message**) when the user has draft text. Both are not shown together.
_Avoid_: Dual-action bar, stop-and-send

**Steer turn**:
The composer mode during an active agent run when the user may send a **steering message** instead of starting a new turn. Surfaced in UI copy so the user knows Send will steer, not start fresh.
_Avoid_: Steer mode, interrupt mode, streaming mode

**Steer target settings**:
The model and thinking level selected while a run is active. If the user changes them before sending a **steering message**, Pi uses the newly selected model/thinking level at the next steering point.
_Avoid_: Running defaults, temporary model

## Operating rule

**Pi CLI parity**:
Pi Desktop follows Pi CLI behavior for model defaults, thinking defaults, prompt delivery, queued messages, and session semantics. Drift is allowed only when the GUI requires a visible affordance for behavior that exists as a keyboard or terminal interaction in the CLI.

## Flagged ambiguities

**Follow-up (idle vs busy)**:
"Follow-up" in roadmap acceptance can mean (1) any prompt sent in a resumed chat while idle, or (2) a follow-up message in the Pi sense (queued until the run ends). In product language, reserve **follow-up message** for (2). Use **prompt** or **continue the chat** for (1).

**New chat defaults**:
For M06, a **project start** composer shows the **Pi default model** and **Pi default thinking level** unless the user changes them before sending. Composer model and thinking selection follow Pi CLI behavior and update Pi defaults for future new sessions; they do not create durable project-specific defaults.

**Running model changes**:
During a **steer turn**, model and thinking controls remain available. Changing them before Send updates the **steer target settings** for the steering message.

**First-message project selection**:
Project selection belongs only to the first-message composer used before a session-backed chat exists. Once the user is in an active or resumed project session, the session composer does not offer project switching.
_Avoid_: In-session project switcher

**Composer project selection**:
Selecting a project from the composer selects that project and shows the **project start** composer. It does not create a chat row before the first prompt.

**Changes**:
The right-panel tool tab for local git source control on the selected project: inspect working-tree changes, stage, commit, sync, compare branches, and create or link GitHub pull requests. Chat stays active in the center column.
_Avoid_: Diffs tab (legacy internal kind name), Checks panel

**PR review**:
The deferred right-panel tool tab for hosted pull request review: CI checks, threaded comments, merge and conflict triage. Not part of the Changes milestone; the old Changes mock incorrectly mixed this surface with local git.
_Avoid_: Checks (Orca internal name), PR section inside Changes

## Example dialogue

**Dev:** What model should a new chat in a project use?
**Expert:** The **project start** composer shows Pi's default model and thinking level. If the user changes them before Send, the started session uses that choice.
**Dev:** User sends while the agent is running — what happens?
**Expert:** That is a **steering message**. Pi queues it for the next steering point in the active run; it does not stop the current work by itself.
**Dev:** And if they use Option+Enter like the CLI?
**Expert:** That is a **follow-up message**. It waits until the active run has no remaining tool calls or steering messages.
**Dev:** Can they change their mind after queuing it?
**Expert:** Yes. While a message remains queued, Pi Desktop should expose **queued message delivery** controls so the user can switch it between steering and follow-up.
**Dev:** Can they abort while typing a steer?
**Expert:** Not at the same moment — **composer run focus** switches to Send once there is draft text. Clear the input to get **Abort run** back.
