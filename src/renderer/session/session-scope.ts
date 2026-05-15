export type SessionScope = {
	projectId: string | null;
	chatId: string | null;
};

type PendingSessionScope = {
	projectId: string;
	chatId: string | null;
} | null;

export const isSessionScopeSelected = (scope: SessionScope, selection: SessionScope): boolean =>
	Boolean(scope.projectId) && scope.projectId === selection.projectId && scope.chatId === selection.chatId;

export const shouldAcceptSessionEvent = ({
	eventSessionId,
	acceptedSessionId,
	active,
	selection,
}: {
	eventSessionId: string;
	acceptedSessionId: string | null;
	pendingStart: PendingSessionScope;
	active: SessionScope;
	selection: SessionScope;
}): boolean => {
	if (!selection.projectId || !eventSessionId.startsWith(`${selection.projectId}:`)) {
		return false;
	}

	if (!isSessionScopeSelected(active, selection)) {
		return false;
	}

	if (eventSessionId === acceptedSessionId) {
		return true;
	}

	return false;
};
