import type { ChatShellRoute } from "../chat/chat-view-model";
import { useStickToBottomScroll } from "../chat/use-stick-to-bottom-scroll";
import type { TranscriptHydrationState } from "../session/transcript-hydration";
import type { LiveSessionState } from "../session/session-state";
import { ChatStartState } from "./chat-start-state";
import { Composer } from "./composer";
import { TranscriptPanel } from "./transcript-panel";

interface ChatShellProps {
	route: Exclude<ChatShellRoute, { kind: "unavailable-project" }>;
	session: LiveSessionState;
	hydration: TranscriptHydrationState;
	scope: { projectId: string | null; chatId: string | null };
	onSubmitPrompt: (prompt: string) => Promise<boolean> | boolean;
	onAbortSession: () => void;
}

const hasSelectedChatLabels = (
	route: Exclude<ChatShellRoute, { kind: "unavailable-project" }>,
): route is Extract<ChatShellRoute, { kind: "standalone-start" | "empty-chat" }> =>
	"resumeLabel" in route && "metadataLabel" in route;

const isResumableChatRoute = (route: Exclude<ChatShellRoute, { kind: "unavailable-project" }>) =>
	(route.kind === "empty-chat" || route.kind === "standalone-start") && route.resumeLabel === "Resume session";

export function ChatShell({ route, session, hydration, scope, onSubmitPrompt, onAbortSession }: ChatShellProps) {
	const running =
		session.status === "starting" ||
		session.status === "running" ||
		session.status === "retrying" ||
		session.status === "aborting";
	const abortable = Boolean(session.sessionId) && session.status !== "starting";
	const hasLiveSession = session.status !== "idle" || session.messages.length > 0 || Boolean(session.errorMessage);
	const expectHistory = isResumableChatRoute(route);
	const streamingMessageCount = session.messages.filter((message) => message.streaming).length;

	const { scrollRef, showJumpToLatest, scrollToBottom, onScroll } = useStickToBottomScroll({
		messageCount: session.messages.length,
		streamingMessageCount,
		sessionStatus: session.status,
		hydrationStatus: hydration.status,
	});

	const useStartLayout =
		!hasLiveSession &&
		!isResumableChatRoute(route) &&
		(route.kind === "global-start" ||
			route.kind === "project-start" ||
			route.kind === "standalone-start" ||
			(route.kind === "empty-chat" && route.resumeLabel === "Start session"));

	if (useStartLayout) {
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
			<div className="chat-shell__scroll-wrap">
				<div className="chat-shell__scroll" ref={scrollRef} onScroll={onScroll}>
					<TranscriptPanel session={session} hydration={hydration} scope={scope} expectHistory={expectHistory} />
				</div>
				{showJumpToLatest ? (
					<button className="chat-shell__jump-to-latest" type="button" onClick={scrollToBottom}>
						Jump to latest
					</button>
				) : null}
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
