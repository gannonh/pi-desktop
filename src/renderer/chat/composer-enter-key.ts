export type ComposerEnterAction = "newline" | "followUp" | "submit" | "none";

export interface ComposerEnterKeyInput {
	key: string;
	shiftKey: boolean;
	altKey: boolean;
	running: boolean;
	showSendWhileRunning: boolean;
	sendDisabled: boolean;
}

export function resolveComposerEnterAction({
	key,
	shiftKey,
	altKey,
	running,
	showSendWhileRunning,
	sendDisabled,
}: ComposerEnterKeyInput): ComposerEnterAction {
	if (key !== "Enter") {
		return "none";
	}
	if (shiftKey) {
		return "newline";
	}
	if (altKey && running) {
		return "followUp";
	}
	if (showSendWhileRunning && !sendDisabled) {
		return "submit";
	}
	if (!running && !sendDisabled) {
		return "submit";
	}
	return "none";
}
