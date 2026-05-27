import { describe, expect, it } from "vitest";
import type { Attachment } from "../../src/renderer/attachments/attachment-types";
import { buildPromptFromAttachments, convertAttachments } from "../../src/renderer/attachments/convert-attachments";

const imageAttachment = (overrides: Omit<Partial<Attachment>, "type"> = {}): Attachment => ({
	id: "image",
	type: "image",
	fileName: "shot.png",
	mimeType: "image/png",
	size: 10,
	content: "abc",
	...overrides,
});

const documentAttachment = (overrides: Omit<Partial<Attachment>, "type"> = {}): Attachment => ({
	id: "document",
	type: "document",
	fileName: "notes.txt",
	mimeType: "text/plain",
	size: 20,
	content: "dGV4dA==",
	extractedText: "hello",
	...overrides,
});

describe("convertAttachments", () => {
	it("maps images and document text to content blocks", () => {
		const attachments = [imageAttachment(), documentAttachment()];

		expect(convertAttachments(attachments)).toEqual([
			{ type: "image", data: "abc", mimeType: "image/png" },
			{ type: "text", text: "\n\n[Document: notes.txt]\nhello" },
		]);
	});

	it("builds the runtime prompt from document attachments so file context reaches Pi", async () => {
		const attachments = [
			documentAttachment({
				fileName: "src/app.ts",
				mimeType: "text/typescript",
				size: 42,
				content: "ZXhwb3J0IHt9Ow==",
				extractedText: "export {};",
			}),
		];

		await expect(buildPromptFromAttachments("Review this file", attachments)).resolves.toEqual({
			prompt: "Review this file\n[Document: src/app.ts]\nexport {};",
			images: undefined,
		});
	});

	it("builds runtime image payloads so image-only prompts reach Pi", async () => {
		const attachments = [
			imageAttachment({
				fileName: "screenshot.png",
				size: 24,
				content: "aW1hZ2U=",
			}),
		];

		await expect(buildPromptFromAttachments("", attachments)).resolves.toEqual({
			prompt: "",
			images: [{ type: "image", data: "aW1hZ2U=", mimeType: "image/png" }],
		});
	});
});
