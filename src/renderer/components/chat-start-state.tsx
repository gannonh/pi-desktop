import { GitBranch, GitPullRequest, Workflow } from "lucide-react";
import type { ChatShellRoute } from "../chat/chat-view-model";
import { formatComposerFocusKey } from "../chat/composer-focus-key";
import type { ComposerHostProps } from "../chat/composer-host";
import type { LiveSessionState } from "../session/session-state";
import { Composer } from "./composer";

type StartRoute = Extract<
	ChatShellRoute,
	{ kind: "global-start" | "project-start" | "standalone-start" | "empty-chat" }
>;

const suggestionIcons = [GitPullRequest, GitBranch, Workflow] as const;

interface ChatStartStateProps {
	route: StartRoute;
	session: LiveSessionState;
	scope: { projectId: string | null; chatId: string | null };
	composerHost: ComposerHostProps;
	onAbortSession: () => void;
}

const hasSelectedChatLabels = (
	route: StartRoute,
): route is Extract<StartRoute, { kind: "standalone-start" | "empty-chat" }> =>
	"resumeLabel" in route && "metadataLabel" in route;

const getStartTitle = (route: StartRoute) => (route.kind === "empty-chat" ? route.startTitle : route.title);

export function ChatStartState({ route, session, scope, composerHost, onAbortSession }: ChatStartStateProps) {
	const composerFocusKey = formatComposerFocusKey(scope);
	const running =
		session.status === "starting" ||
		session.status === "running" ||
		session.status === "retrying" ||
		session.status === "aborting";
	const abortable = Boolean(session.sessionId) && session.status !== "starting";

	return (
		<section className="chat-shell chat-shell--start" aria-labelledby="chat-shell-title">
			<div className="chat-shell__start-heading">
				<h1 id="chat-shell-title" className="chat-shell__title">
					{getStartTitle(route)}
				</h1>
				{hasSelectedChatLabels(route) ? (
					<section
						className="chat-shell__session-labels chat-shell__session-labels--centered"
						aria-label="Session metadata"
					>
						<span className="chat-shell__resume-label">{route.resumeLabel}</span>
						<span className="chat-shell__metadata-label">{route.metadataLabel}</span>
					</section>
				) : null}
			</div>
			<Composer
				context={route.composer}
				layout="center"
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
				commandPaletteDeps={composerHost.commandPaletteDeps}
			/>
			<section className="chat-shell__suggestions" aria-label="Suggested prompts">
				{route.suggestions.map((suggestion, index) => {
					const Icon = suggestionIcons[index] ?? Workflow;
					return (
						<button className="chat-shell__suggestion" type="button" key={suggestion} disabled>
							<Icon className="chat-shell__suggestion-icon" />
							<span>{suggestion}</span>
						</button>
					);
				})}
			</section>
		</section>
	);
}
