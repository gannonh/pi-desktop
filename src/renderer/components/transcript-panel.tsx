import { LoaderCircle, TriangleAlert } from "lucide-react";
import type { TranscriptHydrationState } from "../session/transcript-hydration";
import { isTranscriptHydrationForScope } from "../session/transcript-hydration";
import type { LiveSessionState } from "../session/session-state";
import { LiveSessionTranscript } from "./live-session-transcript";

interface TranscriptPanelProps {
	session: LiveSessionState;
	hydration: TranscriptHydrationState;
	scope: { projectId: string | null; chatId: string | null };
	expectHistory: boolean;
}

export function TranscriptPanel({ session, hydration, scope, expectHistory }: TranscriptPanelProps) {
	const hydrationForScope = isTranscriptHydrationForScope(hydration, scope);

	if (expectHistory && hydrationForScope && hydration.status === "loading") {
		return (
			<section className="chat-transcript-placeholder" aria-label="Loading conversation">
				<LoaderCircle className="chat-transcript-placeholder__icon chat-transcript-placeholder__icon--spin" />
				<p className="chat-transcript-placeholder__text">Loading conversation…</p>
			</section>
		);
	}

	if (expectHistory && hydrationForScope && hydration.status === "error") {
		return (
			<section className="chat-transcript-placeholder chat-transcript-placeholder--error" role="alert">
				<TriangleAlert className="chat-transcript-placeholder__icon" />
				<p className="chat-transcript-placeholder__text">
					{hydration.errorMessage || "Unable to load conversation history."}
				</p>
			</section>
		);
	}

	const hasLiveSession = session.status !== "idle" || session.messages.length > 0 || Boolean(session.errorMessage);

	if (hasLiveSession) {
		return <LiveSessionTranscript session={session} />;
	}

	return (
		<section className="chat-shell__empty-chat" aria-label="Empty chat">
			No messages yet.
		</section>
	);
}
