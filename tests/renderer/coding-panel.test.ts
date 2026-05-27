import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CodingPanel } from "../../src/renderer/components/coding-panel";
import type { LiveToolExecution } from "../../src/renderer/session/session-state";

const execution = (overrides: Partial<LiveToolExecution> = {}): LiveToolExecution => ({
	id: "call_1",
	toolName: "bash",
	status: "completed",
	args: { command: "ls -la" },
	partialResult: null,
	result: { content: [{ type: "text", text: "file.txt\n" }], details: {} },
	isError: false,
	startedAt: "2026-05-14T12:00:00.000Z",
	updatedAt: "2026-05-14T12:00:01.000Z",
	endedAt: "2026-05-14T12:00:01.000Z",
	...overrides,
});

describe("CodingPanel", () => {
	it("renders nothing when there are no tool executions", () => {
		expect(renderToStaticMarkup(createElement(CodingPanel, { toolExecutions: [] }))).toBe("");
	});

	it("renders tool rows with status, summaries, and expandable details", () => {
		const markup = renderToStaticMarkup(
			createElement(CodingPanel, {
				toolExecutions: [
					execution(),
					execution({
						id: "call_2",
						status: "failed",
						isError: true,
						result: { content: [{ type: "text", text: "command failed" }] },
					}),
					execution({
						id: "call_3",
						status: "canceled",
						result: null,
					}),
				],
			}),
		);

		expect(markup).toContain('aria-label="Tool timeline"');
		expect(markup).toContain("bash");
		expect(markup).toContain("Completed");
		expect(markup).toContain("Failed");
		expect(markup).toContain("Canceled");
		expect(markup).toContain("ls -la");
		expect(markup).toContain("Show details");
	});
});
