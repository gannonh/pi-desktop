import type { BrowserPanelMockData } from "./right-panel-mock-data";

interface BrowserPanelMockProps {
	data: BrowserPanelMockData;
}

export function BrowserPanelMock({ data }: BrowserPanelMockProps) {
	return (
		<div className="right-panel-mock right-panel-mock--browser">
			<div className="right-panel-mock__toolbar" role="toolbar" aria-label="Browser controls">
				<button type="button" className="right-panel-mock__toolbar-button" disabled>
					Back
				</button>
				<button type="button" className="right-panel-mock__toolbar-button" disabled>
					Forward
				</button>
				<button type="button" className="right-panel-mock__toolbar-button" disabled>
					Reload
				</button>
				<input className="right-panel-mock__url" type="text" readOnly value={data.url} aria-label="URL" />
			</div>
			<div className="right-panel-mock__browser-preview">
				<p className="right-panel-mock__browser-title">{data.title}</p>
				<p className="right-panel-mock__browser-placeholder">Page preview placeholder</p>
			</div>
		</div>
	);
}
