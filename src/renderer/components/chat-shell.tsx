import type { ChatShellRoute } from "../chat/chat-view-model";
import type { LiveSessionState } from "../session/session-state";
import { ChatStartState } from "./chat-start-state";
import { ChatTranscript } from "./chat-transcript";
import { Composer } from "./composer";
import { LiveSessionTranscript } from "./live-session-transcript";

interface ChatShellProps {
	route: Exclude<ChatShellRoute, { kind: "unavailable-project" }>;
	session: LiveSessionState;
	onSubmitPrompt: (prompt: string) => Promise<boolean> | boolean;
	onAbortSession: () => void;
}

const hasSelectedChatLabels = (
	route: Exclude<ChatShellRoute, { kind: "unavailable-project" }>,
): route is Extract<ChatShellRoute, { kind: "standalone-start" | "empty-chat" | "continued-chat" }> =>
	"resumeLabel" in route && "metadataLabel" in route;

export function ChatShell({ route, session, onSubmitPrompt, onAbortSession }: ChatShellProps) {
	const running =
		session.status === "starting" ||
		session.status === "running" ||
		session.status === "retrying" ||
		session.status === "aborting";
	const abortable = Boolean(session.sessionId) && session.status !== "starting";
	const hasLiveSession = session.status !== "idle" || session.messages.length > 0 || Boolean(session.errorMessage);

	if (
		!hasLiveSession &&
		(route.kind === "global-start" || route.kind === "project-start" || route.kind === "standalone-start")
	) {
		return (
			<ChatStartState
				route={route}
				session={session}
				onSubmitPrompt={onSubmitPrompt}
				onAbortSession={onAbortSession}
			/>
		);
	}

	if (route.kind === "empty-chat" && !hasLiveSession) {
		return (
			<ChatStartState
				route={route}
				session={session}
				onSubmitPrompt={onSubmitPrompt}
				onAbortSession={onAbortSession}
			/>
		);
	}

	return (
		<section className="chat-shell chat-shell--session" aria-labelledby="chat-shell-title">
			<header className="chat-shell__metadata">
				<div className="chat-shell__metadata-copy">
					<h1 id="chat-shell-title" className="chat-shell__session-title">
						{route.title}
					</h1>
					{hasSelectedChatLabels(route) ? (
						<section className="chat-shell__session-labels" aria-label="Session metadata">
							<span className="chat-shell__resume-label">{route.resumeLabel}</span>
							<span className="chat-shell__metadata-label">{route.metadataLabel}</span>
						</section>
					) : null}
				</div>
			</header>
			<div className="chat-shell__scroll">
				{hasLiveSession ? (
					<LiveSessionTranscript session={session} />
				) : route.kind === "continued-chat" ? (
					<ChatTranscript title={route.title} transcript={route.transcript} />
				) : (
					<section className="chat-shell__empty-chat" aria-label="Empty chat">
						No messages yet.
					</section>
				)}
			</div>
			<div className="chat-shell__bottom-composer">
				<Composer
					context={route.composer}
					layout="bottom"
					running={running}
					abortable={abortable}
					onSubmit={onSubmitPrompt}
					onAbort={onAbortSession}
				/>
			</div>
		</section>
	);
}
