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

const fallbackIdFor = (message: AgentMessage, fallbackIndex: number): number | string => {
	if (!isRecord(message)) {
		return fallbackIndex;
	}

	const parts: string[] = [];
	const customType = stringValue(message.customType);
	if (customType) {
		parts.push(`customType=${customType}`);
	}

	const toolCallId = stringValue(message.toolCallId);
	if (toolCallId) {
		parts.push(`toolCallId=${toolCallId}`);
	}

	const content = hasContent(message) ? textFromContent(message.content) : "";
	if (content.length > 0) {
		parts.push(`content=${content}`);
	}

	if (parts.length > 0) {
		return `${parts.join(":")}:${fallbackIndex}`;
	}

	return fallbackIndex;
};

const messageStableIdFor = (message: AgentMessage, fallbackIndex: number): number | string => {
	if (isRecord(message) && (typeof message.timestamp === "number" || typeof message.timestamp === "string")) {
		return message.timestamp;
	}
	return fallbackIdFor(message, fallbackIndex);
};

const roleLabelForId = (message: AgentMessage): string => {
	if (isRecord(message)) {
		return stringValue(message.role) ?? "message";
	}
	return "message";
};

const messageIdFor = (message: AgentMessage, fallbackIndex = 0): string => {
	const role = roleLabelForId(message);

	if (role === "toolResult" && isRecord(message)) {
		const timestamp = messageStableIdFor(message, fallbackIndex);
		const toolCallId = stringValue(message.toolCallId);
		if (toolCallId) {
			return `toolResult:${toolCallId}:${timestamp}`;
		}
	}

	return `${role}:${messageStableIdFor(message, fallbackIndex)}`;
};

const createMessageEndEvent = (
	sessionId: string,
	message: AgentMessage,
	receivedAt: string,
	fallbackIndex: number,
): PiSessionEvent => ({
	type: "message_end",
	sessionId,
	messageId: messageIdFor(message, fallbackIndex),
	role: roleFor(message.role),
	content: contentFor(message),
	receivedAt,
});

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

export const createRuntimeErrorEvent = ({ sessionId, code, error, now }: RuntimeErrorInput): PiSessionEvent => ({
	type: "runtime_error",
	sessionId,
	code,
	message: sanitizeMessage(errorMessageFor(error), "Pi runtime error."),
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
			...event.messages.map((message, index) => createMessageEndEvent(sessionId, message, receivedAt, index)),
		];
	}

	if (event.type === "message_start") {
		return [
			{
				type: "message_start",
				sessionId,
				messageId: messageIdFor(event.message, 0),
				role: roleFor(event.message.role),
				content: contentFor(event.message),
				receivedAt,
			},
		];
	}

	if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
		return [
			{
				type: "assistant_delta",
				sessionId,
				messageId: messageIdFor(event.message, 0),
				delta: event.assistantMessageEvent.delta,
				receivedAt,
			},
		];
	}

	if (event.type === "message_end") {
		return [createMessageEndEvent(sessionId, event.message, receivedAt, 0)];
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
		return [
			{
				type: "status",
				sessionId,
				status: event.success ? "running" : "failed",
				label: event.success ? "Running" : "Failed",
				receivedAt,
			},
		];
	}

	return [];
};
