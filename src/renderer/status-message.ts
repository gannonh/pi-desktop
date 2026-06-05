export type StatusMessageTone = "error" | "info" | "success";

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
	statusMessage.tone === "success" ? 4000 : null;

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
