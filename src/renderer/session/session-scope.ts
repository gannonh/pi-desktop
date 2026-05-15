import type { PiSessionEvent } from "../../shared/pi-session";

export type SessionScope = {
	projectId: string | null;
	chatId: string | null;
};

type PendingSessionScope = {
	projectId: string;
	chatId: string | null;
} | null;

type SessionEventWithSessionId = PiSessionEvent & { sessionId: string };

type PendingSessionEventBuffer = Map<string, SessionEventWithSessionId[]>;

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
	active: SessionScope;
	selection: SessionScope;
}): boolean => {
	if (!selection.projectId || !eventSessionId.startsWith(`${selection.projectId}:`)) {
		return false;
	}

	if (!isSessionScopeSelected(active, selection)) {
		return false;
	}

	return eventSessionId === acceptedSessionId;
};

export const shouldBufferPendingStartEvent = ({
	acceptedSessionId,
	pendingStart,
	active,
	selection,
}: {
	acceptedSessionId: string | null;
	pendingStart: PendingSessionScope;
	active: SessionScope;
	selection: SessionScope;
}): boolean => {
	if (acceptedSessionId !== null || !pendingStart) {
		return false;
	}

	return isSessionScopeSelected(active, selection) && isSessionScopeSelected(pendingStart, selection);
};

export const createPendingSessionEventBuffer = (): PendingSessionEventBuffer => new Map();

export const bufferPendingSessionEvent = (buffer: PendingSessionEventBuffer, event: SessionEventWithSessionId): void => {
	const events = buffer.get(event.sessionId);
	if (events) {
		events.push(event);
		return;
	}

	buffer.set(event.sessionId, [event]);
};

export const takeBufferedSessionEvents = (
	buffer: PendingSessionEventBuffer,
	sessionId: string,
): SessionEventWithSessionId[] => {
	const events = buffer.get(sessionId) ?? [];
	buffer.clear();
	return events;
};
