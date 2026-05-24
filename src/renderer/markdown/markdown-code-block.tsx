import { CodeMirrorEditor, type CodeBlockEditorProps } from "@mdxeditor/editor";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

type CopyStatus = "idle" | "copied" | "error";

const copyCodeBlock = async (code: string): Promise<void> => {
	const clipboard = navigator.clipboard;
	if (!clipboard?.writeText) {
		throw new Error("Clipboard API unavailable.");
	}

	await clipboard.writeText(code);
};

const languageLabel = (language: string | null | undefined) => language?.trim() || "plain text";

export function MarkdownCodeBlockEditor(props: CodeBlockEditorProps) {
	const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
	const label = languageLabel(props.language);

	const handleCopy = async () => {
		try {
			await copyCodeBlock(props.code);
			setCopyStatus("copied");
		} catch {
			setCopyStatus("error");
		}
	};

	return (
		<figure className="markdown-surface__code-block" data-testid="markdown-code-block">
			<figcaption className="markdown-surface__code-block-header">
				<span className="markdown-surface__code-block-language">{label}</span>
				<button
					type="button"
					className="markdown-surface__code-copy"
					aria-label={`Copy ${label} code block`}
					onClick={handleCopy}
				>
					{copyStatus === "copied" ? (
						<Check className="markdown-surface__code-copy-icon" aria-hidden strokeWidth={1.75} />
					) : (
						<Copy className="markdown-surface__code-copy-icon" aria-hidden strokeWidth={1.75} />
					)}
					<span>{copyStatus === "copied" ? "Copied" : "Copy"}</span>
				</button>
			</figcaption>
			<div className="markdown-surface__code-editor">
				<CodeMirrorEditor {...props} />
			</div>
			<div className="markdown-surface__code-copy-status" aria-live="polite">
				{copyStatus === "copied" ? "Copied code block." : null}
				{copyStatus === "error" ? "Copy failed. Use Markdown mode to copy source." : null}
			</div>
		</figure>
	);
}
