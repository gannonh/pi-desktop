import { LoaderCircle, TriangleAlert } from "lucide-react";
import type { LiveSessionMessage, LiveSessionState, LiveToolExecution } from "../session/session-state";
import { InlineToolCall } from "../tools/inline-tool-call";
import { MessageContent } from "./message-content";

interface LiveSessionTranscriptProps {
	session: LiveSessionState;
}

const roleLabels: Record<LiveSessionMessage["role"], string> = {
	assistant: "Pi",
	system: "System",
	tool: "Tool",
	user: "You",
};

const isActiveStatus = (status: LiveSessionState["status"]) =>
	status === "starting" || status === "running" || status === "retrying" || status === "aborting";

type TranscriptItem =
	| {
			kind: "message";
			message: LiveSessionMessage;
			order: number;
			sequence: number | undefined;
			sortAt: string | undefined;
	  }
	| {
			kind: "tool";
			execution: LiveToolExecution;
			order: number;
			sequence: number | undefined;
			sortAt: string;
	  };

const shouldShowRoleLabel = (items: readonly TranscriptItem[], index: number) => {
	const item = items[index];
	const previous = items[index - 1];
	return item?.kind === "message" && (previous?.kind !== "message" || previous.message.role !== item.message.role);
};

const sortTimestamp = (value: string | undefined): number | undefined => {
	if (!value) {
		return undefined;
	}
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? undefined : parsed;
};

const sequenceOrderFor = (item: TranscriptItem): number => item.sequence ?? item.order;

const compareTranscriptItems = (left: TranscriptItem, right: TranscriptItem): number => {
	const leftTimestamp = sortTimestamp(left.sortAt);
	const rightTimestamp = sortTimestamp(right.sortAt);
	const bothTimestamped = leftTimestamp !== undefined && rightTimestamp !== undefined;

	if (bothTimestamped && leftTimestamp !== rightTimestamp) {
		return leftTimestamp - rightTimestamp;
	}
	if (bothTimestamped && left.sequence !== right.sequence) {
		return sequenceOrderFor(left) - sequenceOrderFor(right);
	}
	return left.order - right.order;
};

const buildTranscriptItems = (session: LiveSessionState): TranscriptItem[] => {
	const renderedToolCallIds = new Set(session.toolExecutions.map((execution) => execution.id));
	const messages: TranscriptItem[] = session.messages
		.filter(
			(message) => !(message.role === "tool" && message.toolCallId && renderedToolCallIds.has(message.toolCallId)),
		)
		.map((message, index) => ({
			kind: "message",
			message,
			order: index,
			sequence: message.sequence,
			sortAt: message.receivedAt,
		}));
	const tools: TranscriptItem[] = session.toolExecutions.map((execution, index) => ({
		kind: "tool",
		execution,
		order: session.messages.length + index,
		sequence: execution.sequence,
		sortAt: execution.startedAt,
	}));

	return [...messages, ...tools].sort(compareTranscriptItems);
};

export function LiveSessionTranscript({ session }: LiveSessionTranscriptProps) {
	const showStatusStrip =
		session.messages.length > 0 ||
		isActiveStatus(session.status) ||
		Boolean(session.retryMessage) ||
		Boolean(session.errorMessage);
	const showStatusLabel = isActiveStatus(session.status) || session.status === "idle";
	const transcriptItems = buildTranscriptItems(session);

	return (
		<section className="live-session" aria-label="Pi session transcript">
			{showStatusStrip ? (
				<div className="live-session__status-strip" aria-live="polite">
					{showStatusLabel ? (
						<div className="live-session__status">
							{isActiveStatus(session.status) ? (
								<LoaderCircle className="live-session__status-icon live-session__status-icon--spin" />
							) : null}
							<span>{session.statusLabel}</span>
						</div>
					) : null}
					{session.retryMessage ? <div className="live-session__notice">{session.retryMessage}</div> : null}
					{session.errorMessage ? (
						<div className="live-session__error" role="alert">
							<TriangleAlert className="live-session__status-icon" />
							<span>{session.errorMessage}</span>
						</div>
					) : null}
				</div>
			) : null}
			<div className="live-session__messages">
				{transcriptItems.map((item, index) => {
					if (item.kind === "tool") {
						return <InlineToolCall execution={item.execution} key={`tool:${item.execution.id}`} />;
					}

					const { message } = item;
					const showRoleLabel = shouldShowRoleLabel(transcriptItems, index);
					return (
						<article
							className={[
								"live-session__message",
								`live-session__message--${message.role}`,
								showRoleLabel ? "" : "live-session__message--grouped",
							]
								.filter(Boolean)
								.join(" ")}
							key={message.id}
						>
							{showRoleLabel ? (
								<div className="live-session__message-role">{roleLabels[message.role]}</div>
							) : null}
							<MessageContent content={message.content} role={message.role} streaming={message.streaming} />
						</article>
					);
				})}
			</div>
		</section>
	);
}
