import { describe, expect, it } from "vitest";
import {
	bufferPendingSessionEvent,
	createPendingSessionEventBuffer,
	isSessionScopeSelected,
	shouldAcceptSessionEvent,
	shouldBufferPendingStartEvent,
	takeBufferedSessionEvents,
} from "../../src/renderer/session/session-scope";
import { createInitialSessionState, reduceSessionEvent } from "../../src/renderer/session/session-state";

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
				acceptedSessionId: null,
				pendingStart: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				active: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				selection: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
			}),
		).toBe(true);

		expect(
			shouldBufferPendingStartEvent({
				acceptedSessionId: "project:/tmp/pi-desktop:session:one",
				pendingStart: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				active: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				selection: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
			}),
		).toBe(false);
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
			},
		]);
		expect(takeBufferedSessionEvents(buffer, "project:/tmp/pi-desktop:session:stale")).toEqual([]);
	});
});
