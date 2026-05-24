import { lazy, Suspense, useMemo, useState } from "react";
import { unsupportedLocalImageSources } from "./markdown-image-policy";

const RichMarkdownEditor = lazy(() =>
	import("./rich-markdown-editor").then((module) => ({ default: module.RichMarkdownEditor })),
);
const MarkdownSourceEditor = lazy(() =>
	import("./markdown-source-editor").then((module) => ({ default: module.MarkdownSourceEditor })),
);

export type MarkdownSurfaceMode = "preview" | "source" | "split";

export type MarkdownSurfaceEditorRole = "rich" | "source";

export type MarkdownSurfaceEditorActions = {
	getMarkdown: () => string;
	focus: () => void;
	replaceMarkdown: (markdown: string) => void;
	reportParseError: (message: string, source: string) => void;
};

type MarkdownParseErrorState = {
	message: string;
	source: string;
	relativePath: string;
	value: string;
};

export type MarkdownSurfaceProps = {
	value: string;
	mode: MarkdownSurfaceMode;
	readOnly: boolean;
	relativePath: string;
	onChange: (markdown: string) => void;
	onEditorReady?: (role: MarkdownSurfaceEditorRole, actions: MarkdownSurfaceEditorActions) => void;
	onError?: (message: string, source: string) => void;
	onLinkClick?: (href: string) => void;
};

export function MarkdownSurface({
	value,
	mode,
	readOnly,
	relativePath,
	onChange,
	onEditorReady,
	onError,
	onLinkClick,
}: MarkdownSurfaceProps) {
	const [parseError, setParseError] = useState<MarkdownParseErrorState | null>(null);
	const unsupportedImages = useMemo(() => unsupportedLocalImageSources(value), [value]);
	const currentParseError =
		parseError?.relativePath === relativePath && parseError.value === value ? parseError : null;

	const handleEditorError = (message: string, source: string) => {
		setParseError({ message, source, relativePath, value });
		onError?.(message, source);
	};
	const handleChange = (markdown: string) => {
		onChange(markdown);
		setParseError(null);
	};
	const showPreviewSourceFallback = mode === "preview" && currentParseError !== null;
	const showImageNotice = (mode === "preview" || mode === "split") && unsupportedImages.length > 0;

	return (
		<section
			className={`markdown-surface markdown-surface--${mode}`}
			data-testid="markdown-surface"
			data-mode={mode}
			data-relative-path={relativePath}
		>
			<Suspense
				fallback={
					<div className="markdown-surface__loading" data-testid="markdown-surface-loading">
						Loading Markdown editor…
					</div>
				}
			>
				{showImageNotice ? (
					<div className="markdown-surface__image-notice" role="note" data-testid="markdown-image-notice">
						<p className="markdown-surface__image-notice-title">Local image previews are not available yet.</p>
						<p>
							Markdown mode keeps the image source editable. Unsupported image source
							{unsupportedImages.length === 1 ? "" : "s"}: <code>{unsupportedImages.join(", ")}</code>
						</p>
					</div>
				) : null}
				{currentParseError ? (
					<div className="markdown-surface__error" role="alert" data-testid="markdown-surface-error">
						<p className="markdown-surface__error-title">Markdown preview error</p>
						<p>{currentParseError.message}</p>
						<p>Editing source mode keeps the current Markdown saveable.</p>
					</div>
				) : null}
				{mode === "preview" && !showPreviewSourceFallback ? (
					<RichMarkdownEditor
						value={value}
						readOnly={readOnly}
						relativePath={relativePath}
						onChange={handleChange}
						onEditorReady={onEditorReady}
						onError={handleEditorError}
						onLinkClick={onLinkClick}
					/>
				) : null}
				{showPreviewSourceFallback ? (
					<MarkdownSourceEditor
						value={value}
						readOnly={readOnly}
						relativePath={relativePath}
						onChange={handleChange}
						onEditorReady={onEditorReady}
						onError={handleEditorError}
					/>
				) : null}
				{mode === "source" ? (
					<MarkdownSourceEditor
						value={value}
						readOnly={readOnly}
						relativePath={relativePath}
						onChange={handleChange}
						onEditorReady={onEditorReady}
						onError={handleEditorError}
					/>
				) : null}
				{mode === "split" ? (
					<div className="markdown-surface__split" data-testid="markdown-split-editor">
						<MarkdownSourceEditor
							value={value}
							readOnly={readOnly}
							relativePath={relativePath}
							onChange={handleChange}
							onEditorReady={onEditorReady}
							onError={handleEditorError}
						/>
						<RichMarkdownEditor
							value={value}
							readOnly={readOnly}
							relativePath={relativePath}
							onChange={handleChange}
							onEditorReady={onEditorReady}
							onError={handleEditorError}
							onLinkClick={onLinkClick}
						/>
					</div>
				) : null}
			</Suspense>
		</section>
	);
}
