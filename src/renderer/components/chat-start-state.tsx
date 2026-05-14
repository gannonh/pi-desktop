import { GitBranch, GitPullRequest, Workflow } from "lucide-react";
import type { ChatShellRoute } from "../chat/chat-view-model";
import { Composer } from "./composer";

type StartRoute = Extract<ChatShellRoute, { kind: "global-start" | "project-start" }>;

const suggestionIcons = [GitPullRequest, GitBranch, Workflow] as const;

export function ChatStartState({ route }: { route: StartRoute }) {
	return (
		<section className="chat-shell chat-shell--start" aria-labelledby="chat-shell-title">
			<h1 id="chat-shell-title" className="chat-shell__title">
				{route.title}
			</h1>
			<Composer context={route.composer} layout="center" />
			<div className="chat-shell__suggestions" aria-label="Suggested prompts">
				{route.suggestions.map((suggestion, index) => {
					const Icon = suggestionIcons[index] ?? Workflow;
					return (
						<button className="chat-shell__suggestion" type="button" key={suggestion} disabled>
							<Icon className="chat-shell__suggestion-icon" />
							<span>{suggestion}</span>
						</button>
					);
				})}
			</div>
		</section>
	);
}
