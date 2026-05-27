import { useState } from "react";
import type { LiveToolExecution } from "../session/session-state";
import {
	formatToolPayload,
	formatToolTimestamp,
	getTerminalOutputText,
	getToolOutputText,
	isTerminalTool,
	summarizeToolArgs,
	summarizeToolResult,
} from "../tools/tool-timeline-view-model";

interface ToolTimelineItemProps {
	execution: LiveToolExecution;
}

const statusLabels: Record<LiveToolExecution["status"], string> = {
	running: "Running",
	completed: "Completed",
	failed: "Failed",
	canceled: "Canceled",
};

export function ToolTimelineItem({ execution }: ToolTimelineItemProps) {
	const [expanded, setExpanded] = useState(false);
	const inputSummary = summarizeToolArgs(execution.toolName, execution.args);
	const resultSource = execution.result ?? execution.partialResult;
	const resultSummary = summarizeToolResult(execution.toolName, resultSource, execution.isError);
	const showTerminal =
		expanded && isTerminalTool(execution.toolName, execution.args, execution.result ?? execution.partialResult);
	const terminalText = showTerminal
		? getTerminalOutputText(execution.args, execution.result ?? execution.partialResult)
		: "";
	const rawOutput =
		expanded && !showTerminal
			? getToolOutputText(execution.toolName, execution.result ?? execution.partialResult)
			: "";

	return (
		<article className={`tool-timeline-item tool-timeline-item--${execution.status}`}>
			<div className="tool-timeline-item__header">
				<div className="tool-timeline-item__title-row">
					<h3 className="tool-timeline-item__name">{execution.toolName}</h3>
					<span className="tool-timeline-item__status">{statusLabels[execution.status]}</span>
				</div>
				<time className="tool-timeline-item__timestamp" dateTime={execution.updatedAt}>
					{formatToolTimestamp(execution.updatedAt)}
				</time>
			</div>
			<p className="tool-timeline-item__summary">
				<span className="tool-timeline-item__summary-label">Input</span> {inputSummary}
			</p>
			<p className="tool-timeline-item__summary">
				<span className="tool-timeline-item__summary-label">Result</span> {resultSummary}
			</p>
			<button
				className="tool-timeline-item__toggle"
				type="button"
				aria-expanded={expanded}
				onClick={() => setExpanded((value) => !value)}
			>
				{expanded ? "Hide details" : "Show details"}
			</button>
			{expanded ? (
				<div className="tool-timeline-item__details">
					<section className="tool-timeline-item__detail-block">
						<h4 className="tool-timeline-item__detail-label">Raw input</h4>
						<pre className="tool-timeline-item__detail-body">{formatToolPayload(execution.args)}</pre>
					</section>
					{showTerminal ? (
						<section className="tool-timeline-item__detail-block">
							<h4 className="tool-timeline-item__detail-label">Terminal output</h4>
							<pre className="tool-timeline-item__terminal">{terminalText}</pre>
						</section>
					) : (
						<section className="tool-timeline-item__detail-block">
							<h4 className="tool-timeline-item__detail-label">Raw output</h4>
							<pre className="tool-timeline-item__detail-body">{rawOutput || "Unavailable"}</pre>
						</section>
					)}
				</div>
			) : null}
		</article>
	);
}
