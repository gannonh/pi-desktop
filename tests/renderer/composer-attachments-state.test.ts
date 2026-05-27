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

	it("adds valid files to the existing attachment list", async () => {
		const valid = new File(["todo"], "todo.txt", { type: "text/plain" });

		const result = await processFilesForComposer([valid], [existingAttachment]);

		expect(result.error).toBeUndefined();
		expect(result.attachments.map((attachment) => attachment.fileName)).toEqual(["notes.md", "todo.txt"]);
		expect(result.attachments[1]).toMatchObject({
			type: "document",
			mimeType: "text/plain",
			extractedText: "todo",
		});
	});
});
