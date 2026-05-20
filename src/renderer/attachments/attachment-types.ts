/** Ported from @earendil-works/pi-web-ui attachment-utils (keep behavior aligned). */
export interface Attachment {
	id: string;
	type: "image" | "document";
	fileName: string;
	mimeType: string;
	size: number;
	content: string;
	extractedText?: string;
	preview?: string;
}

export const COMPOSER_MAX_ATTACHMENTS = 10;
export const COMPOSER_MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export const COMPOSER_ACCEPTED_FILE_TYPES =
	"image/*,application/pdf,.docx,.pptx,.xlsx,.xls,.txt,.md,.json,.xml,.html,.css,.js,.ts,.jsx,.tsx,.yml,.yaml";
