export interface ComposerStateInput {
	text: string;
	attachmentCount?: number;
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
	attachmentCount = 0,
	runtimeAvailable,
	disabledReason,
	running = false,
}: ComposerStateInput): ComposerState => {
	const hasText = text.trim().length > 0;
	const hasAttachments = attachmentCount > 0;
	const hasContent = hasText || hasAttachments;
	const blockedByRuntime = !runtimeAvailable;

	return {
		sendDisabled: blockedByRuntime || !hasContent,
		showSendWhileRunning: running && hasContent && !blockedByRuntime,
		statusLabel: blockedByRuntime ? disabledReason : disabledReason,
	};
};
