import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import type { PiSessionHistoryPayload } from "../../shared/pi-session";
import type { LoadPiSessionHistoryInput } from "./pi-session-history";
import type { PiSdkSession } from "./pi-session-runtime";

const assistantContent = "I can see this project. Pi session streaming is connected.";

const smokeHistoryAssistantContent = `# Project overview

\`\`\`ts
const connected = true;
\`\`\`

I can see this project. Pi session streaming is connected.`;

export const loadSmokePiSessionHistory = (_input: LoadPiSessionHistoryInput): PiSessionHistoryPayload => ({
	sessionId: "smoke-session",
	status: "idle",
	statusLabel: "Idle",
	messages: [
		{
			id: "user:smoke-1",
			role: "user",
			content: "What files are here?",
			streaming: false,
		},
		{
			id: "assistant:smoke-1",
			role: "assistant",
			content: smokeHistoryAssistantContent,
			streaming: false,
		},
	],
});

export const createSmokePiAgentSession = async (): Promise<{ session: PiSdkSession }> => {
	const listeners = new Set<(event: AgentSessionEvent) => void>();
	let pendingPrompt: ReturnType<typeof setTimeout> | null = null;
	let pendingPromptResolve: (() => void) | null = null;
	let nextMessageTimestamp = 1;
	let streaming = false;
	const steeringMessages: string[] = [];
	const followUpMessages: string[] = [];

	const emit = (event: AgentSessionEvent) => {
		for (const listener of listeners) {
			listener(event);
		}
	};

	const emitQueueUpdate = () => {
		emit({
			type: "queue_update",
			steering: [...steeringMessages],
			followUp: [...followUpMessages],
		});
	};

	const clearPendingPrompt = () => {
		if (pendingPrompt) {
			clearTimeout(pendingPrompt);
			pendingPrompt = null;
		}
		pendingPromptResolve?.();
		pendingPromptResolve = null;
		streaming = false;
	};

	const streamDelayMs = Number(process.env.PI_DESKTOP_SMOKE_STREAM_DELAY_MS ?? "0");

	const runPrompt = (prompt: string, resolve: () => void) => {
		pendingPrompt = setTimeout(() => {
			pendingPrompt = null;
			pendingPromptResolve = null;
			const userTimestamp = nextMessageTimestamp;
			const assistantTimestamp = nextMessageTimestamp + 1;
			nextMessageTimestamp += 2;
			const userMessage = {
				role: "user",
				content: [{ type: "text", text: prompt }],
				timestamp: userTimestamp,
			};
			const assistantMessage = {
				role: "assistant",
				content: [{ type: "text", text: assistantContent }],
				timestamp: assistantTimestamp,
			};
			const assistantStart = {
				...assistantMessage,
				content: [],
			};

			emit({ type: "agent_start" });
			emit({ type: "message_start", message: userMessage } as AgentSessionEvent);
			emit({ type: "message_start", message: assistantStart } as AgentSessionEvent);
			emit({
				type: "message_update",
				message: assistantStart,
				assistantMessageEvent: {
					type: "text_delta",
					contentIndex: 0,
					delta: "I can see this project. ",
					partial: assistantStart,
				},
			} as unknown as AgentSessionEvent);
			emit({
				type: "message_update",
				message: assistantStart,
				assistantMessageEvent: {
					type: "text_delta",
					contentIndex: 0,
					delta: "Pi session streaming is connected.",
					partial: assistantMessage,
				},
			} as unknown as AgentSessionEvent);
			emit({ type: "message_end", message: assistantMessage } as AgentSessionEvent);
			emit({ type: "agent_end", messages: [] });
			streaming = false;
			resolve();
		}, streamDelayMs);
	};

	const session: PiSdkSession = {
		sessionId: "smoke-session",
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		bindExtensions: async () => {},
		isStreaming: () => streaming,
		getSteeringMessages: () => [...steeringMessages],
		getFollowUpMessages: () => [...followUpMessages],
		clearQueue: () => {
			const steering = [...steeringMessages];
			const followUp = [...followUpMessages];
			steeringMessages.length = 0;
			followUpMessages.length = 0;
			emitQueueUpdate();
			return { steering, followUp };
		},
		prompt: (prompt, options?: { streamingBehavior?: "steer" | "followUp"; images?: unknown[] }) =>
			new Promise((resolve) => {
				if (streaming && options?.streamingBehavior) {
					if (options.streamingBehavior === "followUp") {
						followUpMessages.push(prompt);
					} else {
						steeringMessages.push(prompt);
					}
					emitQueueUpdate();
					resolve();
					return;
				}

				clearPendingPrompt();
				streaming = true;
				pendingPromptResolve = resolve;
				runPrompt(prompt, resolve);
			}),
		abort: async () => {
			clearPendingPrompt();
			steeringMessages.length = 0;
			followUpMessages.length = 0;
			emitQueueUpdate();
		},
		dispose: () => {
			clearPendingPrompt();
			steeringMessages.length = 0;
			followUpMessages.length = 0;
			listeners.clear();
		},
	};

	return { session };
};
