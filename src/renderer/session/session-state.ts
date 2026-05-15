import type { PiSessionEvent, PiSessionMessageRole, PiSessionStatus } from "../../shared/pi-session";

export type LiveSessionMessage = {
	id: string;
	role: PiSessionMessageRole;
	content: string;
	streaming: boolean;
};

export type LiveSessionState = {
	sessionId: string | null;
	status: PiSessionStatus;
	statusLabel: string;
	messages: LiveSessionMessage[];
	errorMessage: string;
	retryMessage: string;
};

export const createInitialSessionState = (): LiveSessionState => ({
	sessionId: null,
	status: "idle",
	statusLabel: "Idle",
	messages: [],
	errorMessage: "",
	retryMessage: "",
});

const findMessage = (messages: readonly LiveSessionMessage[], messageId: string) =>
	messages.find((message) => message.id === messageId);

const finalizeMessage = (messages: readonly LiveSessionMessage[], next: LiveSessionMessage): LiveSessionMessage[] =>
	findMessage(messages, next.id)
		? messages.map((message) => (message.id === next.id ? next : message))
		: [...messages, next];

export const applySessionStartResult = (
	state: LiveSessionState,
	result: { sessionId: string; status: PiSessionStatus; statusLabel: string },
): LiveSessionState => {
	if (state.sessionId === result.sessionId && state.status !== "starting") {
		return { ...state, sessionId: result.sessionId };
	}

	return {
		...state,
		sessionId: result.sessionId,
		status: result.status,
		statusLabel: result.statusLabel,
	};
};

export const reduceSessionEvent = (state: LiveSessionState, event: PiSessionEvent): LiveSessionState => {
	if (state.sessionId && event.sessionId && event.sessionId !== state.sessionId) {
		return state;
	}

	if (event.type === "status") {
		return {
			...state,
			sessionId: event.sessionId,
			status: event.status,
			statusLabel: event.label,
			errorMessage: event.status === "failed" ? state.errorMessage : "",
			retryMessage: event.status === "retrying" ? state.retryMessage : "",
		};
	}

	if (event.type === "message_start") {
		if (findMessage(state.messages, event.messageId)) {
			return state;
		}

		return {
			...state,
			sessionId: event.sessionId,
			messages: [
				...state.messages,
				{
					id: event.messageId,
					role: event.role,
					content: event.content,
					streaming: event.role === "assistant",
				},
			],
		};
	}

	if (event.type === "assistant_delta") {
		const message = findMessage(state.messages, event.messageId);
		if (!message?.streaming) {
			return state;
		}

		return {
			...state,
			sessionId: event.sessionId,
			messages: state.messages.map((message) =>
				message.id === event.messageId ? { ...message, content: `${message.content}${event.delta}` } : message,
			),
		};
	}

	if (event.type === "message_end") {
		return {
			...state,
			sessionId: event.sessionId,
			messages: finalizeMessage(state.messages, {
				id: event.messageId,
				role: event.role,
				content: event.content,
				streaming: false,
			}),
		};
	}

	if (event.type === "runtime_error") {
		return {
			...state,
			sessionId: event.sessionId ?? state.sessionId,
			status: "failed",
			statusLabel: "Failed",
			messages: state.messages.map((message) => ({ ...message, streaming: false })),
			errorMessage: event.message,
			retryMessage: "",
		};
	}

	if (event.type === "retry") {
		const max = event.maxAttempts ? ` of ${event.maxAttempts}` : "";
		return {
			...state,
			sessionId: event.sessionId,
			status: "retrying",
			statusLabel: "Retrying",
			retryMessage: `Retry ${event.attempt}${max}: ${event.message}`,
		};
	}

	return state;
};
