import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import type { PiSdkSession } from "./pi-session-runtime";

const assistantContent = "I can see this project. Pi session streaming is connected.";

export const createSmokePiAgentSession = async (): Promise<{ session: PiSdkSession }> => {
	const listeners = new Set<(event: AgentSessionEvent) => void>();
	let pendingPrompt: ReturnType<typeof setTimeout> | null = null;

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
				pendingPrompt = setTimeout(() => {
					pendingPrompt = null;
					const userMessage = {
						role: "user",
						content: [{ type: "text", text: prompt }],
						timestamp: 1,
					};
					const assistantMessage = {
						role: "assistant",
						content: [{ type: "text", text: assistantContent }],
						timestamp: 2,
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
