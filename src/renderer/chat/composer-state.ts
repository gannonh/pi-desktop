export interface ComposerStateInput {
	text: string;
	runtimeAvailable: boolean;
}

export interface ComposerState {
	sendDisabled: boolean;
}

export const createComposerState = ({ text, runtimeAvailable }: ComposerStateInput): ComposerState => {
	const hasText = text.trim().length > 0;

	return {
		sendDisabled: !hasText || !runtimeAvailable,
	};
};
