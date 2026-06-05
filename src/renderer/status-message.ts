export type StatusMessageTone = "error" | "info" | "pending" | "success";

export type StatusMessageScope = {
	projectId: string | null;
	chatId: string | null;
};

export type StatusMessage = {
	source: "project" | "startup" | "output";
	tone: StatusMessageTone;
	message: string;
	scope?: StatusMessageScope;
};

export const getStatusMessageClassName = (statusMessage: StatusMessage): string =>
	["project-main__status-message", `project-main__status-message--${statusMessage.tone}`].join(" ");

export const getStatusMessageAutoDismissMs = (statusMessage: StatusMessage): number | null =>
	statusMessage.tone === "success" ? 10000 : null;

export const retainStatusMessageAfterProjectStateResult = (
	statusMessage: StatusMessage | undefined,
): StatusMessage | undefined => {
	if (statusMessage?.source === "project" && statusMessage.tone !== "pending") {
		return undefined;
	}

	return statusMessage;
};

export const retainStatusMessageForSelection = (
	statusMessage: StatusMessage | undefined,
	selection: StatusMessageScope,
): StatusMessage | undefined => {
	if (!statusMessage?.scope) {
		return statusMessage;
	}

	return statusMessage.scope.projectId === selection.projectId && statusMessage.scope.chatId === selection.chatId
		? statusMessage
		: undefined;
};
