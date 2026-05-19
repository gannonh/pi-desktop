import DOMPurify from "dompurify";
import { marked } from "marked";
import type { PiSessionMessageRole } from "../../shared/pi-session";

interface MessageContentProps {
	content: string;
	role: PiSessionMessageRole;
	streaming?: boolean;
}

marked.setOptions({
	gfm: true,
	breaks: true,
});

const stripUnsafeHtml = (html: string) => {
	let sanitized = html.replace(/<script[\s\S]*?<\/script>/gi, "");
	sanitized = sanitized.replace(/<(iframe|object|embed|form)[\s\S]*?<\/\1>/gi, "");
	sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
	sanitized = sanitized.replace(
		/\s+(href|src|xlink:href)\s*=\s*(["']?)\s*javascript:[^"'>\s]*/gi,
		"",
	);
	sanitized = sanitized.replace(
		/\s+(href|src|srcset)\s*=\s*(["']?)\s*data:text\/html[^"'>\s]*/gi,
		"",
	);
	return sanitized;
};

const sanitizeHtml = (html: string) => {
	if (typeof window === "undefined") {
		return stripUnsafeHtml(html);
	}

	return DOMPurify.sanitize(html);
};

const renderMarkdownHtml = (content: string) => sanitizeHtml(marked.parse(content, { async: false }) as string);

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
