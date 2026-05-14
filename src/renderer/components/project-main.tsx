import { createChatShellRoute } from "../chat/chat-view-model";
import type { ProjectStateViewResult } from "@/shared/ipc";
import type { ProjectStateView } from "@/shared/project-state";
import { ChatShell } from "./chat-shell";

interface ProjectMainProps {
	state: ProjectStateView;
	statusMessage?: string;
	onProjectState: (result: ProjectStateViewResult) => void;
}

const toProjectStateError = (error: unknown): ProjectStateViewResult => ({
	ok: false,
	error: {
		code: "renderer:project-action-failed",
		message: error instanceof Error ? error.message : "Project action failed.",
	},
});

export function ProjectMain({ state, statusMessage, onProjectState }: ProjectMainProps) {
	const route = createChatShellRoute(state);

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
				<ChatShell route={route} />
			)}
		</main>
	);
}
