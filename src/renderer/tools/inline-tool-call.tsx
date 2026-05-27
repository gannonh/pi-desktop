import type { LiveToolExecution } from "../session/session-state";
import { previewForInlineToolOutput, renderInlineToolCallModel } from "./inline-tool-call-view-model";

interface InlineToolCallProps {
	execution: LiveToolExecution;
}

const statusLabels: Record<LiveToolExecution["status"], string> = {
	canceled: "Canceled",
	completed: "Completed",
	failed: "Failed",
	running: "Running",
};

export function InlineToolCall({ execution }: InlineToolCallProps) {
	const model = renderInlineToolCallModel(execution);
	const preview = model.output ? previewForInlineToolOutput(model.output) : "";

	return (
		<article
			className={`live-session__tool-call live-session__tool-call--${execution.status}`}
			aria-label={`${execution.toolName} tool call ${statusLabels[execution.status].toLowerCase()}`}
		>
			<div className="live-session__tool-call-header">
				<code className="live-session__tool-call-title">{model.title}</code>
				<span className="live-session__tool-call-status">{statusLabels[execution.status]}</span>
			</div>
			{model.metadata.length > 0 ? (
				<div className="live-session__tool-call-meta">{model.metadata.join(" · ")}</div>
			) : null}
			{preview ? <div className="live-session__tool-call-preview">{preview}</div> : null}
			{model.output ? (
				<details className="live-session__tool-call-details">
					<summary className="live-session__tool-call-summary">
						{execution.isError || execution.status === "failed" ? "Show error output" : "Show output"}
					</summary>
					<pre className={`live-session__tool-call-output live-session__tool-call-output--${model.outputKind}`}>
						{model.output}
					</pre>
				</details>
			) : null}
			{model.warnings.length > 0 ? (
				<div className="live-session__tool-call-warning">{model.warnings.join(" · ")}</div>
			) : null}
		</article>
	);
}
