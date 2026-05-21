import type { LiveToolExecution } from "../session/session-state";
import { ToolTimeline } from "./tool-timeline";

interface CodingPanelProps {
	toolExecutions: readonly LiveToolExecution[];
}

export function CodingPanel({ toolExecutions }: CodingPanelProps) {
	if (toolExecutions.length === 0) {
		return null;
	}

	return (
		<aside className="coding-panel" aria-label="Tool timeline">
			<header className="coding-panel__header">
				<h2 className="coding-panel__title">Tools</h2>
				<span className="coding-panel__count">{toolExecutions.length}</span>
			</header>
			<ToolTimeline executions={toolExecutions} />
		</aside>
	);
}
