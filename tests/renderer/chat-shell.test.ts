import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ChatShellRoute } from "../../src/renderer/chat/chat-view-model";
import { ChatShell } from "../../src/renderer/components/chat-shell";
import { createInitialSessionState, type LiveSessionState } from "../../src/renderer/session/session-state";

const composer = {
	projectSelectorLabel: "pi-desktop",
	modeLabel: "Work locally" as const,
	modelLabel: "5.5 High" as const,
	runtimeAvailable: true,
	disabledReason: "",
	projectId: "project:/tmp/pi-desktop",
};

const liveSession: LiveSessionState = {
	sessionId: "project:/tmp/pi-desktop:sdk-session:one",
	status: "running",
	statusLabel: "Running",
	messages: [{ id: "assistant:1", role: "assistant", content: "Live response", streaming: true }],
	errorMessage: "",
	retryMessage: "",
};

const continuedRoute: Exclude<ChatShellRoute, { kind: "unavailable-project" }> = {
	kind: "continued-chat",
	title: "Milestone transcript",
	projectId: "project:/tmp/pi-desktop",
	chatId: "chat:milestone-01",
	composer,
	transcript: {
		workedLabel: "Worked for 7m 10s",
		assistantSummary: ["Selected chat summary"],
		cards: [{ title: "SKILL.md", subtitle: "Document · MD", actionLabel: "Open" }],
		userFollowUp: "land the pr",
		followUpWorkedLabel: "Worked for 55s",
		followUpSummary: ["Merged PR #2."],
	},
};

const renderChatShell = (
	route: Exclude<ChatShellRoute, { kind: "unavailable-project" }>,
	session: LiveSessionState = liveSession,
) =>
	renderToStaticMarkup(
		createElement(ChatShell, {
			route,
			session,
			onSubmitPrompt: vi.fn(),
			onAbortSession: vi.fn(),
		}),
	);

describe("ChatShell", () => {
	it("renders the selected transcript when no live session belongs to the route", () => {
		const markup = renderChatShell(continuedRoute, createInitialSessionState());

		expect(markup).toContain("Selected chat summary");
		expect(markup).not.toContain("Live response");
		expect(markup).not.toContain("Pi session transcript");
	});

	it("renders live Pi output when a session belongs to the selected chat route", () => {
		const markup = renderChatShell(continuedRoute);

		expect(markup).toContain("Live response");
		expect(markup).toContain("Pi session transcript");
		expect(markup).not.toContain("Selected chat summary");
	});

	it("renders live Pi output when a session belongs to an empty chat route", () => {
		const route: Exclude<ChatShellRoute, { kind: "unavailable-project" }> = {
			kind: "empty-chat",
			title: "Empty chat",
			projectId: "project:/tmp/pi-desktop",
			chatId: "chat:empty",
			composer,
		};

		const markup = renderChatShell(route);

		expect(markup).toContain("Live response");
		expect(markup).toContain("Pi session transcript");
		expect(markup).not.toContain("No messages yet.");
	});
});
