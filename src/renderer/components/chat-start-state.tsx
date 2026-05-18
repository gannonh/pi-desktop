import { GitBranch, GitPullRequest, Workflow } from "lucide-react";
import type { ChatShellRoute } from "../chat/chat-view-model";
import type { LiveSessionState } from "../session/session-state";
import { Composer } from "./composer";
import { LiveSessionTranscript } from "./live-session-transcript";

type StartRoute = Extract<
	ChatShellRoute,
	{ kind: "global-start" | "project-start" | "standalone-start" | "empty-chat" }
>;

const suggestionIcons = [GitPullRequest, GitBranch, Workflow] as const;

interface ChatStartStateProps {
	route: StartRoute;
	session: LiveSessionState;
	onSubmitPrompt: (prompt: string) => Promise<boolean> | boolean;
	onAbortSession: () => void;
}

const hasSelectedChatLabels = (
	route: StartRoute,
): route is Extract<StartRoute, { kind: "standalone-start" | "empty-chat" }> =>
	"resumeLabel" in route && "metadataLabel" in route;

const getStartTitle = (route: StartRoute) => (route.kind === "empty-chat" ? route.startTitle : route.title);

export function ChatStartState({ route, session, onSubmitPrompt, onAbortSession }: ChatStartStateProps) {
	const running =
		session.status === "starting" ||
		session.status === "running" ||
		session.status === "retrying" ||
		session.status === "aborting";
	const abortable = Boolean(session.sessionId) && session.status !== "starting";
	const hasLiveSession = session.status !== "idle" || session.messages.length > 0 || Boolean(session.errorMessage);

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
				running={running}
				abortable={abortable}
				onSubmit={onSubmitPrompt}
				onAbort={onAbortSession}
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
			{hasLiveSession ? <LiveSessionTranscript session={session} /> : null}
		</section>
	);
}
