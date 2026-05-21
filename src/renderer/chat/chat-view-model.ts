import { formatChatDisplayLabel } from "../../shared/format-chat-display-label";
import type { PiSessionSettingsPayload } from "../../shared/pi-session";
import type { ChatStatus, ProjectStateView } from "../../shared/project-state";
import { buildComposerContext, type ComposerContext } from "./composer-view-model";
import type { LiveSessionState } from "../session/session-state";

export type { ComposerContext } from "./composer-view-model";

interface SelectedChatSessionLabels {
	resumeLabel: "Start session" | "Resume session";
	metadataLabel: string;
}

export type ChatSessionHeader = {
	title: string;
	resumeLabel?: SelectedChatSessionLabels["resumeLabel"];
	metadataLabel?: string;
};

export type ChatSuggestion =
	| "Review my recent commits for correctness risks and maintainability concerns"
	| "Unblock my most recent open PR"
	| "Connect your favorite apps to Pi";

type ComposerRouteBase =
	| {
			kind: "global-start";
			title: "What should we work on?";
			suggestions: readonly ChatSuggestion[];
	  }
	| {
			kind: "project-start";
			title: string;
			projectId: string;
			suggestions: readonly ChatSuggestion[];
	  }
	| ({
			kind: "standalone-start";
			title: string;
			chatId: string;
			suggestions: readonly ChatSuggestion[];
	  } & SelectedChatSessionLabels)
	| ({
			kind: "empty-chat";
			title: string;
			startTitle: string;
			projectId: string;
			chatId: string;
			suggestions: readonly ChatSuggestion[];
	  } & SelectedChatSessionLabels);

export type ChatShellRoute =
	| (ComposerRouteBase & { composer: ComposerContext })
	| {
			kind: "unavailable-project";
			title: string;
			body: string;
			projectId: string;
			projectSelectorLabel: string;
	  };

const suggestions = [
	"Review my recent commits for correctness risks and maintainability concerns",
	"Unblock my most recent open PR",
	"Connect your favorite apps to Pi",
] as const satisfies readonly ChatSuggestion[];

const createSelectedChatSessionLabels = (chat: {
	sessionPath: string | null;
	status: ChatStatus;
	updatedAt: string;
	cwd: string;
}): SelectedChatSessionLabels => ({
	resumeLabel: chat.sessionPath ? "Resume session" : "Start session",
	metadataLabel: `${chat.status} · ${chat.cwd} · updated ${new Date(chat.updatedAt).toLocaleString()}`,
});

const withComposer = (
	base: ComposerRouteBase,
	view: ProjectStateView,
	session: LiveSessionState,
	settings: PiSessionSettingsPayload | null,
): ComposerRouteBase & { composer: ComposerContext } => ({
	...base,
	composer: buildComposerContext(base, view, session, settings),
});

export const createChatShellRoute = (
	view: ProjectStateView,
	session: LiveSessionState,
	settings: PiSessionSettingsPayload | null,
): ChatShellRoute => {
	const selectedProject = view.selectedProject;
	const selectedChat = view.selectedChat;

	if (!selectedProject) {
		if (selectedChat) {
			return withComposer(
				{
					kind: "standalone-start",
					title: formatChatDisplayLabel(selectedChat.title),
					chatId: selectedChat.id,
					suggestions,
					...createSelectedChatSessionLabels(selectedChat),
				},
				view,
				session,
				settings,
			);
		}

		return withComposer(
			{
				kind: "global-start",
				title: "What should we work on?",
				suggestions,
			},
			view,
			session,
			settings,
		);
	}

	const projectSelectorLabel = selectedProject.displayName;

	if (selectedProject.availability.status !== "available") {
		return {
			kind: "unavailable-project",
			title: `${selectedProject.displayName} is unavailable`,
			body:
				selectedProject.availability.status === "unavailable"
					? selectedProject.availability.reason
					: "Locate the project folder or remove it from the sidebar.",
			projectId: selectedProject.id,
			projectSelectorLabel,
		};
	}

	if (!selectedChat) {
		return withComposer(
			{
				kind: "project-start",
				title: `What should we build in ${selectedProject.displayName}?`,
				projectId: selectedProject.id,
				suggestions,
			},
			view,
			session,
			settings,
		);
	}

	return withComposer(
		{
			kind: "empty-chat",
			title: formatChatDisplayLabel(selectedChat.title),
			startTitle: `What should we build in ${selectedProject.displayName}?`,
			projectId: selectedProject.id,
			chatId: selectedChat.id,
			suggestions,
			...createSelectedChatSessionLabels(selectedChat),
		},
		view,
		session,
		settings,
	);
};

export const hasLiveSession = (session: LiveSessionState) =>
	session.status !== "idle" || session.messages.length > 0 || Boolean(session.errorMessage);

export const isResumableChatRoute = (route: Exclude<ChatShellRoute, { kind: "unavailable-project" }>): boolean =>
	(route.kind === "empty-chat" || route.kind === "standalone-start") && route.resumeLabel === "Resume session";

export const shouldUseChatStartLayout = (
	route: Exclude<ChatShellRoute, { kind: "unavailable-project" }>,
	session: LiveSessionState,
): boolean =>
	!hasLiveSession(session) &&
	!isResumableChatRoute(route) &&
	(route.kind === "global-start" ||
		route.kind === "project-start" ||
		route.kind === "standalone-start" ||
		(route.kind === "empty-chat" && route.resumeLabel === "Start session"));

export const resolveChatSessionHeader = (
	route: ChatShellRoute,
	session: LiveSessionState,
): ChatSessionHeader | null => {
	if (route.kind === "unavailable-project" || shouldUseChatStartLayout(route, session)) {
		return null;
	}

	if (route.kind === "empty-chat" || route.kind === "standalone-start") {
		return {
			title: route.title,
			resumeLabel: route.resumeLabel,
			metadataLabel: route.metadataLabel,
		};
	}

	return { title: route.title };
};
