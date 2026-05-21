import type { TerminalPanelMockData } from "./right-panel-mock-data";

interface TerminalPanelMockProps {
	data: TerminalPanelMockData;
}

export function TerminalPanelMock({ data }: TerminalPanelMockProps) {
	return (
		<div className="right-panel-mock right-panel-mock--terminal">
			<div className="right-panel-mock__meta">
				<span className="right-panel-mock__label">cwd</span>
				<span className="right-panel-mock__value">{data.cwd}</span>
			</div>
			<div className="right-panel-mock__terminal-line">
				<span className="right-panel-mock__prompt">{data.prompt}</span>
			</div>
			<pre className="right-panel-mock__output">{data.output}</pre>
		</div>
	);
}
