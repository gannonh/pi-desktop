import { LoaderCircle, TriangleAlert } from "lucide-react";
import { hasLiveSession } from "../chat/chat-view-model";
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
	const liveSessionActive = hasLiveSession(session);

	if (liveSessionActive) {
		return <LiveSessionTranscript session={session} />;
	}

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

	return (
		<section className="chat-shell__empty-chat" aria-label="Empty chat">
			<p className="chat-transcript-placeholder__text">No messages yet.</p>
			<p className="chat-transcript-placeholder__hint">Send a message below to start this session.</p>
		</section>
	);
}
