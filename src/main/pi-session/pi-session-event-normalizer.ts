import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import type { PiSessionEvent, PiSessionMessageRole } from "../../shared/pi-session";

type AgentMessage = Extract<AgentSessionEvent, { type: "message_start" }>["message"];

type NormalizeInput = {
	sessionId: string;
	event: AgentSessionEvent;
	now: () => string;
};

type RuntimeErrorInput = {
	sessionId?: string;
	code: string;
	error: unknown;
	now: () => string;
};

const textFromContent = (content: unknown): string => {
	if (typeof content === "string") {
		return content;
	}

	if (!Array.isArray(content)) {
		return "";
	}

	return content
		.map((part) => {
			if (part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part) {
				return typeof part.text === "string" ? part.text : "";
			}
			return "";
		})
		.join("");
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object";

const hasContent = (message: AgentMessage): message is AgentMessage & { content: unknown } =>
	isRecord(message) && "content" in message;

const stringValue = (value: unknown): string | undefined =>
	typeof value === "string" && value.length > 0 ? value : undefined;

const messageStableIdFor = (message: AgentMessage): number | string | undefined => {
	if (isRecord(message) && (typeof message.timestamp === "number" || typeof message.timestamp === "string")) {
		return message.timestamp;
	}
	return undefined;
};

const roleLabelForId = (message: AgentMessage): string => {
	if (isRecord(message)) {
		return stringValue(message.role) ?? "message";
	}
	return "message";
};

const messageIdFor = (message: AgentMessage): string | undefined => {
	const stableId = messageStableIdFor(message);
	// SDK stream messages carry timestamps; ignore malformed timestamp-less messages to avoid unstable renderer IDs.
	if (stableId === undefined) {
		return undefined;
	}

	const role = roleLabelForId(message);

	if (role === "toolResult" && isRecord(message)) {
		const toolCallId = stringValue(message.toolCallId);
		if (toolCallId) {
			return `toolResult:${toolCallId}:${stableId}`;
		}
	}

	return `${role}:${stableId}`;
};

const terminalAssistantErrorFor = (message: AgentMessage): string | undefined => {
	if (!isRecord(message) || message.role !== "assistant" || message.stopReason !== "error") {
		return undefined;
	}

	return stringValue(message.errorMessage);
};

const createMessageEndEvent = (
	sessionId: string,
	message: AgentMessage,
	receivedAt: string,
): PiSessionEvent | undefined => {
	const messageId = messageIdFor(message);
	if (!messageId) {
		return undefined;
	}

	const terminalError = terminalAssistantErrorFor(message);
	if (terminalError) {
		return {
			type: "runtime_error",
			sessionId,
			code: "pi.prompt_failed",
			message: sanitizeRuntimeErrorMessage(terminalError),
			receivedAt,
		};
	}

	return {
		type: "message_end",
		sessionId,
		messageId,
		role: roleFor(message.role),
		content: contentFor(message),
		receivedAt,
	};
};

const contentFor = (message: AgentMessage): string => {
	if (!hasContent(message)) {
		return "";
	}
	return textFromContent(message.content);
};

const roleFor = (role: unknown): PiSessionMessageRole => {
	if (role === "assistant" || role === "tool" || role === "system") {
		return role;
	}
	if (role === "toolResult") {
		return "tool";
	}
	return "user";
};

const stripSensitiveFragments = (line: string): string =>
	line
		.replace(/\b[A-Z][A-Z0-9_]*API_KEY\s*=\s*\S+/g, "")
		.replace(/\bauthorization\s*:\s*(?:bearer|basic)?\s*\S+/gi, "")
		.replace(/\b(?:api[_-]?key|token|key|authorization)\s*[:=]\s*(?:bearer|basic)?\s*\S+/gi, "")
		.replace(/\s+/g, " ")
		.trim();

const sanitizeMessage = (message: string, fallback: string): string => {
	const sanitized = message
		.split(/\r?\n/)
		.filter((line) => !/^\s*at\s+/.test(line))
		.map(stripSensitiveFragments)
		.filter((line) => line.length > 0)
		.join("\n")
		.trim();

	return sanitized.length > 0 ? sanitized : fallback;
};

const errorMessageFor = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const sanitizeRuntimeErrorMessage = (error: unknown): string =>
	sanitizeMessage(errorMessageFor(error), "Pi runtime error.");

export const createRuntimeErrorEvent = ({ sessionId, code, error, now }: RuntimeErrorInput): PiSessionEvent => ({
	type: "runtime_error",
	sessionId,
	code,
	message: sanitizeRuntimeErrorMessage(error),
	receivedAt: now(),
});

export const normalizePiSessionEvent = ({ sessionId, event, now }: NormalizeInput): PiSessionEvent[] => {
	const receivedAt = now();

	if (event.type === "agent_start") {
		return [{ type: "status", sessionId, status: "running", label: "Running", receivedAt }];
	}

	if (event.type === "agent_end") {
		return [
			{ type: "status", sessionId, status: "idle", label: "Idle", receivedAt },
			...event.messages.flatMap((message) => {
				const normalized = createMessageEndEvent(sessionId, message, receivedAt);
				return normalized ? [normalized] : [];
			}),
		];
	}

	if (event.type === "message_start") {
		const messageId = messageIdFor(event.message);
		if (!messageId) {
			return [];
		}

		return [
			{
				type: "message_start",
				sessionId,
				messageId,
				role: roleFor(event.message.role),
				content: contentFor(event.message),
				receivedAt,
			},
		];
	}

	if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
		const messageId = messageIdFor(event.message);
		if (!messageId) {
			return [];
		}

		return [
			{
				type: "assistant_delta",
				sessionId,
				messageId,
				delta: event.assistantMessageEvent.delta,
				receivedAt,
			},
		];
	}

	if (event.type === "message_end") {
		const normalized = createMessageEndEvent(sessionId, event.message, receivedAt);
		return normalized ? [normalized] : [];
	}

	if (event.type === "auto_retry_start") {
		return [
			{ type: "status", sessionId, status: "retrying", label: "Retrying", receivedAt },
			{
				type: "retry",
				sessionId,
				attempt: event.attempt,
				maxAttempts: event.maxAttempts,
				delayMs: event.delayMs,
				message: sanitizeMessage(event.errorMessage, "Retry requested."),
				receivedAt,
			},
		];
	}

	if (event.type === "auto_retry_end") {
		const statusEvent: PiSessionEvent = {
			type: "status",
			sessionId,
			status: event.success ? "running" : "failed",
			label: event.success ? "Running" : "Failed",
			receivedAt,
		};

		if (event.success) {
			return [statusEvent];
		}

		return [
			statusEvent,
			{
				type: "runtime_error",
				sessionId,
				code: "pi.retry_failed",
				message: sanitizeMessage(event.finalError ?? "", "Retry failed."),
				receivedAt,
			},
		];
	}

	return [];
};
