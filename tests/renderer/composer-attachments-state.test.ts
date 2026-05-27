import { describe, expect, it } from "vitest";
import type { Attachment } from "../../src/renderer/attachments/attachment-types";
import { processFilesForComposer } from "../../src/renderer/chat/composer-attachments-state";

const existingAttachment: Attachment = {
	id: "existing",
	type: "document",
	fileName: "notes.md",
	mimeType: "text/markdown",
	size: 5,
	content: "bm90ZXM=",
	extractedText: "notes",
};

describe("processFilesForComposer", () => {
	it("keeps existing attachments and shows a concise error for unsupported files", async () => {
		const unsupported = new File(["binary"], "archive.zip", { type: "application/zip" });

		await expect(processFilesForComposer([unsupported], [existingAttachment])).resolves.toEqual({
			attachments: [existingAttachment],
			error: "Failed to process archive.zip: Unsupported file type: application/zip",
		});
	});

	it("rejects empty image attachments before they can become invalid Pi payloads", async () => {
		const emptyImage = new File([], "empty.png", { type: "image/png" });

		await expect(processFilesForComposer([emptyImage], [existingAttachment])).resolves.toEqual({
			attachments: [existingAttachment],
			error: "Failed to process empty.png: Image attachment is empty.",
		});
	});

	it("recovers after a failed attachment attempt by accepting the next valid file", async () => {
		const unsupported = new File(["binary"], "archive.zip", { type: "application/zip" });
		const firstAttempt = await processFilesForComposer([unsupported], [existingAttachment]);
		const valid = new File(["todo"], "todo.txt", { type: "text/plain" });

		const recovered = await processFilesForComposer([valid], firstAttempt.attachments);

		expect(recovered.error).toBeUndefined();
		expect(recovered.attachments.map((attachment) => attachment.fileName)).toEqual(["notes.md", "todo.txt"]);
		expect(recovered.attachments[1]).toMatchObject({
			type: "document",
			mimeType: "text/plain",
			extractedText: "todo",
		});
	});
});
