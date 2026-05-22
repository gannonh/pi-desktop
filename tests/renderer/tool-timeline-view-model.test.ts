import { describe, expect, it } from "vitest";
import {
	formatToolPayload,
	getTerminalOutputText,
	getToolOutputText,
	isTerminalTool,
	summarizeToolArgs,
	summarizeToolResult,
} from "../../src/renderer/tools/tool-timeline-view-model";

describe("tool timeline view model", () => {
	it("summarizes bash command arguments", () => {
		expect(summarizeToolArgs("bash", { command: "pnpm test" })).toBe("pnpm test");
	});

	it("summarizes tool results from text content", () => {
		expect(
			summarizeToolResult(
				"read",
				{ content: [{ type: "text", text: "first line\nsecond line" }], details: {} },
				false,
			),
		).toBe("first line");
	});

	it("marks bash tools as terminal output", () => {
		expect(isTerminalTool("bash", { command: "ls" }, null)).toBe(true);
		expect(isTerminalTool("read", { path: "README.md" }, null)).toBe(false);
	});

	it("formats terminal output with command and stdout", () => {
		expect(
			getTerminalOutputText({ command: "echo hi" }, { content: [{ type: "text", text: "hi\n" }], details: {} }),
		).toBe("$ echo hi\nhi");
	});

	it("extracts readable tool output text", () => {
		expect(getToolOutputText("read", { content: [{ type: "text", text: "file body" }] })).toBe("file body");
	});

	it("formats unavailable payloads visibly", () => {
		expect(formatToolPayload(undefined)).toBe("Unavailable");
	});
});
