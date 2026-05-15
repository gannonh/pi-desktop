import { GitBranch, GitPullRequest, Workflow } from "lucide-react";
import type { ChatShellRoute } from "../chat/chat-view-model";
import type { LiveSessionState } from "../session/session-state";
import { Composer } from "./composer";
import { LiveSessionTranscript } from "./live-session-transcript";

type StartRoute = Extract<ChatShellRoute, { kind: "global-start" | "project-start" }>;

const suggestionIcons = [GitPullRequest, GitBranch, Workflow] as const;

interface ChatStartStateProps {
	route: StartRoute;
	session: LiveSessionState;
	onSubmitPrompt: (prompt: string) => Promise<boolean> | boolean;
	onAbortSession: () => void;
}

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
			<h1 id="chat-shell-title" className="chat-shell__title">
				{route.title}
			</h1>
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
