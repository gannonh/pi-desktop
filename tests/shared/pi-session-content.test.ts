import { describe, expect, it } from "vitest";
import { extractTextFromPiContent } from "../../src/shared/pi-session-content";

describe("extractTextFromPiContent", () => {
	it("preserves plain string content from Pi SDK messages", () => {
		expect(extractTextFromPiContent("hello")).toBe("hello");
	});

	it("joins text blocks and ignores non-text blocks", () => {
		expect(
			extractTextFromPiContent([
				{ type: "text", text: "first" },
				{ type: "image", data: "ignored" },
				{ type: "text", text: "second" },
			]),
		).toBe("firstsecond");
	});

	it("returns empty text for unsupported content shapes", () => {
		expect(extractTextFromPiContent({ type: "text", text: "not an SDK content array" })).toBe("");
		expect(extractTextFromPiContent(null)).toBe("");
	});
});
