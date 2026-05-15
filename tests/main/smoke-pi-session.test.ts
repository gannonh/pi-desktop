import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSmokePiAgentSession } from "../../src/main/pi-session/smoke-pi-session";

describe("createSmokePiAgentSession", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("resolves an aborted scheduled prompt so later prompts can run", async () => {
		const { session } = await createSmokePiAgentSession();
		let settled = false;
		void session.prompt("Stop this").then(() => {
			settled = true;
		});

		await session.abort();
		await Promise.resolve();

		expect(settled).toBe(true);
	});

	it("uses unique message ids for multiple prompts in the same smoke session", async () => {
		const events: AgentSessionEvent[] = [];
		const { session } = await createSmokePiAgentSession();
		session.subscribe((event) => {
			events.push(event);
		});

		const first = session.prompt("First");
		await vi.runOnlyPendingTimersAsync();
		await first;
		const second = session.prompt("Second");
		await vi.runOnlyPendingTimersAsync();
		await second;

		const messageStarts = events.filter((event): event is Extract<AgentSessionEvent, { type: "message_start" }> => {
			return event.type === "message_start";
		});

		expect(messageStarts.map((event) => event.message.timestamp)).toEqual([1, 2, 3, 4]);
	});
});
