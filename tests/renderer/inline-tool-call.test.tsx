import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LiveToolExecution } from "../../src/renderer/session/session-state";
import { InlineToolCall } from "../../src/renderer/tools/inline-tool-call";

const execution = (overrides: Partial<LiveToolExecution>): LiveToolExecution => ({
	id: "call_1",
	toolName: "bash",
	status: "completed",
	args: {},
	partialResult: null,
	result: null,
	isError: false,
	startedAt: "2026-05-14T12:00:00.000Z",
	updatedAt: "2026-05-14T12:00:01.000Z",
	endedAt: "2026-05-14T12:00:01.000Z",
	...overrides,
});

const renderTool = (tool: LiveToolExecution) => renderToStaticMarkup(createElement(InlineToolCall, { execution: tool }));

describe("InlineToolCall", () => {
	it("renders bash as a terminal command with output", () => {
		const markup = renderTool(
			execution({
				toolName: "bash",
				args: { command: "pnpm test", timeout: 3 },
				result: { content: [{ type: "text", text: "ok\n" }] },
			}),
		);

		expect(markup).toContain("$ pnpm test");
		expect(markup).toContain("timeout 3s");
		expect(markup).toContain("ok");
	});

	it("renders read with file path and line range", () => {
		const markup = renderTool(
			execution({
				toolName: "read",
				args: { path: "src/app.ts", offset: 10, limit: 5 },
				result: { content: [{ type: "text", text: "line 10\nline 11" }] },
			}),
		);

		expect(markup).toContain("read src/app.ts:10-14");
		expect(markup).toContain("line 10");
	});

	it("renders read limit-only ranges from the first line", () => {
		const markup = renderTool(
			execution({
				toolName: "read",
				args: { path: "src/app.ts", limit: 20 },
				result: { content: [{ type: "text", text: "line 1" }] },
			}),
		);

		expect(markup).toContain("read src/app.ts:1-20");
	});

	it("renders edit with diff output", () => {
		const markup = renderTool(
			execution({
				toolName: "edit",
				args: { path: "src/app.ts" },
				result: { details: { diff: "-old\n+new" }, content: [{ type: "text", text: "Edited" }] },
			}),
		);

		expect(markup).toContain("edit src/app.ts");
		expect(markup).toContain("-old");
		expect(markup).toContain("+new");
	});

	it("renders write with content preview", () => {
		const markup = renderTool(
			execution({
				toolName: "write",
				args: { path: "notes.md", content: "# Notes\nBody" },
				result: { content: [{ type: "text", text: "Wrote notes.md" }] },
			}),
		);

		expect(markup).toContain("write notes.md");
		expect(markup).toContain("# Notes");
	});

	it("renders grep, find, and ls search summaries", () => {
		expect(
			renderTool(
				execution({
					toolName: "grep",
					args: { pattern: "TODO", path: "src", glob: "*.ts", limit: 20 },
					result: { content: [{ type: "text", text: "src/app.ts:1:TODO" }], details: { resultLimitHit: true } },
				}),
			),
		).toContain("grep /TODO/ in src");
		expect(
			renderTool(
				execution({
					toolName: "find",
					args: { pattern: "*.ts", path: "src", limit: 10 },
					result: { content: [{ type: "text", text: "src/app.ts" }] },
				}),
			),
		).toContain("find *.ts in src");
		expect(
			renderTool(
				execution({
					toolName: "ls",
					args: { path: "src", limit: 10 },
					result: { content: [{ type: "text", text: "app.ts" }] },
				}),
			),
		).toContain("ls src");
	});

	it("shows a compact output preview before the expansion details", () => {
		const markup = renderTool(
			execution({
				toolName: "bash",
				args: { command: "printf" },
				result: { content: [{ type: "text", text: "first line\nsecond line" }] },
			}),
		);

		expect(markup).toContain("live-session__tool-call-preview");
		expect(markup.indexOf("first line")).toBeLessThan(markup.indexOf("Show output"));
	});

	it("keeps full output behind an accessible expansion summary", () => {
		const markup = renderTool(
			execution({
				toolName: "read",
				args: { path: "README.md" },
				result: { content: [{ type: "text", text: "first line\nsecond line" }] },
			}),
		);

		expect(markup).toContain("<details");
		expect(markup).toContain("Show output");
		expect(markup).not.toContain("<summary class=\"live-session__tool-call-summary\">first line");
	});

	it("renders built-in truncation and full-output warnings", () => {
		const markup = renderTool(
			execution({
				toolName: "grep",
				args: { pattern: "TODO", path: "src" },
				result: {
					content: [{ type: "text", text: "src/app.ts:1:TODO" }],
					details: { matchLimitReached: true, truncation: { truncated: true }, fullOutputPath: "/tmp/grep.out" },
				},
			}),
		);

		expect(markup).toContain("Match limit reached");
		expect(markup).toContain("Output truncated");
		expect(markup).toContain("Full output: /tmp/grep.out");
	});

	it("renders unknown tools with a generic fallback", () => {
		const markup = renderTool(
			execution({
				toolName: "custom_tool",
				args: { value: 1 },
				result: { content: [{ type: "text", text: "custom output" }] },
			}),
		);

		expect(markup).toContain("custom_tool");
		expect(markup).toContain("custom output");
	});
});
