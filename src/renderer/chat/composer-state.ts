export interface ComposerStateInput {
	text: string;
	runtimeAvailable: boolean;
	disabledReason: string;
}

export interface ComposerState {
	sendDisabled: boolean;
	statusLabel: string;
}

export const createComposerState = ({ text, runtimeAvailable, disabledReason }: ComposerStateInput): ComposerState => {
	const hasText = text.trim().length > 0;

	return {
		sendDisabled: !hasText || !runtimeAvailable,
		statusLabel: runtimeAvailable ? "" : disabledReason,
	};
};
