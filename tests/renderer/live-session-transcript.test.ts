import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiveSessionTranscript } from "../../src/renderer/components/live-session-transcript";
import type { LiveSessionState } from "../../src/renderer/session/session-state";

const session: LiveSessionState = {
	sessionId: "session:one",
	status: "running",
	statusLabel: "Running",
	messages: [
		{ id: "user:1", role: "user", content: "First", streaming: false },
		{ id: "user:2", role: "user", content: "Second", streaming: false },
		{ id: "tool:1", role: "tool", content: "npm test", streaming: false },
	],
	toolExecutions: [],
	errorMessage: "",
	retryMessage: "Retrying after rate limit",
	settings: null,
	queuedMessages: [],
	nextSequence: 3,
};

describe("LiveSessionTranscript", () => {
	it("groups consecutive user messages and shows retry status", () => {
		const markup = renderToStaticMarkup(createElement(LiveSessionTranscript, { session }));

		expect(markup).toContain("live-session__message--grouped");
		expect(markup).toContain("Retrying after rate limit");
		expect(markup).toContain("live-session__tool-details");
	});

	it("renders tool executions inline and suppresses associated tool result messages", () => {
		const markup = renderToStaticMarkup(
			createElement(LiveSessionTranscript, {
				session: {
					...session,
					messages: [
						{
							id: "user:1",
							role: "user",
							content: "Run tests",
							streaming: false,
							receivedAt: "2026-05-14T12:00:00.000Z",
						},
						{
							id: "toolResult:call_1:2",
							role: "tool",
							content: "raw tool result",
							streaming: false,
							toolCallId: "call_1",
							receivedAt: "2026-05-14T12:00:02.000Z",
						},
						{
							id: "assistant:3",
							role: "assistant",
							content: "Tests passed",
							streaming: false,
							receivedAt: "2026-05-14T12:00:03.000Z",
						},
					],
					toolExecutions: [
						{
							id: "call_1",
							toolName: "bash",
							status: "completed",
							args: { command: "pnpm test" },
							partialResult: null,
							result: { content: [{ type: "text", text: "ok" }] },
							isError: false,
							startedAt: "2026-05-14T12:00:01.000Z",
							updatedAt: "2026-05-14T12:00:02.000Z",
							endedAt: "2026-05-14T12:00:02.000Z",
						},
					],
				},
			}),
		);

		expect(markup).toContain("live-session__tool-call");
		expect(markup).toContain("pnpm test");
		expect(markup).not.toContain("raw tool result");
		expect(markup.indexOf("Run tests")).toBeLessThan(markup.indexOf("pnpm test"));
		expect(markup.indexOf("pnpm test")).toBeLessThan(markup.indexOf("Tests passed"));
	});

	it("uses insertion sequence as the tie-breaker when timestamps match", () => {
		const sameTimestamp = "2026-05-14T12:00:00.000Z";
		const markup = renderToStaticMarkup(
			createElement(LiveSessionTranscript, {
				session: {
					...session,
					messages: [
						{
							id: "assistant:same-time",
							role: "assistant",
							content: "Same timestamp message",
							streaming: false,
							receivedAt: sameTimestamp,
							sequence: 2,
						},
					],
					toolExecutions: [
						{
							id: "call_same_time",
							toolName: "bash",
							status: "completed",
							args: { command: "pwd" },
							partialResult: null,
							result: null,
							isError: false,
							startedAt: sameTimestamp,
							updatedAt: sameTimestamp,
							endedAt: sameTimestamp,
							sequence: 1,
						},
					],
				},
			}),
		);

		expect(markup.indexOf("$ pwd")).toBeLessThan(markup.indexOf("Same timestamp message"));
	});

	it("keeps timestamp-less history before live tool executions", () => {
		const markup = renderToStaticMarkup(
			createElement(LiveSessionTranscript, {
				session: {
					...session,
					messages: [
						{ id: "assistant:history-1", role: "assistant", content: "Earlier answer", streaming: false },
						{ id: "assistant:history-2", role: "assistant", content: "Second earlier answer", streaming: false },
					],
					toolExecutions: [
						{
							id: "call_2",
							toolName: "bash",
							status: "running",
							args: { command: "pwd" },
							partialResult: null,
							result: null,
							isError: false,
							startedAt: "2026-05-14T12:00:04.000Z",
							updatedAt: "2026-05-14T12:00:04.000Z",
							endedAt: null,
						},
					],
				},
			}),
		);

		expect(markup.indexOf("Earlier answer")).toBeLessThan(markup.indexOf("$ pwd"));
		expect(markup.indexOf("Second earlier answer")).toBeLessThan(markup.indexOf("$ pwd"));
	});

	it("renders start failures as visible alerts", () => {
		const markup = renderToStaticMarkup(
			createElement(LiveSessionTranscript, {
				session: {
					...session,
					status: "failed",
					statusLabel: "Failed",
					messages: [],
					retryMessage: "",
					errorMessage: "No API key found",
				},
			}),
		);

		expect(markup).toContain('role="alert"');
		expect(markup).toContain("No API key found");
	});
});
