import { LoaderCircle, TriangleAlert } from "lucide-react";
import type { LiveSessionState } from "../session/session-state";

interface LiveSessionTranscriptProps {
	session: LiveSessionState;
}

export function LiveSessionTranscript({ session }: LiveSessionTranscriptProps) {
	return (
		<section className="live-session" aria-label="Pi session transcript">
			<div className="live-session__status" aria-live="polite">
				{session.status === "running" || session.status === "retrying" || session.status === "aborting" ? (
					<LoaderCircle className="live-session__status-icon live-session__status-icon--spin" />
				) : null}
				<span>{session.statusLabel}</span>
			</div>
			{session.retryMessage ? <div className="live-session__notice">{session.retryMessage}</div> : null}
			{session.errorMessage ? (
				<div className="live-session__error" role="alert">
					<TriangleAlert className="live-session__status-icon" />
					<span>{session.errorMessage}</span>
				</div>
			) : null}
			<div className="live-session__messages">
				{session.messages.map((message) => (
					<article className={`live-session__message live-session__message--${message.role}`} key={message.id}>
						<div className="live-session__message-role">{message.role === "assistant" ? "Pi" : "You"}</div>
						<div className="live-session__message-content">
							{message.content}
							{message.streaming ? (
								<span className="live-session__cursor" role="status" aria-label="Streaming" />
							) : null}
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
