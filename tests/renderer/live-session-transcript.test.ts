import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiveSessionTranscript } from "../../src/renderer/components/live-session-transcript";
import type { LiveSessionState } from "../../src/renderer/session/session-state";

const session: LiveSessionState = {
	sessionId: "session:one",
	status: "running",
	statusLabel: "Running",
	messages: [
		{ id: "user:1", role: "user", content: "First", streaming: false },
		{ id: "user:2", role: "user", content: "Second", streaming: false },
		{ id: "tool:1", role: "tool", content: "npm test", streaming: false },
	],
	toolExecutions: [],
	errorMessage: "",
	retryMessage: "Retrying after rate limit",
	settings: null,
	queuedMessages: [],
};

describe("LiveSessionTranscript", () => {
	it("groups consecutive user messages and shows retry status", () => {
		const markup = renderToStaticMarkup(createElement(LiveSessionTranscript, { session }));

		expect(markup).toContain("live-session__message--grouped");
		expect(markup).toContain("Retrying after rate limit");
		expect(markup).toContain("live-session__tool-details");
	});
});
