import { describe, expect, it } from "vitest";
import { COMPOSER_MAX_ATTACHMENT_BYTES } from "../../src/renderer/attachments/attachment-types";
import { loadAttachment } from "../../src/renderer/attachments/attachment-utils";

describe("loadAttachment", () => {
	it("accepts attachments up to the shared composer size policy", async () => {
		const sizeOverLegacyLimit = 15 * 1024 * 1024 + 1;
		const file = new File([new Uint8Array(sizeOverLegacyLimit)], "large.txt", { type: "text/plain" });

		const attachment = await loadAttachment(file);

		expect(sizeOverLegacyLimit).toBeLessThanOrEqual(COMPOSER_MAX_ATTACHMENT_BYTES);
		expect(attachment.size).toBe(sizeOverLegacyLimit);
		expect(attachment.fileName).toBe("large.txt");
	});

	it("rejects attachments above the shared composer size policy", async () => {
		const file = new File([new Uint8Array(COMPOSER_MAX_ATTACHMENT_BYTES + 1)], "too-large.txt", {
			type: "text/plain",
		});

		await expect(loadAttachment(file)).rejects.toThrow(
			`Attachment exceeds ${Math.floor(COMPOSER_MAX_ATTACHMENT_BYTES / (1024 * 1024))}MB limit.`,
		);
	});
});
