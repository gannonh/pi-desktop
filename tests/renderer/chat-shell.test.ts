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
	resumeLabel: "Resume session",
	metadataLabel: "running · updated 5/12/2026, 10:00:00 AM",
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

	it("renders session labels near the selected chat title", () => {
		const markup = renderChatShell(continuedRoute, createInitialSessionState());

		expect(markup).toContain("Milestone transcript");
		expect(markup).toContain("Resume session");
		expect(markup).toContain("running · updated 5/12/2026, 10:00:00 AM");
		expect(markup).toContain("chat-shell__session-labels");
	});

	it("renders session labels for a selected standalone start route", () => {
		const route: Exclude<ChatShellRoute, { kind: "unavailable-project" }> = {
			kind: "standalone-start",
			title: "Standalone",
			chatId: "chat:standalone",
			composer: {
				projectSelectorLabel: "/tmp/outside",
				modeLabel: "Work locally",
				modelLabel: "5.5 High",
				runtimeAvailable: true,
				disabledReason: "",
			},
			suggestions: ["Review my recent commits for correctness risks and maintainability concerns"],
			resumeLabel: "Resume session",
			metadataLabel: "idle · updated 5/12/2026, 10:00:00 AM",
		};

		const markup = renderChatShell(route, createInitialSessionState());

		expect(markup).toContain("chat-shell--start");
		expect(markup).toContain("Standalone");
		expect(markup).toContain("Resume session");
		expect(markup).toContain("idle · updated 5/12/2026, 10:00:00 AM");
	});

	it("renders an active project start session in the session layout", () => {
		const route: Exclude<ChatShellRoute, { kind: "unavailable-project" }> = {
			kind: "project-start",
			title: "What should we build in pi-desktop?",
			projectId: "project:/tmp/pi-desktop",
			composer,
			suggestions: ["Review my recent commits for correctness risks and maintainability concerns"],
		};

		const markup = renderChatShell(route);

		expect(markup).toContain("chat-shell--session");
		expect(markup).toContain("Live response");
		expect(markup).toContain("Pi session transcript");
		expect(markup).toContain("chat-shell__bottom-composer");
		expect(markup).not.toContain("chat-shell__suggestions");
	});

	it("renders live Pi output when a session belongs to an empty chat route", () => {
		const route: Exclude<ChatShellRoute, { kind: "unavailable-project" }> = {
			kind: "empty-chat",
			title: "Empty chat",
			startTitle: "What should we build in pi-desktop?",
			projectId: "project:/tmp/pi-desktop",
			chatId: "chat:empty",
			composer,
			suggestions: ["Review my recent commits for correctness risks and maintainability concerns"],
			resumeLabel: "Start session",
			metadataLabel: "idle · updated 5/12/2026, 10:00:00 AM",
		};

		const markup = renderChatShell(route);

		expect(markup).toContain("Live response");
		expect(markup).toContain("Pi session transcript");
		expect(markup).not.toContain("No messages yet.");
	});

	it("renders a resumable selected chat in the session layout before live messages", () => {
		const route = {
			kind: "empty-chat",
			title: "What is the today's date?",
			startTitle: "What should we build in pi-desktop?",
			projectId: "project:/tmp/pi-desktop",
			chatId: "chat:session:one",
			composer,
			suggestions: ["Review my recent commits for correctness risks and maintainability concerns"],
			resumeLabel: "Resume session",
			metadataLabel: "running · updated 5/17/2026, 8:46:05 AM",
		} as Exclude<ChatShellRoute, { kind: "unavailable-project" }>;

		const markup = renderChatShell(route, createInitialSessionState());

		expect(markup).toContain("chat-shell--session");
		expect(markup).toContain("What is the today&#x27;s date?");
		expect(markup).toContain("Resume session");
		expect(markup).toContain("No messages yet.");
		expect(markup).toContain("chat-shell__bottom-composer");
		expect(markup).not.toContain("What should we build in pi-desktop?");
		expect(markup).not.toContain("chat-shell__suggestions");
	});

	it("renders an empty selected draft chat as the centered project start state before the first message", () => {
		const route = {
			kind: "empty-chat",
			title: "New chat",
			startTitle: "What should we build in pi-desktop?",
			projectId: "project:/tmp/pi-desktop",
			chatId: "chat:empty",
			composer,
			suggestions: ["Review my recent commits for correctness risks and maintainability concerns"],
			resumeLabel: "Start session",
			metadataLabel: "idle · updated 5/12/2026, 10:00:00 AM",
		} as Exclude<ChatShellRoute, { kind: "unavailable-project" }>;

		const markup = renderChatShell(route, createInitialSessionState());

		expect(markup).toContain("chat-shell--start");
		expect(markup).toContain("What should we build in pi-desktop?");
		expect(markup).toContain("Start session");
		expect(markup).toContain("idle · updated 5/12/2026, 10:00:00 AM");
		expect(markup).not.toContain('class="chat-shell__metadata"');
		expect(markup).not.toContain("No messages yet.");
		expect(markup).not.toContain("chat-shell__bottom-composer");
	});
});
