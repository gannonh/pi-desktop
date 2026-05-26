import { describe, expect, it } from "vitest";
import { buildPromptFromAttachments, convertAttachments } from "../../src/renderer/attachments/convert-attachments";
import type { Attachment } from "../../src/renderer/attachments/attachment-types";

describe("convertAttachments", () => {
	it("maps images and document text to content blocks", () => {
		const attachments: Attachment[] = [
			{
				id: "1",
				type: "image",
				fileName: "shot.png",
				mimeType: "image/png",
				size: 10,
				content: "abc",
			},
			{
				id: "2",
				type: "document",
				fileName: "notes.txt",
				mimeType: "text/plain",
				size: 20,
				content: "dGV4dA==",
				extractedText: "hello",
			},
		];

		expect(convertAttachments(attachments)).toEqual([
			{ type: "image", data: "abc", mimeType: "image/png" },
			{ type: "text", text: "\n\n[Document: notes.txt]\nhello" },
		]);
	});

	it("builds the runtime prompt from document attachments so file context reaches Pi", async () => {
		const attachments: Attachment[] = [
			{
				id: "1",
				type: "document",
				fileName: "src/app.ts",
				mimeType: "text/typescript",
				size: 42,
				content: "ZXhwb3J0IHt9Ow==",
				extractedText: "export {};",
			},
		];

		await expect(buildPromptFromAttachments("Review this file", attachments)).resolves.toEqual({
			prompt: "Review this file\n[Document: src/app.ts]\nexport {};",
			images: undefined,
		});
	});
});
