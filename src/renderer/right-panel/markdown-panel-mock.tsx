import type { MarkdownPanelMockData } from "./right-panel-mock-data";

interface MarkdownPanelMockProps {
	data: MarkdownPanelMockData;
}

export function MarkdownPanelMock({ data }: MarkdownPanelMockProps) {
	return (
		<article className="right-panel-mock right-panel-mock--markdown" data-testid="workspace-panel-markdown">
			<header className="right-panel-mock__doc-header">
				<h2 className="right-panel-mock__doc-heading">{data.heading}</h2>
				<p className="right-panel-mock__doc-path">{data.path}</p>
			</header>
			<pre className="right-panel-mock__markdown">{data.content}</pre>
		</article>
	);
}
