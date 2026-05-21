import type { DiffsPanelMockData } from "./right-panel-mock-data";

interface DiffsPanelMockProps {
	data: DiffsPanelMockData;
}

export function DiffsPanelMock({ data }: DiffsPanelMockProps) {
	return (
		<div className="right-panel-mock right-panel-mock--diffs">
			<header className="right-panel-mock__pr-header">
				<h2 className="right-panel-mock__pr-title">{data.prTitle}</h2>
				<p className="right-panel-mock__pr-status">{data.status}</p>
			</header>
			<section className="right-panel-mock__section">
				<h3 className="right-panel-mock__section-title">Checks</h3>
				<ul className="right-panel-mock__checks">
					{data.checks.map((check) => (
						<li key={check.name} className={`right-panel-mock__check right-panel-mock__check--${check.status}`}>
							<span>{check.name}</span>
							<span>{check.status}</span>
						</li>
					))}
				</ul>
			</section>
			<section className="right-panel-mock__section">
				<h3 className="right-panel-mock__section-title">Changed files</h3>
				<ul className="right-panel-mock__file-list">
					{data.changedFiles.map((file) => (
						<li key={file}>{file}</li>
					))}
				</ul>
			</section>
			<section className="right-panel-mock__section">
				<h3 className="right-panel-mock__section-title">Diff summary</h3>
				<ul className="right-panel-mock__diff-rows">
					{data.summaryRows.map((row) => (
						<li key={row.path} className="right-panel-mock__diff-row">
							<span className="right-panel-mock__diff-path">{row.path}</span>
							<span className="right-panel-mock__diff-stats">
								+{row.additions} −{row.deletions}
							</span>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
