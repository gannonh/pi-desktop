import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import type { PiSessionEvent } from "../../shared/pi-session";

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

const messageIdFor = (message: { role?: string; timestamp?: unknown }, fallbackIndex = 0): string => {
	const timestamp = typeof message.timestamp === "number" || typeof message.timestamp === "string" ? message.timestamp : fallbackIndex;
	return `${message.role ?? "message"}:${timestamp}`;
};

const roleFor = (role: unknown): PiSessionEvent extends infer Event ? Extract<Event, { type: "message_start" }>["role"] : never => {
	if (role === "assistant" || role === "tool" || role === "system") {
		return role;
	}
	return "user";
};

export const createRuntimeErrorEvent = ({ sessionId, code, error, now }: RuntimeErrorInput): PiSessionEvent => ({
	type: "runtime_error",
	sessionId,
	code,
	message: error instanceof Error ? error.message : String(error),
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
				content: textFromContent(event.message.content),
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
				content: textFromContent(event.message.content),
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
				message: event.errorMessage,
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
