import type { PiSessionImageContent } from "../../shared/pi-session";
import type { Attachment } from "./attachment-types";
import { resizeComposerImages } from "./resize-composer-images";

type TextBlock = { type: "text"; text: string };
type ImageBlock = { type: "image"; data: string; mimeType: string };

/**
 * Convert attachments to content blocks for the Pi session.
 * Ported from pi-web-ui Messages.convertAttachments.
 */
export const convertAttachments = (attachments: Attachment[]): (TextBlock | ImageBlock)[] => {
	const content: (TextBlock | ImageBlock)[] = [];
	for (const attachment of attachments) {
		if (attachment.type === "image") {
			content.push({
				type: "image",
				data: attachment.content,
				mimeType: attachment.mimeType,
			});
		} else if (attachment.type === "document" && attachment.extractedText) {
			content.push({
				type: "text",
				text: `\n\n[Document: ${attachment.fileName}]\n${attachment.extractedText}`,
			});
		}
	}
	return content;
};

export const buildPromptFromAttachments = async (
	text: string,
	attachments: Attachment[],
): Promise<{ prompt: string; images: PiSessionImageContent[] | undefined }> => {
	const blocks = convertAttachments(attachments);
	const documentText = blocks
		.filter((block): block is TextBlock => block.type === "text")
		.map((block) => block.text)
		.join("");
	const imageBlocks = blocks.filter((block): block is ImageBlock => block.type === "image");
	const resized = await resizeComposerImages(imageBlocks);
	const prompt = [text.trim(), documentText.trim()].filter((part) => part.length > 0).join("\n");
	const images =
		resized.length > 0
			? resized.map((image) => ({
					type: "image" as const,
					data: image.data,
					mimeType: image.mimeType,
				}))
			: undefined;
	return { prompt, images };
};
