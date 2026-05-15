import type { ProjectStateView } from "../../shared/project-state";
import { getStaticTranscript, type StaticTranscript } from "./static-transcripts";

export interface ComposerContext {
	projectSelectorLabel: string;
	modeLabel: "Work locally";
	branchLabel?: string;
	modelLabel: "5.5 High";
	runtimeAvailable: boolean;
	disabledReason: string;
	projectId?: string;
}

export type ChatSuggestion =
	| "Review my recent commits for correctness risks and maintainability concerns"
	| "Unblock my most recent open PR"
	| "Connect your favorite apps to Pi";

export type ChatShellRoute =
	| {
			kind: "global-start";
			title: "What should we work on?";
			composer: ComposerContext;
			suggestions: readonly ChatSuggestion[];
	  }
	| {
			kind: "project-start";
			title: string;
			projectId: string;
			composer: ComposerContext;
			suggestions: readonly ChatSuggestion[];
	  }
	| {
			kind: "empty-chat";
			title: string;
			startTitle: string;
			projectId: string;
			chatId: string;
			composer: ComposerContext;
			suggestions: readonly ChatSuggestion[];
	  }
	| {
			kind: "continued-chat";
			title: string;
			projectId: string;
			chatId: string;
			composer: ComposerContext;
			transcript: StaticTranscript;
	  }
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

const createComposerContext = (
	projectSelectorLabel: string,
	options: { runtimeAvailable: boolean; disabledReason: string; projectId?: string },
): ComposerContext => ({
	projectSelectorLabel,
	modeLabel: "Work locally",
	modelLabel: "5.5 High",
	runtimeAvailable: options.runtimeAvailable,
	disabledReason: options.disabledReason,
	projectId: options.projectId,
});

export const createChatShellRoute = (view: ProjectStateView): ChatShellRoute => {
	const selectedProject = view.selectedProject;

	if (!selectedProject) {
		return {
			kind: "global-start",
			title: "What should we work on?",
			composer: createComposerContext("Work in a project", {
				runtimeAvailable: false,
				disabledReason: "Select an available project to start a Pi session.",
			}),
			suggestions,
		};
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

	const composer = createComposerContext(projectSelectorLabel, {
		runtimeAvailable: true,
		disabledReason: "",
		projectId: selectedProject.id,
	});
	const selectedChat = view.selectedChat;

	if (!selectedChat) {
		return {
			kind: "project-start",
			title: `What should we build in ${selectedProject.displayName}?`,
			projectId: selectedProject.id,
			composer,
			suggestions,
		};
	}

	const transcript = getStaticTranscript(selectedChat.id);

	if (!transcript) {
		return {
			kind: "empty-chat",
			title: selectedChat.title,
			startTitle: `What should we build in ${selectedProject.displayName}?`,
			projectId: selectedProject.id,
			chatId: selectedChat.id,
			composer,
			suggestions,
		};
	}

	return {
		kind: "continued-chat",
		title: selectedChat.title,
		projectId: selectedProject.id,
		chatId: selectedChat.id,
		composer,
		transcript,
	};
};
