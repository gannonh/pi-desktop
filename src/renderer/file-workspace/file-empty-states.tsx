import type { ProjectRecord } from "../../shared/project-state";

interface FileEmptyStatesProps {
	project: ProjectRecord | null;
}

export function FileEmptyStates({ project }: FileEmptyStatesProps) {
	if (!project) {
		return (
			<div className="file-workspace__empty" data-testid="file-workspace-no-project">
				<h2 className="file-workspace__empty-title">Select a project</h2>
				<p className="file-workspace__empty-copy">Choose a project in the sidebar to browse its files.</p>
			</div>
		);
	}

	if (project.availability.status === "missing") {
		return (
			<div className="file-workspace__empty" data-testid="file-workspace-missing-project">
				<h2 className="file-workspace__empty-title">Project folder missing</h2>
				<p className="file-workspace__empty-copy">Locate the project folder before browsing files.</p>
			</div>
		);
	}

	if (project.availability.status === "unavailable") {
		return (
			<div className="file-workspace__empty" data-testid="file-workspace-unavailable-project">
				<h2 className="file-workspace__empty-title">Project unavailable</h2>
				<p className="file-workspace__empty-copy">{project.availability.reason}</p>
			</div>
		);
	}

	return null;
}
