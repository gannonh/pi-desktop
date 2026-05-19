import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageContent } from "../../src/renderer/components/message-content";

describe("MessageContent", () => {
	it("renders assistant markdown headings instead of raw hash syntax", () => {
		const markup = renderToStaticMarkup(
			createElement(MessageContent, {
				role: "assistant",
				content: "# Project overview\n\nHello",
			}),
		);

		expect(markup).toContain("<h1");
		expect(markup).toContain("Project overview");
		expect(markup).not.toContain("# Project overview");
	});

	it("strips unsafe script tags from assistant markdown", () => {
		const markup = renderToStaticMarkup(
			createElement(MessageContent, {
				role: "assistant",
				content: '<script>alert("x")</script>\n\nSafe text',
			}),
		);

		expect(markup).not.toContain("<script");
		expect(markup).toContain("Safe text");
	});

	it("renders user markdown and a streaming cursor", () => {
		const markup = renderToStaticMarkup(
			createElement(MessageContent, {
				role: "user",
				content: "Hello **team**",
				streaming: true,
			}),
		);

		expect(markup).toContain("<strong>team</strong>");
		expect(markup).not.toContain("**team**");
		expect(markup).toContain('aria-label="Streaming"');
	});

	it("renders system messages in a callout", () => {
		const markup = renderToStaticMarkup(
			createElement(MessageContent, {
				role: "system",
				content: "Branch summary",
			}),
		);

		expect(markup).toContain("live-session__system-callout");
		expect(markup).toContain("Branch summary");
	});

	it("renders tool output in a collapsible details block", () => {
		const markup = renderToStaticMarkup(
			createElement(MessageContent, {
				role: "tool",
				content: "npm test\npassed",
			}),
		);

		expect(markup).toContain("<details");
		expect(markup).toContain("npm test");
		expect(markup).toContain("<pre");
	});
});
