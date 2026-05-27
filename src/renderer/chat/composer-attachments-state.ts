import type { Attachment } from "../attachments/attachment-types";
import { COMPOSER_MAX_ATTACHMENT_BYTES, COMPOSER_MAX_ATTACHMENTS } from "../attachments/attachment-types";
import { loadAttachment } from "../attachments/attachment-utils";

export const canAddAttachments = (currentCount: number, incomingCount: number): boolean =>
	currentCount + incomingCount <= COMPOSER_MAX_ATTACHMENTS;

export const removeAttachment = (attachments: Attachment[], id: string): Attachment[] =>
	attachments.filter((attachment) => attachment.id !== id);

const attachmentErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const processFilesForComposer = async (
	files: File[],
	currentAttachments: Attachment[],
): Promise<{ attachments: Attachment[]; error?: string }> => {
	if (!canAddAttachments(currentAttachments.length, files.length)) {
		return {
			attachments: currentAttachments,
			error: `Maximum ${COMPOSER_MAX_ATTACHMENTS} files allowed`,
		};
	}

	const newAttachments: Attachment[] = [];
	for (const file of files) {
		if (file.size > COMPOSER_MAX_ATTACHMENT_BYTES) {
			return {
				attachments: currentAttachments,
				error: `${file.name} exceeds maximum size of ${Math.round(COMPOSER_MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB`,
			};
		}
		try {
			newAttachments.push(await loadAttachment(file));
		} catch (error) {
			return {
				attachments: currentAttachments,
				error: `Failed to process ${file.name}: ${attachmentErrorMessage(error)}`,
			};
		}
	}

	return { attachments: [...currentAttachments, ...newAttachments] };
};
