import { LoaderCircle, TriangleAlert } from "lucide-react";
import type { LiveSessionMessage, LiveSessionState } from "../session/session-state";
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

const shouldShowRoleLabel = (messages: readonly LiveSessionMessage[], index: number) =>
	index === 0 || messages[index - 1]?.role !== messages[index]?.role;

export function LiveSessionTranscript({ session }: LiveSessionTranscriptProps) {
	const showStatusStrip =
		session.messages.length > 0 ||
		isActiveStatus(session.status) ||
		Boolean(session.retryMessage) ||
		Boolean(session.errorMessage);
	const showStatusLabel = isActiveStatus(session.status) || session.status === "idle";

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
				{session.messages.map((message, index) => (
					<article
						className={[
							"live-session__message",
							`live-session__message--${message.role}`,
							shouldShowRoleLabel(session.messages, index) ? "" : "live-session__message--grouped",
						]
							.filter(Boolean)
							.join(" ")}
						key={message.id}
					>
						{shouldShowRoleLabel(session.messages, index) ? (
							<div className="live-session__message-role">{roleLabels[message.role]}</div>
						) : null}
						<MessageContent content={message.content} role={message.role} streaming={message.streaming} />
					</article>
				))}
			</div>
		</section>
	);
}
