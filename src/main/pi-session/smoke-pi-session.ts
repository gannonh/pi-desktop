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

	const emit = (event: AgentSessionEvent) => {
		for (const listener of listeners) {
			listener(event);
		}
	};

	const clearPendingPrompt = () => {
		if (pendingPrompt) {
			clearTimeout(pendingPrompt);
			pendingPrompt = null;
		}
		pendingPromptResolve?.();
		pendingPromptResolve = null;
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
		prompt: (prompt) =>
			new Promise((resolve) => {
				clearPendingPrompt();
				pendingPromptResolve = resolve;
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
					resolve();
				}, 0);
			}),
		abort: async () => {
			clearPendingPrompt();
		},
		dispose: () => {
			clearPendingPrompt();
			listeners.clear();
		},
	};

	return { session };
};
