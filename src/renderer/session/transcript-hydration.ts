export type TranscriptHydrationScope = {
	projectId: string | null;
	chatId: string | null;
};

export type TranscriptHydrationStatus = "idle" | "loading" | "loaded" | "error";

export type TranscriptHydrationState =
	| { status: "idle"; scope: { projectId: null; chatId: null } }
	| { status: "loading"; scope: TranscriptHydrationScope }
	| { status: "loaded"; scope: TranscriptHydrationScope }
	| { status: "error"; scope: TranscriptHydrationScope; errorMessage: string };

export const createIdleTranscriptHydration = (): TranscriptHydrationState => ({
	scope: { projectId: null, chatId: null },
	status: "idle",
});

export const isTranscriptHydrationForScope = (
	hydration: TranscriptHydrationState,
	scope: TranscriptHydrationScope,
): boolean => hydration.scope.projectId === scope.projectId && hydration.scope.chatId === scope.chatId;

export const createLoadingTranscriptHydration = (scope: TranscriptHydrationScope): TranscriptHydrationState => ({
	scope,
	status: "loading",
});

export const createLoadedTranscriptHydration = (scope: TranscriptHydrationScope): TranscriptHydrationState => ({
	scope,
	status: "loaded",
});

export const createErrorTranscriptHydration = (
	scope: TranscriptHydrationScope,
	errorMessage: string,
): TranscriptHydrationState => ({
	scope,
	status: "error",
	errorMessage,
});
