import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ChatShellRoute } from "../../src/renderer/chat/chat-view-model";
import { ChatShell } from "../../src/renderer/components/chat-shell";
import { ShellTestProviders } from "./shell-test-providers";
import { createInitialSessionState, type LiveSessionState } from "../../src/renderer/session/session-state";
import {
	createIdleTranscriptHydration,
	createLoadedTranscriptHydration,
} from "../../src/renderer/session/transcript-hydration";
import { createComposerContext, createComposerHost } from "./composer-fixtures";

const composer = createComposerContext({
	projectSelectorLabel: "pi-desktop",
	modelLabel: "5.5 High",
	thinkingLabel: "High",
	projectId: "project:/tmp/pi-desktop",
});

const composerHost = createComposerHost();

const scope = { projectId: "project:/tmp/pi-desktop", chatId: "chat:session:one" };

const liveSession: LiveSessionState = {
	sessionId: "project:/tmp/pi-desktop:sdk-session:one",
	status: "running",
	statusLabel: "Running",
	messages: [{ id: "assistant:1", role: "assistant", content: "Live response", streaming: true }],
	toolExecutions: [],
	errorMessage: "",
	retryMessage: "",
	settings: null,
	queuedMessages: [],
};

const renderChatShell = (
	route: Exclude<ChatShellRoute, { kind: "unavailable-project" }>,
	session: LiveSessionState = liveSession,
	hydration = createIdleTranscriptHydration(),
) =>
	renderToStaticMarkup(
		createElement(
			ShellTestProviders,
			null,
			createElement(ChatShell, {
				route,
				session,
				hydration,
				scope,
				composerHost,
				onAbortSession: vi.fn(),
			}),
		),
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
			composer: createComposerContext({
				projectSelectorLabel: "/tmp/outside",
				modelLabel: "5.5 High",
				thinkingLabel: "High",
			}),
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

	it("renders hydrated history in the session layout without an empty-state flash", () => {
		const route = {
			kind: "empty-chat",
			title: "What is the today's date?",
			startTitle: "What should we build in pi-desktop?",
			projectId: "project:/tmp/pi-desktop",
			chatId: "chat:session:one",
			composer,
			suggestions: ["Review my recent commits for correctness risks and maintainability concerns"],
			resumeLabel: "Resume session",
			metadataLabel: "idle · updated 5/17/2026, 8:46:05 AM",
		} as Exclude<ChatShellRoute, { kind: "unavailable-project" }>;
		const hydratedSession = {
			...createInitialSessionState(),
			sessionId: "project:/tmp/pi-desktop:sdk-session:one",
			messages: [{ id: "assistant:one", role: "assistant" as const, content: "Earlier answer", streaming: false }],
		};

		const markup = renderChatShell(route, hydratedSession, createLoadedTranscriptHydration(scope));

		expect(markup).toContain("chat-shell--session");
		expect(markup).toContain("Earlier answer");
		expect(markup).not.toContain("No messages yet.");
		expect(markup).not.toContain("What should we build in pi-desktop?");
	});

	it("renders the right panel workspace in the session layout without exposing raw tool calls", () => {
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

		const markup = renderChatShell(route, {
			...liveSession,
			toolExecutions: [
				{
					id: "call_1",
					toolName: "bash",
					status: "running",
					args: { command: "pnpm test" },
					partialResult: null,
					result: null,
					isError: false,
					startedAt: "2026-05-14T12:00:00.000Z",
					updatedAt: "2026-05-14T12:00:00.000Z",
					endedAt: null,
				},
			],
		});

		expect(markup).toContain("chat-shell__session-body");
		expect(markup).toContain('aria-label="Workspace panel"');
		expect(markup).toContain("M07A.2 right panel tab shell");
		expect(markup).not.toContain("workspace-tab-strip");
		expect(markup).not.toContain('aria-label="Tool timeline"');
		expect(markup).not.toContain("pnpm test");
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
