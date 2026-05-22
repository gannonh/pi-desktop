import type { LiveToolExecution } from "../session/session-state";
import { ToolTimelineItem } from "./tool-timeline-item";

interface ToolTimelineProps {
	executions: readonly LiveToolExecution[];
}

export function ToolTimeline({ executions }: ToolTimelineProps) {
	return (
		<ol className="tool-timeline">
			{executions.map((execution) => (
				<li className="tool-timeline__item" key={execution.id}>
					<ToolTimelineItem execution={execution} />
				</li>
			))}
		</ol>
	);
}
