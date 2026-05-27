import { extractTextFromPiContent } from "../../shared/pi-session-content";
import type { LiveToolExecution } from "../session/session-state";

interface InlineToolCallProps {
	execution: LiveToolExecution;
}

type ToolRenderModel = {
	title: string;
	metadata: string[];
	output: string;
	outputKind?: "diff" | "terminal" | "text";
	warnings?: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const stringField = (value: unknown, key: string): string | undefined => {
	if (!isRecord(value) || typeof value[key] !== "string") {
		return undefined;
	}
	const text = value[key].trim();
	return text.length > 0 ? text : undefined;
};

const numberField = (value: unknown, key: string): number | undefined => {
	if (!isRecord(value) || typeof value[key] !== "number" || !Number.isFinite(value[key])) {
		return undefined;
	}
	return value[key];
};

const detailsFrom = (value: unknown): Record<string, unknown> => {
	if (!isRecord(value) || !isRecord(value.details)) {
		return {};
	}
	return value.details;
};

const textFromResult = (value: unknown): string => {
	if (typeof value === "string") {
		return value.trim();
	}
	if (!isRecord(value)) {
		return "";
	}
	return extractTextFromPiContent(value.content).trim();
};

const jsonPreview = (value: unknown): string => {
	if (value === null || value === undefined) {
		return "";
	}
	if (typeof value === "string") {
		return value.trim();
	}
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
};

const outputFor = (execution: LiveToolExecution): string => {
	return textFromResult(execution.result) || textFromResult(execution.partialResult);
};

const warningsFor = (details: Record<string, unknown>): string[] => {
	const warnings: string[] = [];
	if (details.matchLimitHit || details.matchLimitReached) {
		warnings.push("Match limit reached");
	}
	if (details.resultLimitHit || details.resultLimitReached || details.limitHit || details.limitReached) {
		warnings.push("Result limit reached");
	}
	if (details.entryLimitHit || details.entryLimitReached) {
		warnings.push("Entry limit reached");
	}
	if (details.lineLimitHit || details.linesTruncated) {
		warnings.push("Line limit reached");
	}
	const truncation = isRecord(details.truncation) ? details.truncation : {};
	if (details.truncated || details.bytesTruncated || details.byteLimitHit || truncation.truncated) {
		warnings.push("Output truncated");
	}
	if (typeof details.fullOutputPath === "string" && details.fullOutputPath.trim().length > 0) {
		warnings.push(`Full output: ${details.fullOutputPath.trim()}`);
	}
	return warnings;
};

const renderBash = (execution: LiveToolExecution): ToolRenderModel => {
	const command = stringField(execution.args, "command") ?? "bash";
	const timeout = numberField(execution.args, "timeout");
	return {
		title: `$ ${command}`,
		metadata: timeout ? [`timeout ${timeout}s`] : [],
		output: outputFor(execution),
		outputKind: "terminal",
		warnings: warningsFor(detailsFrom(execution.result)),
	};
};

const renderRead = (execution: LiveToolExecution): ToolRenderModel => {
	const path = stringField(execution.args, "path") ?? "<unknown>";
	const offset = numberField(execution.args, "offset");
	const limit = numberField(execution.args, "limit");
	const start = offset ?? (limit !== undefined ? 1 : undefined);
	const range =
		start !== undefined && limit !== undefined
			? `:${start}-${start + limit - 1}`
			: start !== undefined
				? `:${start}`
				: "";
	return {
		title: `read ${path}${range}`,
		metadata: [],
		output: outputFor(execution),
		outputKind: "text",
		warnings: warningsFor(detailsFrom(execution.result)),
	};
};

const renderEdit = (execution: LiveToolExecution): ToolRenderModel => {
	const path = stringField(execution.args, "path") ?? "<unknown>";
	const details = detailsFrom(execution.result);
	return {
		title: `edit ${path}`,
		metadata: [],
		output: typeof details.diff === "string" ? details.diff : outputFor(execution),
		outputKind: "diff",
		warnings: warningsFor(details),
	};
};

const renderWrite = (execution: LiveToolExecution): ToolRenderModel => {
	const path = stringField(execution.args, "path") ?? "<unknown>";
	return {
		title: `write ${path}`,
		metadata: [],
		output: stringField(execution.args, "content") ?? outputFor(execution),
		outputKind: "text",
		warnings: warningsFor(detailsFrom(execution.result)),
	};
};

const renderGrep = (execution: LiveToolExecution): ToolRenderModel => {
	const pattern = stringField(execution.args, "pattern") ?? "<pattern>";
	const path = stringField(execution.args, "path") ?? ".";
	const glob = stringField(execution.args, "glob");
	const limit = numberField(execution.args, "limit");
	return {
		title: `grep /${pattern}/ in ${path}`,
		metadata: [glob ? `glob ${glob}` : "", limit ? `limit ${limit}` : ""].filter(Boolean),
		output: outputFor(execution),
		outputKind: "text",
		warnings: warningsFor(detailsFrom(execution.result)),
	};
};

const renderFind = (execution: LiveToolExecution): ToolRenderModel => {
	const pattern = stringField(execution.args, "pattern") ?? "<pattern>";
	const path = stringField(execution.args, "path") ?? ".";
	const limit = numberField(execution.args, "limit");
	return {
		title: `find ${pattern} in ${path}`,
		metadata: limit ? [`limit ${limit}`] : [],
		output: outputFor(execution),
		outputKind: "text",
		warnings: warningsFor(detailsFrom(execution.result)),
	};
};

const renderLs = (execution: LiveToolExecution): ToolRenderModel => {
	const path = stringField(execution.args, "path") ?? ".";
	const limit = numberField(execution.args, "limit");
	return {
		title: `ls ${path}`,
		metadata: limit ? [`limit ${limit}`] : [],
		output: outputFor(execution),
		outputKind: "text",
		warnings: warningsFor(detailsFrom(execution.result)),
	};
};

const renderGeneric = (execution: LiveToolExecution): ToolRenderModel => {
	const input = jsonPreview(execution.args);
	const output = outputFor(execution) || jsonPreview(execution.result);
	return {
		title: execution.toolName,
		metadata: [],
		output: [input ? `Input:\n${input}` : "", output ? `Output:\n${output}` : ""].filter(Boolean).join("\n\n"),
		outputKind: "text",
		warnings: warningsFor(detailsFrom(execution.result)),
	};
};

const renderModelFor = (execution: LiveToolExecution): ToolRenderModel => {
	switch (execution.toolName) {
		case "bash":
			return renderBash(execution);
		case "read":
			return renderRead(execution);
		case "edit":
			return renderEdit(execution);
		case "write":
			return renderWrite(execution);
		case "grep":
			return renderGrep(execution);
		case "find":
			return renderFind(execution);
		case "ls":
			return renderLs(execution);
		default:
			return renderGeneric(execution);
	}
};

const statusLabels: Record<LiveToolExecution["status"], string> = {
	canceled: "Canceled",
	completed: "Completed",
	failed: "Failed",
	running: "Running",
};

const previewFor = (output: string): string => {
	const firstLine = output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.find(Boolean);
	if (!firstLine) {
		return "";
	}
	return firstLine.length > 160 ? `${firstLine.slice(0, 159)}…` : firstLine;
};

export function InlineToolCall({ execution }: InlineToolCallProps) {
	const model = renderModelFor(execution);
	const preview = model.output ? previewFor(model.output) : "";

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
					<pre
						className={`live-session__tool-call-output live-session__tool-call-output--${model.outputKind ?? "text"}`}
					>
						{model.output}
					</pre>
				</details>
			) : null}
			{model.warnings?.length ? (
				<div className="live-session__tool-call-warning">{model.warnings.join(" · ")}</div>
			) : null}
		</article>
	);
}
