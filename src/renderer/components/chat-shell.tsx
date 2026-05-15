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

export function ChatShell({ route, session, onSubmitPrompt, onAbortSession }: ChatShellProps) {
	const running =
		session.status === "starting" ||
		session.status === "running" ||
		session.status === "retrying" ||
		session.status === "aborting";

	if (route.kind === "global-start" || route.kind === "project-start") {
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
				<h1 id="chat-shell-title" className="chat-shell__session-title">
					{route.title}
				</h1>
			</header>
			<div className="chat-shell__scroll">
				{session.messages.length > 0 || session.errorMessage ? (
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
					onSubmit={onSubmitPrompt}
					onAbort={onAbortSession}
				/>
			</div>
		</section>
	);
}
