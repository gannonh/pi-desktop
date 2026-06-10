import { describe, expect, it } from "vitest";
import {
	bufferPendingSessionEvent,
	createPendingSessionEventBuffer,
	isSessionScopeSelected,
	resolvePromptSessionStartSelection,
	shouldAcceptSessionEvent,
	shouldBufferPendingStartEvent,
	takeBufferedSessionEvents,
} from "../../src/renderer/session/session-scope";
import { createInitialSessionState, reduceSessionEvent } from "../../src/renderer/session/session-state";
import { createProjectId, DEFAULT_PROJECT_GIT_SETTINGS, type ProjectStateView } from "../../src/shared/project-state";

const now = "2026-05-14T12:00:00.000Z";

const createProjectState = (overrides: Partial<ProjectStateView>): ProjectStateView => ({
	projects: [],
	standaloneChats: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
	...overrides,
});

describe("resolvePromptSessionStartSelection", () => {
	it("uses the selected standalone chat id for a quick-start draft payload", () => {
		const standaloneChat = {
			id: "chat:quick-start",
			source: "draft" as const,
			sessionId: null,
			sessionPath: null,
			cwd: "/tmp/desktop-chats",
			title: "New chat",
			status: "idle" as const,
			attention: false,
			createdAt: now,
			updatedAt: now,
			lastOpenedAt: null,
		};

		expect(
			resolvePromptSessionStartSelection(
				createProjectState({
					standaloneChats: [standaloneChat],
					selectedProjectId: null,
					selectedChatId: standaloneChat.id,
					selectedChat: standaloneChat,
				}),
			),
		).toEqual({ ok: true, projectId: null, chatId: standaloneChat.id });
	});

	it("uses the selected standalone chat id for a resumable projectless start payload", () => {
		const standaloneChat = {
			id: "chat:session:standalone",
			source: "pi-session" as const,
			sessionId: "standalone-session-one",
			sessionPath: "/tmp/outside/standalone.jsonl",
			cwd: "/tmp/outside",
			title: "Standalone",
			status: "idle" as const,
			attention: false,
			createdAt: now,
			updatedAt: now,
			lastOpenedAt: null,
		};

		expect(
			resolvePromptSessionStartSelection(
				createProjectState({
					standaloneChats: [standaloneChat],
					selectedProjectId: null,
					selectedChatId: standaloneChat.id,
					selectedChat: standaloneChat,
				}),
			),
		).toEqual({ ok: true, projectId: null, chatId: standaloneChat.id });
	});

	it("uses the selected project chat id for a project start payload", () => {
		const projectPath = "/tmp/pi-desktop";
		const projectId = createProjectId(projectPath);
		const projectChat = {
			id: "chat:session:project",
			projectId,
			source: "pi-session" as const,
			sessionId: "project-session-one",
			sessionPath: "/tmp/pi-desktop/session.jsonl",
			cwd: projectPath,
			title: "Project chat",
			status: "idle" as const,
			attention: false,
			createdAt: now,
			updatedAt: now,
			lastOpenedAt: null,
		};
		const project = {
			id: projectId,
			displayName: "pi-desktop",
			path: projectPath,
			createdAt: now,
			updatedAt: now,
			lastOpenedAt: now,
			pinned: false,
			availability: { status: "available" as const },
			gitSettings: DEFAULT_PROJECT_GIT_SETTINGS,
			chats: [projectChat],
		};

		expect(
			resolvePromptSessionStartSelection(
				createProjectState({
					projects: [project],
					selectedProjectId: projectId,
					selectedChatId: projectChat.id,
					selectedProject: project,
					selectedChat: projectChat,
				}),
			),
		).toEqual({ ok: true, projectId, chatId: projectChat.id });
	});

	it("requires an available project or selected standalone chat", () => {
		expect(resolvePromptSessionStartSelection(createProjectState({}))).toEqual({
			ok: false,
			errorMessage: "Select an available project or quick-start chat to start a Pi session.",
		});
	});
});

describe("isSessionScopeSelected", () => {
	it("keeps live session output scoped to the selected project start route", () => {
		expect(
			isSessionScopeSelected(
				{ projectId: "project:/tmp/pi-desktop", chatId: null },
				{ projectId: "project:/tmp/pi-desktop", chatId: null },
			),
		).toBe(true);
	});

	it("keeps live session output scoped to the selected chat route", () => {
		expect(
			isSessionScopeSelected(
				{ projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				{ projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
			),
		).toBe(true);
	});

	it("hides live session output when another chat is selected", () => {
		expect(
			isSessionScopeSelected(
				{ projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				{ projectId: "project:/tmp/pi-desktop", chatId: "chat:two" },
			),
		).toBe(false);
	});

	it("hides live session output when another project is selected", () => {
		expect(
			isSessionScopeSelected(
				{ projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				{ projectId: "project:/tmp/other", chatId: "chat:one" },
			),
		).toBe(false);
	});

	it("keeps live session output scoped to the selected standalone chat route", () => {
		expect(
			isSessionScopeSelected(
				{ projectId: null, chatId: "chat:standalone" },
				{ projectId: null, chatId: "chat:standalone" },
			),
		).toBe(true);
	});

	it("does not treat the empty project route as a selected session scope", () => {
		expect(isSessionScopeSelected({ projectId: null, chatId: null }, { projectId: null, chatId: null })).toBe(false);
	});
});

describe("shouldAcceptSessionEvent", () => {
	it("rejects same-project pending start events before the start RPC response resolves", () => {
		expect(
			shouldAcceptSessionEvent({
				eventSessionId: "project:/tmp/pi-desktop:session:stale",
				acceptedSessionId: null,
				active: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				selection: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
			}),
		).toBe(false);
	});

	it("accepts events from the session returned by the current start request", () => {
		expect(
			shouldAcceptSessionEvent({
				eventSessionId: "project:/tmp/pi-desktop:session:one",
				acceptedSessionId: "project:/tmp/pi-desktop:session:one",
				active: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				selection: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
			}),
		).toBe(true);
	});

	it("accepts events from the selected standalone chat session", () => {
		expect(
			shouldAcceptSessionEvent({
				eventSessionId: "standalone-session-one",
				acceptedSessionId: "standalone-session-one",
				active: { projectId: null, chatId: "chat:standalone" },
				selection: { projectId: null, chatId: "chat:standalone" },
			}),
		).toBe(true);
	});

	it("rejects same-project events from another session after a session is accepted", () => {
		expect(
			shouldAcceptSessionEvent({
				eventSessionId: "project:/tmp/pi-desktop:session:two",
				acceptedSessionId: "project:/tmp/pi-desktop:session:one",
				active: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				selection: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
			}),
		).toBe(false);
	});

	it("rejects pending start events after the user selects another chat", () => {
		expect(
			shouldAcceptSessionEvent({
				eventSessionId: "project:/tmp/pi-desktop:session:one",
				acceptedSessionId: null,
				active: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				selection: { projectId: "project:/tmp/pi-desktop", chatId: "chat:two" },
			}),
		).toBe(false);
	});

	it("rejects project id prefix collisions before the start RPC response resolves", () => {
		expect(
			shouldAcceptSessionEvent({
				eventSessionId: "project:/tmp/pi-desktop:collision:session:one",
				acceptedSessionId: null,
				active: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				selection: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
			}),
		).toBe(false);
	});
});

describe("pending start event buffering", () => {
	it("buffers pending start events only while the selected start request is current", () => {
		expect(
			shouldBufferPendingStartEvent({
				eventSessionId: "project:/tmp/pi-desktop:session:pending",
				acceptedSessionId: null,
				pendingStart: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				selection: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
			}),
		).toBe(true);

		expect(
			shouldBufferPendingStartEvent({
				eventSessionId: "project:/tmp/pi-desktop:session:pending",
				acceptedSessionId: "project:/tmp/pi-desktop:session:one",
				pendingStart: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				selection: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
			}),
		).toBe(false);
	});

	it("buffers the first session start before active state is committed", () => {
		expect(
			shouldBufferPendingStartEvent({
				eventSessionId: "project:/tmp/pi-desktop:session:first",
				acceptedSessionId: null,
				pendingStart: { projectId: "project:/tmp/pi-desktop", chatId: null },
				selection: { projectId: "project:/tmp/pi-desktop", chatId: null },
			}),
		).toBe(true);
	});

	it("buffers standalone pending start events for the selected standalone chat", () => {
		expect(
			shouldBufferPendingStartEvent({
				eventSessionId: "standalone:sdk-session:pending",
				acceptedSessionId: null,
				pendingStart: { projectId: null, chatId: "chat:standalone" },
				selection: { projectId: null, chatId: "chat:standalone" },
			}),
		).toBe(true);

		expect(
			shouldBufferPendingStartEvent({
				eventSessionId: "standalone:sdk-session:pending",
				acceptedSessionId: null,
				pendingStart: { projectId: null, chatId: "chat:standalone" },
				selection: { projectId: null, chatId: "chat:other" },
			}),
		).toBe(false);
	});

	it("does not buffer pending start events from another project session", () => {
		const buffer = createPendingSessionEventBuffer();
		const foreignEvent = {
			type: "message_start" as const,
			sessionId: "project:/tmp/other:session:foreign",
			messageId: "assistant:foreign",
			role: "assistant" as const,
			content: "foreign",
			receivedAt: "2026-05-14T12:00:00.000Z",
		};
		const pendingEvent = {
			type: "message_start" as const,
			sessionId: "project:/tmp/pi-desktop:session:real",
			messageId: "assistant:real",
			role: "assistant" as const,
			content: "real",
			receivedAt: "2026-05-14T12:00:01.000Z",
		};

		if (
			shouldBufferPendingStartEvent({
				eventSessionId: foreignEvent.sessionId,
				acceptedSessionId: null,
				pendingStart: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				selection: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
			})
		) {
			bufferPendingSessionEvent(buffer, foreignEvent);
		}
		if (
			shouldBufferPendingStartEvent({
				eventSessionId: pendingEvent.sessionId,
				acceptedSessionId: null,
				pendingStart: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				selection: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
			})
		) {
			bufferPendingSessionEvent(buffer, pendingEvent);
		}

		expect(takeBufferedSessionEvents(buffer, "project:/tmp/other:session:foreign")).toEqual([]);
		expect(takeBufferedSessionEvents(buffer, "project:/tmp/pi-desktop:session:real")).toEqual([pendingEvent]);
	});

	it("replays only buffered events matching the returned start session id", () => {
		const buffer = createPendingSessionEventBuffer();
		bufferPendingSessionEvent(buffer, {
			type: "message_start",
			sessionId: "project:/tmp/pi-desktop:session:stale",
			messageId: "assistant:stale",
			role: "assistant",
			content: "stale",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});
		bufferPendingSessionEvent(buffer, {
			type: "message_start",
			sessionId: "project:/tmp/pi-desktop:session:real",
			messageId: "assistant:real",
			role: "assistant",
			content: "",
			receivedAt: "2026-05-14T12:00:01.000Z",
		});
		bufferPendingSessionEvent(buffer, {
			type: "assistant_delta",
			sessionId: "project:/tmp/pi-desktop:session:real",
			messageId: "assistant:real",
			delta: "Pi session streaming is connected.",
			receivedAt: "2026-05-14T12:00:02.000Z",
		});

		const bufferedEvents = takeBufferedSessionEvents(buffer, "project:/tmp/pi-desktop:session:real");
		let state = createInitialSessionState();
		for (const event of bufferedEvents) {
			state = reduceSessionEvent(state, event);
		}

		expect(state.messages).toEqual([
			{
				id: "assistant:real",
				role: "assistant",
				content: "Pi session streaming is connected.",
				streaming: true,
				receivedAt: "2026-05-14T12:00:01.000Z",
				sequence: 0,
			},
		]);
		expect(takeBufferedSessionEvents(buffer, "project:/tmp/pi-desktop:session:stale")).toEqual([]);
	});
});
