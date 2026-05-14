import type { ChatShellRoute } from "../chat/chat-view-model";
import { ChatStartState } from "./chat-start-state";
import { ChatTranscript } from "./chat-transcript";
import { Composer } from "./composer";

interface ChatShellProps {
	route: Exclude<ChatShellRoute, { kind: "unavailable-project" }>;
}

export function ChatShell({ route }: ChatShellProps) {
	if (route.kind === "global-start" || route.kind === "project-start") {
		return <ChatStartState route={route} />;
	}

	return (
		<section className="chat-shell chat-shell--session" aria-labelledby="chat-shell-title">
			<header className="chat-shell__metadata">
				<h1 id="chat-shell-title" className="chat-shell__session-title">
					{route.title}
				</h1>
			</header>
			<div className="chat-shell__scroll">
				{route.kind === "continued-chat" ? (
					<ChatTranscript title={route.title} transcript={route.transcript} />
				) : (
					<section className="chat-shell__empty-chat" aria-label="Empty chat">
						No messages yet.
					</section>
				)}
			</div>
			<div className="chat-shell__bottom-composer">
				<Composer context={route.composer} layout="bottom" />
			</div>
		</section>
	);
}
