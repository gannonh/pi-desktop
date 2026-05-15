import type { PiSessionEvent, PiSessionStatus } from "../../shared/pi-session";

export type LiveSessionMessage = {
	id: string;
	role: "user" | "assistant" | "tool" | "system";
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

const upsertMessage = (messages: readonly LiveSessionMessage[], next: LiveSessionMessage): LiveSessionMessage[] => {
	const index = messages.findIndex((message) => message.id === next.id);
	if (index === -1) {
		return [...messages, next];
	}

	return messages.map((message, messageIndex) => (messageIndex === index ? next : message));
};

export const reduceSessionEvent = (state: LiveSessionState, event: PiSessionEvent): LiveSessionState => {
	if (event.type === "status") {
		return {
			...state,
			sessionId: event.sessionId,
			status: event.status,
			statusLabel: event.label,
			errorMessage: event.status === "failed" ? state.errorMessage : "",
		};
	}

	if (event.type === "message_start") {
		return {
			...state,
			sessionId: event.sessionId,
			messages: upsertMessage(state.messages, {
				id: event.messageId,
				role: event.role,
				content: event.content,
				streaming: event.role === "assistant",
			}),
		};
	}

	if (event.type === "assistant_delta") {
		return {
			...state,
			sessionId: event.sessionId,
			messages: state.messages.map((message) =>
				message.id === event.messageId
					? { ...message, content: `${message.content}${event.delta}`, streaming: true }
					: message,
			),
		};
	}

	if (event.type === "message_end") {
		return {
			...state,
			sessionId: event.sessionId,
			messages: upsertMessage(state.messages, {
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
			errorMessage: event.message,
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
