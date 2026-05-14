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

const hasContent = (message: AgentMessage): message is AgentMessage & { content: unknown } => isRecord(message) && "content" in message;

const stringValue = (value: unknown): string | undefined => (typeof value === "string" && value.length > 0 ? value : undefined);

const timestampFor = (message: AgentMessage, fallbackIndex: number): number | string => {
	if (isRecord(message) && (typeof message.timestamp === "number" || typeof message.timestamp === "string")) {
		return message.timestamp;
	}
	return fallbackIndex;
};

const roleLabelForId = (message: AgentMessage): string => {
	if (isRecord(message)) {
		return stringValue(message.role) ?? "message";
	}
	return "message";
};

const messageIdFor = (message: AgentMessage, fallbackIndex = 0): string => {
	const role = roleLabelForId(message);

	if (role === "assistant" && isRecord(message)) {
		const responseId = stringValue(message.responseId);
		if (responseId) {
			return `assistant:${responseId}`;
		}
	}

	if (role === "toolResult" && isRecord(message)) {
		const timestamp = timestampFor(message, fallbackIndex);
		const toolCallId = stringValue(message.toolCallId);
		if (toolCallId) {
			return `toolResult:${toolCallId}:${timestamp}`;
		}
	}

	return `${role}:${timestampFor(message, fallbackIndex)}`;
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
		.replace(/\bauthorization\s*:\s*(?:bearer|basic)?\s*\S+/gi, "")
		.replace(/\bapi[_-]?key\s*[:=]\s*\S+/gi, "")
		.replace(/\btoken\s*[:=]\s*\S+/gi, "")
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
		return [{ type: "status", sessionId, status: "idle", label: "Idle", receivedAt }];
	}

	if (event.type === "message_start") {
		return [
			{
				type: "message_start",
				sessionId,
				messageId: messageIdFor(event.message),
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
				messageId: messageIdFor(event.message),
				delta: event.assistantMessageEvent.delta,
				receivedAt,
			},
		];
	}

	if (event.type === "message_end") {
		return [
			{
				type: "message_end",
				sessionId,
				messageId: messageIdFor(event.message),
				role: roleFor(event.message.role),
				content: contentFor(event.message),
				receivedAt,
			},
		];
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
