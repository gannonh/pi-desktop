import type { PiSessionSettingsPayload, PiSessionThinkingLevel } from "../../shared/pi-session";
import type { ProjectStateView } from "../../shared/project-state";
import type { LiveSessionState } from "../session/session-state";
type ComposerRouteInput =
	| { kind: "global-start" }
	| { kind: "project-start"; projectId: string }
	| { kind: "standalone-start"; chatId: string }
	| { kind: "empty-chat"; projectId: string; chatId: string; resumeLabel: "Start session" | "Resume session" };

export type ComposerProjectOption = {
	projectId: string;
	label: string;
};

export type ComposerModelOption = {
	provider: string;
	id: string;
	label: string;
};

export type ComposerThinkingOption = {
	level: PiSessionThinkingLevel;
	label: string;
};

export interface ComposerContext {
	projectSelectorLabel: string;
	modeLabel: "Work locally";
	branchLabel?: string;
	modelLabel: string;
	thinkingLabel: string;
	runtimeAvailable: boolean;
	disabledReason: string;
	projectId?: string;
	showProjectMenu: boolean;
	projectOptions: ComposerProjectOption[];
	modelOptions: ComposerModelOption[];
	thinkingOptions: ComposerThinkingOption[];
}

const formatThinkingLabel = (level: PiSessionThinkingLevel): string =>
	level === "off" ? "Off" : level.charAt(0).toUpperCase() + level.slice(1);

const isAuthBlockedMessage = (message: string): boolean =>
	/No API key/i.test(message) || /Authentication failed/i.test(message) || /No model selected/i.test(message);

export const mapComposerBlockedReason = (input: {
	projectState: ProjectStateView;
	session: LiveSessionState;
	routeKind: ComposerRouteInput["kind"];
}): string => {
	if (input.routeKind === "global-start" && !input.projectState.selectedProjectId) {
		return "Select an available project to start a Pi session.";
	}
	if (input.session.errorMessage && isAuthBlockedMessage(input.session.errorMessage)) {
		return input.session.errorMessage;
	}
	return "";
};

const isFirstMessageComposerRoute = (route: ComposerRouteInput): boolean =>
	route.kind === "global-start" ||
	route.kind === "project-start" ||
	route.kind === "standalone-start" ||
	(route.kind === "empty-chat" && route.resumeLabel === "Start session");

export const buildComposerContext = (
	route: ComposerRouteInput,
	projectState: ProjectStateView,
	session: LiveSessionState,
	settings: PiSessionSettingsPayload | null,
): ComposerContext => {
	const showProjectMenu = isFirstMessageComposerRoute(route);
	const projectOptions = projectState.projects
		.filter((project) => project.availability.status === "available")
		.map((project) => ({
			projectId: project.id,
			label: project.displayName,
		}));
	const effectiveSettings = settings ?? session.settings;
	const modelLabel = effectiveSettings?.modelLabel ?? "No model";
	const thinkingLevel = effectiveSettings?.thinkingLevel ?? "off";
	const thinkingLabel = formatThinkingLabel(thinkingLevel);
	const modelOptions =
		effectiveSettings?.availableModels.map((model) => ({
			provider: model.provider,
			id: model.id,
			label: model.label,
		})) ?? [];
	const thinkingOptions =
		effectiveSettings?.availableThinkingLevels.map((level) => ({
			level,
			label: formatThinkingLabel(level),
		})) ?? [];
	const runtimeAvailable = route.kind !== "global-start" || Boolean(projectState.selectedProjectId);
	const disabledReason = runtimeAvailable
		? mapComposerBlockedReason({ projectState, session, routeKind: route.kind })
		: "Select an available project to start a Pi session.";

	let projectSelectorLabel = "Work in a project";
	if (route.kind === "global-start") {
		projectSelectorLabel = projectState.selectedProject?.displayName ?? "Work in a project";
	} else if (route.kind === "standalone-start") {
		projectSelectorLabel = projectState.selectedChat?.cwd ?? "Work in a project";
	} else if (route.kind === "project-start" || route.kind === "empty-chat") {
		projectSelectorLabel = projectState.selectedProject?.displayName ?? "Work in a project";
	}

	return {
		projectSelectorLabel,
		modeLabel: "Work locally",
		modelLabel,
		thinkingLabel,
		runtimeAvailable,
		disabledReason,
		projectId: projectState.selectedProjectId ?? undefined,
		showProjectMenu,
		projectOptions,
		modelOptions,
		thinkingOptions,
	};
};

export const formatQueuedMessageDeliveryLabel = (delivery: "steer" | "followUp"): string =>
	delivery === "steer" ? "Steering" : "Follow-up";

export const formatQueuedMessageSwitchLabel = (delivery: "steer" | "followUp"): string =>
	delivery === "steer" ? "Switch to follow-up" : "Switch to steering";

export const formatQueueStatusLabel = (messages: LiveSessionState["queuedMessages"]): string => {
	const steeringCount = messages.filter((message) => message.delivery === "steer").length;
	const followUpCount = messages.filter((message) => message.delivery === "followUp").length;
	if (steeringCount > 0 && followUpCount === 0) {
		return steeringCount === 1 ? "1 steering queued" : `${steeringCount} steering queued`;
	}
	if (followUpCount > 0 && steeringCount === 0) {
		return followUpCount === 1 ? "1 follow-up queued" : `${followUpCount} follow-up queued`;
	}
	if (messages.length > 0) {
		return messages.length === 1 ? "1 queued" : `${messages.length} queued`;
	}
	return "";
};
