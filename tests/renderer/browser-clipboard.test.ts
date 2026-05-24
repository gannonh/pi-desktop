// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { writeBrowserClipboardText } from "../../src/renderer/app-api/browser-clipboard";

describe("browser clipboard bridge", () => {
	it("normalizes write failures into an IPC result", async () => {
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText: vi.fn().mockRejectedValue(new Error("permission denied")) },
		});

		await expect(writeBrowserClipboardText({ text: "copy me" })).resolves.toEqual({
			ok: false,
			error: { code: "clipboard.write_failed", message: "permission denied" },
		});
	});
});
