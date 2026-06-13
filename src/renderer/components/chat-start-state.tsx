import { GitBranch, GitPullRequest, Workflow } from "lucide-react";
import type { ChatShellRoute } from "../chat/chat-view-model";
import { formatComposerFocusKey } from "../chat/composer-focus-key";
import type { ComposerHostProps } from "../chat/composer-host";
import type { LiveSessionState } from "../session/session-state";
import { PlannedAffordance } from "./planned-affordance";
import { Composer } from "./composer";
import { SessionScopeHeader } from "./session-scope-header";

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
	const hasLabels = hasSelectedChatLabels(route);

	return (
		<section className="chat-shell chat-shell--start" aria-labelledby="chat-shell-title">
			<SessionScopeHeader
				variant="centered"
				titleId="chat-shell-title"
				title={getStartTitle(route)}
				resumeLabel={hasLabels ? route.resumeLabel : undefined}
				metadataLabel={hasLabels ? route.metadataLabel : undefined}
			/>
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
				commandPaletteActions={composerHost.commandPaletteActions}
			/>
			<p className="chat-shell__suggestions-heading">Suggested prompts (planned)</p>
			<section className="chat-shell__suggestions" aria-label="Suggested prompts">
				{route.suggestions.map((suggestion, index) => {
					const Icon = suggestionIcons[index] ?? Workflow;
					return (
						<PlannedAffordance key={suggestion} id="start.suggestion" showLabel={false}>
							<div className="chat-shell__suggestion--planned">
								<Icon className="chat-shell__suggestion-icon" aria-hidden="true" />
								<span>{suggestion}</span>
							</div>
						</PlannedAffordance>
					);
				})}
			</section>
		</section>
	);
}
