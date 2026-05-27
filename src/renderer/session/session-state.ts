import type {
	PiSessionEvent,
	PiSessionHistoryPayload,
	PiSessionMessageRole,
	PiSessionQueuedMessage,
	PiSessionSettingsPayload,
	PiSessionStatus,
	PiSessionToolExecutionStatus,
} from "../../shared/pi-session";

export type LiveSessionMessage = {
	id: string;
	role: PiSessionMessageRole;
	content: string;
	streaming: boolean;
};

export type LiveToolExecution = {
	id: string;
	toolName: string;
	status: PiSessionToolExecutionStatus;
	args: unknown;
	partialResult: unknown;
	result: unknown;
	isError: boolean;
	startedAt: string;
	updatedAt: string;
	endedAt: string | null;
};

export type LiveSessionState = {
	sessionId: string | null;
	status: PiSessionStatus;
	statusLabel: string;
	messages: LiveSessionMessage[];
	toolExecutions: LiveToolExecution[];
	errorMessage: string;
	retryMessage: string;
	settings: PiSessionSettingsPayload | null;
	queuedMessages: PiSessionQueuedMessage[];
};

export const createInitialSessionState = (): LiveSessionState => ({
	sessionId: null,
	status: "idle",
	statusLabel: "Idle",
	messages: [],
	toolExecutions: [],
	errorMessage: "",
	retryMessage: "",
	settings: null,
	queuedMessages: [],
});

const findMessage = (messages: readonly LiveSessionMessage[], messageId: string) =>
	messages.find((message) => message.id === messageId);

const finalizeMessage = (messages: readonly LiveSessionMessage[], next: LiveSessionMessage): LiveSessionMessage[] =>
	findMessage(messages, next.id)
		? messages.map((message) => (message.id === next.id ? next : message))
		: [...messages, next];

const findToolExecution = (toolExecutions: readonly LiveToolExecution[], toolCallId: string) =>
	toolExecutions.find((execution) => execution.id === toolCallId);

const upsertToolExecution = (
	toolExecutions: readonly LiveToolExecution[],
	next: LiveToolExecution,
): LiveToolExecution[] => {
	const existing = findToolExecution(toolExecutions, next.id);
	if (!existing) {
		return [...toolExecutions, next];
	}

	return toolExecutions.map((execution) => (execution.id === next.id ? next : execution));
};

const isTerminalToolStatus = (status: PiSessionToolExecutionStatus): boolean =>
	status === "completed" || status === "failed" || status === "canceled";

const markRunningToolsFailed = (
	toolExecutions: readonly LiveToolExecution[],
	receivedAt: string,
): LiveToolExecution[] =>
	toolExecutions.map((execution) =>
		execution.status === "running"
			? {
					...execution,
					status: "failed",
					isError: true,
					updatedAt: receivedAt,
					endedAt: receivedAt,
				}
			: execution,
	);

const markRunningToolsCanceled = (
	toolExecutions: readonly LiveToolExecution[],
	receivedAt: string,
): LiveToolExecution[] =>
	toolExecutions.map((execution) =>
		execution.status === "running"
			? {
					...execution,
					status: "canceled",
					isError: false,
					updatedAt: receivedAt,
					endedAt: receivedAt,
				}
			: execution,
	);

export const applySessionHistoryResult = (
	result: PiSessionHistoryPayload,
	settings: PiSessionSettingsPayload | null = null,
): LiveSessionState => ({
	sessionId: result.sessionId,
	status: result.status,
	statusLabel: result.statusLabel,
	messages: result.messages,
	toolExecutions: [],
	errorMessage: "",
	retryMessage: "",
	settings,
	queuedMessages: [],
});

export const applySessionStartResult = (
	state: LiveSessionState,
	result: { sessionId: string; status: PiSessionStatus; statusLabel: string },
): LiveSessionState => {
	if (state.sessionId === result.sessionId && state.status !== "starting") {
		return state;
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
		const toolExecutions =
			state.status === "aborting" && event.status === "idle"
				? markRunningToolsCanceled(state.toolExecutions, event.receivedAt)
				: state.toolExecutions;

		return {
			...state,
			sessionId: event.sessionId,
			status: event.status,
			statusLabel: event.label,
			toolExecutions,
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

	if (event.type === "tool_execution_start") {
		const existing = findToolExecution(state.toolExecutions, event.toolCallId);
		return {
			...state,
			sessionId: event.sessionId,
			toolExecutions: upsertToolExecution(state.toolExecutions, {
				id: event.toolCallId,
				toolName: event.toolName,
				status: "running",
				args: event.args,
				partialResult: existing?.partialResult ?? null,
				result: existing?.result ?? null,
				isError: false,
				startedAt: existing?.startedAt ?? event.receivedAt,
				updatedAt: event.receivedAt,
				endedAt: null,
			}),
		};
	}

	if (event.type === "tool_execution_update") {
		const existing = findToolExecution(state.toolExecutions, event.toolCallId);
		return {
			...state,
			sessionId: event.sessionId,
			toolExecutions: upsertToolExecution(state.toolExecutions, {
				id: event.toolCallId,
				toolName: event.toolName,
				status: existing && isTerminalToolStatus(existing.status) ? existing.status : "running",
				args: existing?.args ?? event.args,
				partialResult: event.partialResult,
				result: existing?.result ?? null,
				isError: existing?.isError ?? false,
				startedAt: existing?.startedAt ?? event.receivedAt,
				updatedAt: event.receivedAt,
				endedAt: existing?.endedAt ?? null,
			}),
		};
	}

	if (event.type === "tool_execution_end") {
		const existing = findToolExecution(state.toolExecutions, event.toolCallId);
		const terminalExisting = existing && isTerminalToolStatus(existing.status) ? existing : null;
		return {
			...state,
			sessionId: event.sessionId,
			toolExecutions: upsertToolExecution(state.toolExecutions, {
				id: event.toolCallId,
				toolName: event.toolName,
				status: terminalExisting?.status ?? (event.isError ? "failed" : "completed"),
				args: existing?.args ?? event.args ?? null,
				partialResult: existing?.partialResult ?? null,
				result: event.result,
				isError: terminalExisting?.isError ?? event.isError,
				startedAt: existing?.startedAt ?? event.receivedAt,
				updatedAt: event.receivedAt,
				endedAt: terminalExisting?.endedAt ?? event.receivedAt,
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
			toolExecutions: markRunningToolsFailed(state.toolExecutions, event.receivedAt),
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

	if (event.type === "session_settings") {
		return {
			...state,
			sessionId: event.sessionId ?? state.sessionId,
			settings: event.settings,
		};
	}

	if (event.type === "queue_update") {
		return {
			...state,
			sessionId: event.sessionId,
			queuedMessages: event.messages,
		};
	}

	return state;
};
