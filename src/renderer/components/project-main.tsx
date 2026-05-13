import type { ProjectStateViewResult } from "@/shared/ipc";
import type { ProjectStateView } from "@/shared/project-state";
import { createProjectMainCopy } from "../projects/project-view-model";
import { Composer } from "./composer";

interface ProjectMainProps {
	state: ProjectStateView;
	statusMessage?: string;
	onProjectState: (result: ProjectStateViewResult) => void;
}

const runtimeUnavailableReason = "Pi runtime unavailable until Milestone 2.";

const toProjectStateError = (error: unknown): ProjectStateViewResult => ({
	ok: false,
	error: {
		code: "renderer:project-action-failed",
		message: error instanceof Error ? error.message : "Project action failed.",
	},
});

export function ProjectMain({ state, statusMessage, onProjectState }: ProjectMainProps) {
	const copy = createProjectMainCopy(state);

	const runProjectAction = async (action: () => Promise<ProjectStateViewResult>) => {
		try {
			onProjectState(await action());
		} catch (error) {
			onProjectState(toProjectStateError(error));
		}
	};

	const locateFolder = () => {
		if (copy.kind !== "missing-project") {
			return Promise.resolve();
		}

		return runProjectAction(() =>
			window.piDesktop.project.locateFolder({
				projectId: copy.projectId,
			}),
		);
	};

	const removeProject = () => {
		if (copy.kind !== "missing-project") {
			return;
		}

		if (!window.confirm(`Remove ${copy.projectSelectorLabel} from pi-desktop?`)) {
			return;
		}

		void runProjectAction(() =>
			window.piDesktop.project.remove({
				projectId: copy.projectId,
			}),
		);
	};

	return (
		<main className="project-main">
			{statusMessage ? <div className="project-main__status-message">{statusMessage}</div> : null}

			{copy.kind === "missing-project" ? (
				<section className="project-main__recovery" aria-labelledby="project-main-title">
					<div className="project-main__recovery-copy">
						<h1 id="project-main-title" className="project-main__title">
							{copy.title}
						</h1>
						<p className="project-main__body">{copy.body}</p>
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
			) : null}

			{copy.kind === "chat" ? (
				<section className="project-main__chat" aria-labelledby="project-main-title">
					<h1 id="project-main-title" className="project-main__title">
						{copy.title}
					</h1>
					<p className="project-main__body">Chat metadata is ready. Pi message history begins in Milestone 2.</p>
				</section>
			) : null}

			{copy.kind === "global-empty" || copy.kind === "project-empty" ? (
				<section className="project-main__empty" aria-labelledby="project-main-title">
					<h1 id="project-main-title" className="project-main__title">
						{copy.title}
					</h1>
					<Composer projectSelectorLabel={copy.projectSelectorLabel} disabledReason={runtimeUnavailableReason} />
				</section>
			) : null}
		</main>
	);
}
