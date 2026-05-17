import type { PiSessionEvent } from "../../shared/pi-session";
import type { ProjectStateView } from "../../shared/project-state";

export type SessionScope = {
	projectId: string | null;
	chatId: string | null;
};

type PendingSessionScope = {
	projectId: string | null;
	chatId: string | null;
} | null;

type SessionEventWithSessionId = PiSessionEvent & { sessionId: string };

type PendingSessionEventBuffer = Map<string, SessionEventWithSessionId[]>;

type PromptSessionStartSelection =
	| {
			ok: true;
			projectId: string | null;
			chatId: string | null;
	  }
	| {
			ok: false;
			errorMessage: string;
	  };

export const resolvePromptSessionStartSelection = (projectState: ProjectStateView): PromptSessionStartSelection => {
	const selectedProject = projectState.selectedProject;
	const selectedChat = projectState.selectedChat;
	const selectedProjectIsAvailable = selectedProject?.availability.status === "available";
	const selectedStandaloneChatHasSession = selectedProject === null && Boolean(selectedChat?.sessionPath);

	if (!selectedProjectIsAvailable && !selectedStandaloneChatHasSession) {
		return {
			ok: false,
			errorMessage: "Select an available project or existing standalone chat to start a Pi session.",
		};
	}

	return {
		ok: true,
		projectId: selectedProject?.id ?? null,
		chatId: selectedChat?.id ?? null,
	};
};

export const isSessionScopeSelected = (scope: SessionScope, selection: SessionScope): boolean =>
	(scope.projectId !== null || scope.chatId !== null) &&
	scope.projectId === selection.projectId &&
	scope.chatId === selection.chatId;

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
	if (!isSessionScopeSelected(active, selection)) {
		return false;
	}

	return acceptedSessionId !== null && eventSessionId === acceptedSessionId;
};

export const shouldBufferPendingStartEvent = ({
	eventSessionId,
	acceptedSessionId,
	pendingStart,
	selection,
}: {
	eventSessionId: string;
	acceptedSessionId: string | null;
	pendingStart: PendingSessionScope;
	selection: SessionScope;
}): boolean => {
	if (acceptedSessionId !== null || !pendingStart) {
		return false;
	}

	if (!isSessionScopeSelected(pendingStart, selection)) {
		return false;
	}

	const sessionIdPrefix = pendingStart.projectId === null ? "standalone:" : `${pendingStart.projectId}:`;
	return eventSessionId.startsWith(sessionIdPrefix);
};

export const createPendingSessionEventBuffer = (): PendingSessionEventBuffer => new Map();

export const bufferPendingSessionEvent = (
	buffer: PendingSessionEventBuffer,
	event: SessionEventWithSessionId,
): void => {
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
	if (events.length > 0) {
		buffer.clear();
	}
	return events;
};
