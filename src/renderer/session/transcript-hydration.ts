export type TranscriptHydrationScope = {
	projectId: string | null;
	chatId: string | null;
};

export type TranscriptHydrationStatus = "idle" | "loading" | "loaded" | "error";

export type TranscriptHydrationState = {
	scope: TranscriptHydrationScope;
	status: TranscriptHydrationStatus;
	errorMessage: string;
};

export const createIdleTranscriptHydration = (): TranscriptHydrationState => ({
	scope: { projectId: null, chatId: null },
	status: "idle",
	errorMessage: "",
});

export const isTranscriptHydrationForScope = (
	hydration: TranscriptHydrationState,
	scope: TranscriptHydrationScope,
): boolean => hydration.scope.projectId === scope.projectId && hydration.scope.chatId === scope.chatId;

export const createLoadingTranscriptHydration = (scope: TranscriptHydrationScope): TranscriptHydrationState => ({
	scope,
	status: "loading",
	errorMessage: "",
});

export const createLoadedTranscriptHydration = (scope: TranscriptHydrationScope): TranscriptHydrationState => ({
	scope,
	status: "loaded",
	errorMessage: "",
});

export const createErrorTranscriptHydration = (
	scope: TranscriptHydrationScope,
	errorMessage: string,
): TranscriptHydrationState => ({
	scope,
	status: "error",
	errorMessage,
});
