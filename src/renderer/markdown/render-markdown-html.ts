import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({
	gfm: true,
	breaks: true,
});

const stripUnsafeHtml = (html: string) => {
	let sanitized = html.replace(/<script[\s\S]*?<\/script>/gi, "");
	sanitized = sanitized.replace(/<(iframe|object|embed|form)[\s\S]*?<\/\1>/gi, "");
	sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
	sanitized = sanitized.replace(/\s+(href|src|xlink:href)\s*=\s*(["']?)\s*javascript:[^"'>\s]*/gi, "");
	sanitized = sanitized.replace(/\s+(href|src|srcset)\s*=\s*(["']?)\s*data:text\/html[^"'>\s]*/gi, "");
	return sanitized;
};

const sanitizeHtml = (html: string) => {
	if (typeof window === "undefined") {
		return stripUnsafeHtml(html);
	}

	return DOMPurify.sanitize(html);
};

export const renderMarkdownHtml = (content: string) => sanitizeHtml(marked.parse(content, { async: false }) as string);
