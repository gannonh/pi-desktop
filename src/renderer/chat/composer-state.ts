export interface ComposerStateInput {
	text: string;
	runtimeAvailable: boolean;
	disabledReason: string;
	running?: boolean;
}

export interface ComposerState {
	sendDisabled: boolean;
	showSendWhileRunning: boolean;
	statusLabel: string;
}

export const createComposerState = ({
	text,
	runtimeAvailable,
	disabledReason,
	running = false,
}: ComposerStateInput): ComposerState => {
	const hasText = text.trim().length > 0;
	const blockedByRuntime = !runtimeAvailable;

	return {
		sendDisabled: blockedByRuntime || (!running && !hasText),
		showSendWhileRunning: running && hasText && !blockedByRuntime,
		statusLabel: blockedByRuntime ? disabledReason : disabledReason,
	};
};
