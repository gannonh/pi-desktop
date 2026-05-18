import type { SessionEntry } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { loadPiSessionHistory } from "../../src/main/pi-session/pi-session-history";

const entries: SessionEntry[] = [
	{
		type: "message",
		id: "user-one",
		parentId: null,
		timestamp: "2026-05-17T12:00:00.000Z",
		message: {
			role: "user",
			content: "what time is it?",
			timestamp: 1,
		},
	},
	{
		type: "message",
		id: "assistant-one",
		parentId: "user-one",
		timestamp: "2026-05-17T12:00:01.000Z",
		message: {
			role: "assistant",
			content: [{ type: "text", text: "It is 8:45 AM." }],
			api: "anthropic-messages",
			provider: "anthropic",
			model: "claude-sonnet-4-5",
			usage: {
				input: 1,
				output: 1,
				cacheRead: 0,
				cacheWrite: 0,
				totalTokens: 2,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
			},
			stopReason: "stop",
			timestamp: 2,
		},
	},
	{
		type: "message",
		id: "bash-one",
		parentId: "assistant-one",
		timestamp: "2026-05-17T12:00:02.000Z",
		message: {
			role: "bashExecution",
			command: "pwd",
			output: "/tmp/pi-desktop",
			timestamp: 3,
		},
	} as SessionEntry,
];

describe("loadPiSessionHistory", () => {
	it("loads persisted Pi session messages for renderer display", () => {
		const openSession = vi.fn(() => ({
			getSessionId: () => "sdk-session:one",
			getBranch: () => entries,
		}));

		const history = loadPiSessionHistory({
			projectId: "project:/tmp/pi-desktop",
			workspacePath: "/tmp/pi-desktop",
			sessionPath: "/tmp/pi-session.jsonl",
			openSession,
		});

		expect(openSession).toHaveBeenCalledWith({
			sessionPath: "/tmp/pi-session.jsonl",
			workspacePath: "/tmp/pi-desktop",
			env: undefined,
		});
		expect(history).toEqual({
			sessionId: "project:/tmp/pi-desktop:sdk-session:one",
			status: "idle",
			statusLabel: "Idle",
			messages: [
				{ id: "user:user-one", role: "user", content: "what time is it?", streaming: false },
				{ id: "assistant:assistant-one", role: "assistant", content: "It is 8:45 AM.", streaming: false },
				{ id: "bashExecution:bash-one", role: "tool", content: "pwd\n/tmp/pi-desktop", streaming: false },
			],
		});
	});
});
