import { describe, expect, it } from "vitest";
import { isSessionScopeSelected, shouldAcceptSessionEvent } from "../../src/renderer/session/session-scope";

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
	it("accepts the first event from the pending start before the start result returns", () => {
		expect(
			shouldAcceptSessionEvent({
				eventSessionId: "project:/tmp/pi-desktop:session:one",
				acceptedSessionId: null,
				pendingStart: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				active: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				selection: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
			}),
		).toBe(true);
	});

	it("rejects pending start events after the user selects another chat", () => {
		expect(
			shouldAcceptSessionEvent({
				eventSessionId: "project:/tmp/pi-desktop:session:one",
				acceptedSessionId: null,
				pendingStart: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				active: { projectId: "project:/tmp/pi-desktop", chatId: "chat:one" },
				selection: { projectId: "project:/tmp/pi-desktop", chatId: "chat:two" },
			}),
		).toBe(false);
	});
});
