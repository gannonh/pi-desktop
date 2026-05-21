import { type ChatShellRoute, isResumableChatRoute, shouldUseChatStartLayout } from "../chat/chat-view-model";
import { formatComposerFocusKey } from "../chat/composer-focus-key";
import { useStickToBottomScroll } from "../chat/use-stick-to-bottom-scroll";
import type { ComposerHostProps } from "../chat/composer-host";
import type { LiveSessionState } from "../session/session-state";
import type { TranscriptHydrationState } from "../session/transcript-hydration";
import { ChatStartState } from "./chat-start-state";
import { Composer } from "./composer";
import { TranscriptPanel } from "./transcript-panel";

interface ChatShellProps {
	route: Exclude<ChatShellRoute, { kind: "unavailable-project" }>;
	session: LiveSessionState;
	hydration: TranscriptHydrationState;
	scope: { projectId: string | null; chatId: string | null };
	composerHost: ComposerHostProps;
	onAbortSession: () => void;
}

export function ChatShell({ route, session, hydration, scope, composerHost, onAbortSession }: ChatShellProps) {
	const running =
		session.status === "starting" ||
		session.status === "running" ||
		session.status === "retrying" ||
		session.status === "aborting";
	const abortable = Boolean(session.sessionId) && session.status !== "starting";
	const expectHistory = isResumableChatRoute(route);
	const streamingMessageCount = session.messages.filter((message) => message.streaming).length;
	const lastMessage = session.messages.at(-1);
	const lastMessageKey = lastMessage
		? `${lastMessage.id}:${lastMessage.streaming ? 1 : 0}:${lastMessage.content.length}`
		: "none";

	const composerFocusKey = formatComposerFocusKey(scope);
	const { scrollRef, showJumpToLatest, scrollToBottom, onScroll } = useStickToBottomScroll({
		messageCount: session.messages.length,
		streamingMessageCount,
		lastMessageKey,
		sessionStatus: session.status,
		hydrationStatus: hydration.status,
	});

	if (shouldUseChatStartLayout(route, session)) {
		return (
			<ChatStartState
				route={route}
				session={session}
				scope={scope}
				composerHost={composerHost}
				onAbortSession={onAbortSession}
			/>
		);
	}

	return (
		<section className="chat-shell chat-shell--session" aria-label={route.title}>
			<div className="chat-shell__scroll-wrap">
				<div className="chat-shell__scroll" ref={scrollRef} onScroll={onScroll}>
					<div className="chat-shell__scroll-inner">
						<TranscriptPanel
							session={session}
							hydration={hydration}
							scope={scope}
							expectHistory={expectHistory}
						/>
					</div>
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
					focusKey={composerFocusKey}
					running={running}
					abortable={abortable}
					queuedMessages={session.queuedMessages}
					pendingDelivery={composerHost.pendingComposerDelivery}
					draftText={composerHost.composerDraft}
					onDraftApplied={composerHost.onComposerDraftApplied}
					onSubmit={composerHost.onSubmitPrompt}
					onAbort={onAbortSession}
					onSelectProject={composerHost.onSelectProject}
					onSelectModel={composerHost.onSelectModel}
					onSelectThinkingLevel={composerHost.onSelectThinkingLevel}
					onToggleQueuedDelivery={composerHost.onToggleQueuedDelivery}
					onRemoveQueuedMessage={composerHost.onRemoveQueuedMessage}
					onEditQueuedMessage={composerHost.onEditQueuedMessage}
				/>
			</div>
		</section>
	);
}
