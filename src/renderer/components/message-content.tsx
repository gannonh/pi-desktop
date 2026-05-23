import type { PiSessionMessageRole } from "../../shared/pi-session";
import { renderMarkdownHtml } from "../markdown/render-markdown-html";

interface MessageContentProps {
	content: string;
	role: PiSessionMessageRole;
	streaming?: boolean;
}

export function MessageContent({ content, role, streaming = false }: MessageContentProps) {
	if (role === "tool") {
		const summary = content.split("\n")[0]?.trim() || "Tool output";
		return (
			<details className="live-session__tool-details">
				<summary className="live-session__tool-summary">{summary}</summary>
				<pre className="live-session__tool-body">{content}</pre>
			</details>
		);
	}

	if (role === "system") {
		return <div className="live-session__system-callout">{content}</div>;
	}

	return (
		<div className="live-session__message-content live-session__message-content--markdown">
			{/* biome-ignore lint/security/noDangerouslySetInnerHtml: browser path uses DOMPurify; test/SSR path uses stripUnsafeHtml. */}
			<div dangerouslySetInnerHTML={{ __html: renderMarkdownHtml(content) }} />
			{streaming ? <span className="live-session__cursor" role="status" aria-label="Streaming" /> : null}
		</div>
	);
}
