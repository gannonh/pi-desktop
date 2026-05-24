import { MDXEditor } from "@mdxeditor/editor";
import { type MouseEvent, useCallback, useLayoutEffect, useMemo, useRef } from "react";
import type { MarkdownSurfaceEditorActions, MarkdownSurfaceEditorRole } from "./markdown-surface";
import { createMarkdownEditorAdapterConfig } from "./mdxeditor-adapter";
import { useMdxMarkdownEditorBridge } from "./use-mdx-markdown-editor-bridge";

type RichMarkdownEditorProps = {
	value: string;
	readOnly: boolean;
	relativePath: string;
	onChange: (markdown: string) => void;
	onEditorReady?: (role: MarkdownSurfaceEditorRole, actions: MarkdownSurfaceEditorActions) => void;
	onError?: (message: string, source: string) => void;
	onLinkClick?: (href: string) => void;
};

const closestMarkdownLink = (target: EventTarget | null) => {
	if (!(target instanceof Element)) {
		return null;
	}

	return target.closest<HTMLAnchorElement>("a[href]");
};

export function RichMarkdownEditor({
	value,
	readOnly,
	relativePath,
	onChange,
	onEditorReady,
	onError,
	onLinkClick,
}: RichMarkdownEditorProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const config = useMemo(() => createMarkdownEditorAdapterConfig(), []);
	const { editorRef, handleChange } = useMdxMarkdownEditorBridge({
		value,
		readOnly,
		role: "rich",
		onChange,
		onEditorReady,
		onError,
	});

	const guardLinkClick = useCallback(
		(event: { target: EventTarget | null; preventDefault: () => void; stopPropagation: () => void }) => {
			const link = closestMarkdownLink(event.target);
			if (!link) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			onLinkClick?.(link.getAttribute("href") ?? link.href);
		},
		[onLinkClick],
	);

	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const handleNativeClick = (event: globalThis.MouseEvent) => {
			guardLinkClick(event);
		};

		const linkedAnchors = new Set<HTMLAnchorElement>();
		const syncAnchorGuards = () => {
			for (const link of container.querySelectorAll<HTMLAnchorElement>("a[href]")) {
				if (linkedAnchors.has(link)) {
					continue;
				}
				linkedAnchors.add(link);
				link.addEventListener("click", handleNativeClick, { capture: true });
			}
		};

		syncAnchorGuards();
		const observer = new MutationObserver(syncAnchorGuards);
		observer.observe(container, { childList: true, subtree: true });

		return () => {
			observer.disconnect();
			for (const link of linkedAnchors) {
				link.removeEventListener("click", handleNativeClick, { capture: true });
			}
		};
	}, [guardLinkClick]);

	const handleClickCapture = useCallback(
		(event: MouseEvent<HTMLDivElement>) => guardLinkClick(event),
		[guardLinkClick],
	);

	return (
		<div
			ref={containerRef}
			className="markdown-surface__rich"
			data-testid="markdown-rich-editor"
			data-readonly={readOnly}
			onClickCapture={handleClickCapture}
		>
			<MDXEditor
				ref={editorRef}
				markdown={value}
				plugins={config.plugins}
				iconComponentFor={config.iconComponentFor}
				className={config.editorClassName}
				contentEditableClassName={config.contentClassName}
				readOnly={readOnly}
				trim={false}
				suppressHtmlProcessing={true}
				aria-label={`Markdown preview for ${relativePath}`}
				onError={(payload) => onError?.(payload.error, payload.source)}
				onChange={handleChange}
			/>
		</div>
	);
}
