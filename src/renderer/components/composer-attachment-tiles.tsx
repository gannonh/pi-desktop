import { FileSpreadsheet, FileText, X } from "lucide-react";
import { useState } from "react";
import type { Attachment } from "../attachments/attachment-types";

interface ComposerAttachmentTilesProps {
	attachments: Attachment[];
	onRemove: (id: string) => void;
}

const previewSrc = (attachment: Attachment) => {
	if (!attachment.preview) {
		return null;
	}
	const mimeType = attachment.type === "image" ? attachment.mimeType : "image/png";
	return `data:${mimeType};base64,${attachment.preview}`;
};

export function ComposerAttachmentTiles({ attachments, onRemove }: ComposerAttachmentTilesProps) {
	const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

	if (attachments.length === 0) {
		return null;
	}

	const isPdf = (attachment: Attachment) => attachment.mimeType === "application/pdf";
	const isExcel = (attachment: Attachment) =>
		attachment.mimeType.includes("spreadsheetml") ||
		attachment.fileName.toLowerCase().endsWith(".xlsx") ||
		attachment.fileName.toLowerCase().endsWith(".xls");

	return (
		<>
			<section className="composer__attachments" aria-label="Attached files">
				{attachments.map((attachment) => {
					const src = previewSrc(attachment);
					return (
						<div key={attachment.id} className="composer__attachment-tile-wrap">
							{src ? (
								<button
									type="button"
									className="composer__attachment-tile composer__attachment-tile--preview"
									aria-label={`Preview ${attachment.fileName}`}
									onClick={() => setPreviewAttachment(attachment)}
								>
									<img src={src} alt="" />
									{isPdf(attachment) ? <span className="composer__attachment-badge">PDF</span> : null}
								</button>
							) : (
								<button
									type="button"
									className="composer__attachment-tile composer__attachment-tile--icon"
									aria-label={`Preview ${attachment.fileName}`}
									onClick={() => setPreviewAttachment(attachment)}
								>
									{isExcel(attachment) ? (
										<FileSpreadsheet className="composer__icon" />
									) : (
										<FileText className="composer__icon" />
									)}
									<span className="composer__attachment-name">{attachment.fileName}</span>
								</button>
							)}
							<button
								type="button"
								className="composer__attachment-remove"
								aria-label={`Remove ${attachment.fileName}`}
								onClick={() => onRemove(attachment.id)}
							>
								<X className="composer__icon" />
							</button>
						</div>
					);
				})}
			</section>
			{previewAttachment ? (
				// biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss only
				<div
					className="composer__attachment-overlay"
					role="dialog"
					aria-modal="true"
					aria-label={previewAttachment.fileName}
					onClick={() => setPreviewAttachment(null)}
				>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: prevent overlay backdrop close */}
					<div className="composer__attachment-overlay-panel" onMouseDown={(event) => event.stopPropagation()}>
						<p className="composer__attachment-overlay-title">{previewAttachment.fileName}</p>
						{previewSrc(previewAttachment) ? (
							<img src={previewSrc(previewAttachment) ?? ""} alt={previewAttachment.fileName} />
						) : (
							<p className="composer__attachment-overlay-copy">
								{previewAttachment.extractedText?.slice(0, 2000) ?? "No preview available."}
							</p>
						)}
					</div>
				</div>
			) : null}
		</>
	);
}
