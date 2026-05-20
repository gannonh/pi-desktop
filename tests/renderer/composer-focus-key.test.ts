import { describe, expect, it } from "vitest";
import { formatComposerFocusKey } from "../../src/renderer/chat/composer-focus-key";

describe("formatComposerFocusKey", () => {
	it("keys focus by project and chat scope", () => {
		expect(formatComposerFocusKey({ projectId: "project:/tmp/app", chatId: "chat:1" })).toBe(
			"project:/tmp/app:chat:1",
		);
	});

	it("uses stable defaults when scope fields are missing", () => {
		expect(formatComposerFocusKey({ projectId: null, chatId: null })).toBe("standalone:none");
	});
});
