import { type CodeBlockEditorProps, CodeMirrorEditor } from "@mdxeditor/editor";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

type CopyStatus = "idle" | "copied" | "error";

const copyCodeBlockWithSelection = (code: string): boolean => {
	if (typeof document.execCommand !== "function") {
		return false;
	}

	const textarea = document.createElement("textarea");
	textarea.value = code;
	textarea.readOnly = true;
	textarea.style.position = "fixed";
	textarea.style.inset = "0 auto auto -9999px";
	textarea.style.opacity = "0";
	document.body.append(textarea);
	textarea.focus();
	textarea.select();
	textarea.setSelectionRange(0, code.length);

	try {
		return document.execCommand("copy");
	} finally {
		textarea.remove();
	}
};

const copyCodeBlock = async (code: string): Promise<void> => {
	const errors: string[] = [];
	const desktopClipboard = window.piDesktop?.clipboard;
	if (desktopClipboard) {
		try {
			const result = await desktopClipboard.writeText({ text: code });
			if (result.ok) {
				return;
			}
			errors.push(result.error.message);
		} catch (error) {
			errors.push(error instanceof Error ? error.message : "Desktop clipboard failed.");
		}
	}

	const clipboard = navigator.clipboard;
	if (clipboard?.writeText) {
		try {
			await clipboard.writeText(code);
			return;
		} catch (error) {
			errors.push(error instanceof Error ? error.message : "Browser clipboard failed.");
		}
	}

	if (copyCodeBlockWithSelection(code)) {
		return;
	}

	throw new Error(errors.join(" ") || "Clipboard API unavailable.");
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
