import type { ChatShellRoute } from "../chat/chat-view-model";
import type { ProjectStateViewResult } from "@/shared/ipc";
import type { LiveSessionState } from "../session/session-state";
import type { TranscriptHydrationState } from "../session/transcript-hydration";
import { ChatShell } from "./chat-shell";

interface ProjectMainProps {
	chatShellRoute: ChatShellRoute;
	statusMessage?: string;
	session: LiveSessionState;
	transcriptHydration: TranscriptHydrationState;
	transcriptScope: { projectId: string | null; chatId: string | null };
	onProjectState: (result: ProjectStateViewResult) => void;
	onSubmitPrompt: (prompt: string) => Promise<boolean> | boolean;
	onAbortSession: () => void;
}

const toProjectStateError = (error: unknown): ProjectStateViewResult => ({
	ok: false,
	error: {
		code: "renderer:project-action-failed",
		message: error instanceof Error ? error.message : "Project action failed.",
	},
});

export function ProjectMain({
	chatShellRoute: route,
	statusMessage,
	session,
	transcriptHydration,
	transcriptScope,
	onProjectState,
	onSubmitPrompt,
	onAbortSession,
}: ProjectMainProps) {
	const runProjectAction = async (action: () => Promise<ProjectStateViewResult>) => {
		try {
			onProjectState(await action());
		} catch (error) {
			onProjectState(toProjectStateError(error));
		}
	};

	const locateFolder = () => {
		if (route.kind !== "unavailable-project") {
			return Promise.resolve();
		}

		return runProjectAction(() =>
			window.piDesktop.project.locateFolder({
				projectId: route.projectId,
			}),
		);
	};

	const removeProject = () => {
		if (route.kind !== "unavailable-project") {
			return;
		}

		if (!window.confirm(`Remove ${route.projectSelectorLabel} from pi-desktop?`)) {
			return;
		}

		void runProjectAction(() =>
			window.piDesktop.project.remove({
				projectId: route.projectId,
			}),
		);
	};

	return (
		<main className="project-main">
			{statusMessage ? <div className="project-main__status-message">{statusMessage}</div> : null}

			{route.kind === "unavailable-project" ? (
				<section className="project-main__recovery" aria-labelledby="project-main-title">
					<div className="project-main__recovery-copy">
						<h1 id="project-main-title" className="project-main__title">
							{route.title}
						</h1>
						<p className="project-main__body">{route.body}</p>
					</div>
					<div className="project-main__recovery-actions">
						<button className="project-main__button" type="button" onClick={() => void locateFolder()}>
							Locate folder
						</button>
						<button
							className="project-main__button project-main__button--danger"
							type="button"
							onClick={removeProject}
						>
							Remove
						</button>
					</div>
				</section>
			) : (
				<ChatShell
					route={route}
					session={session}
					hydration={transcriptHydration}
					scope={transcriptScope}
					onSubmitPrompt={onSubmitPrompt}
					onAbortSession={onAbortSession}
				/>
			)}
		</main>
	);
}
