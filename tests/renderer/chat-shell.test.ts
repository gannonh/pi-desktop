import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ChatShellRoute } from "../../src/renderer/chat/chat-view-model";
import { ChatShell } from "../../src/renderer/components/chat-shell";
import { createInitialSessionState, type LiveSessionState } from "../../src/renderer/session/session-state";
import { createIdleTranscriptHydration } from "../../src/renderer/session/transcript-hydration";

const composer = {
	projectSelectorLabel: "pi-desktop",
	modeLabel: "Work locally" as const,
	modelLabel: "5.5 High" as const,
	runtimeAvailable: true,
	disabledReason: "",
	projectId: "project:/tmp/pi-desktop",
};

const scope = { projectId: "project:/tmp/pi-desktop", chatId: "chat:session:one" };

const liveSession: LiveSessionState = {
	sessionId: "project:/tmp/pi-desktop:sdk-session:one",
	status: "running",
	statusLabel: "Running",
	messages: [{ id: "assistant:1", role: "assistant", content: "Live response", streaming: true }],
	errorMessage: "",
	retryMessage: "",
};

const renderChatShell = (
	route: Exclude<ChatShellRoute, { kind: "unavailable-project" }>,
	session: LiveSessionState = liveSession,
	hydration = createIdleTranscriptHydration(),
) =>
	renderToStaticMarkup(
		createElement(ChatShell, {
			route,
			session,
			hydration,
			scope,
			onSubmitPrompt: vi.fn(),
			onAbortSession: vi.fn(),
		}),
	);

describe("ChatShell", () => {
	it("renders live Pi output when a session belongs to the selected chat route", () => {
		const route: Exclude<ChatShellRoute, { kind: "unavailable-project" }> = {
			kind: "empty-chat",
			title: "Milestone transcript",
			startTitle: "What should we build in pi-desktop?",
			projectId: "project:/tmp/pi-desktop",
			chatId: "chat:session:one",
			composer,
			suggestions: ["Review my recent commits for correctness risks and maintainability concerns"],
			resumeLabel: "Resume session",
			metadataLabel: "running · updated 5/12/2026, 10:00:00 AM",
		};

		const markup = renderChatShell(route);

		expect(markup).toContain("Live response");
		expect(markup).toContain("Pi session transcript");
	});

	it("does not render session metadata in the chat shell body", () => {
		const route: Exclude<ChatShellRoute, { kind: "unavailable-project" }> = {
			kind: "empty-chat",
			title: "Milestone transcript",
			startTitle: "What should we build in pi-desktop?",
			projectId: "project:/tmp/pi-desktop",
			chatId: "chat:session:one",
			composer,
			suggestions: ["Review my recent commits for correctness risks and maintainability concerns"],
			resumeLabel: "Resume session",
			metadataLabel: "running · updated 5/12/2026, 10:00:00 AM",
		};

		const markup = renderChatShell(route, createInitialSessionState());

		expect(markup).not.toContain("chat-shell__metadata");
		expect(markup).not.toContain("Resume session");
		expect(markup).not.toContain("running · updated 5/12/2026, 10:00:00 AM");
	});

	it("renders resumable standalone chats in the session layout without an in-shell header", () => {
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

		expect(markup).toContain("chat-shell--session");
		expect(markup).not.toContain("chat-shell__metadata");
		expect(markup).not.toContain("Resume session");
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

	it("renders a loading placeholder while history hydrates for a resumable chat", () => {
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

		const markup = renderChatShell(route, createInitialSessionState(), createLoadingHydration());

		expect(markup).toContain("chat-shell--session");
		expect(markup).toContain("Loading conversation");
		expect(markup).not.toContain("No messages yet.");
		expect(markup).not.toContain("What should we build in pi-desktop?");
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
		expect(markup).not.toContain('class="chat-shell__metadata"');
		expect(markup).not.toContain("No messages yet.");
		expect(markup).not.toContain("chat-shell__bottom-composer");
	});
});

function createLoadingHydration() {
	return {
		scope,
		status: "loading" as const,
		errorMessage: "",
	};
}
