import type { ProjectRecord } from "../../shared/project-state";
import { FileEmptyStates } from "./file-empty-states";
import { FileExplorer } from "./file-explorer";
import { FileViewer } from "./file-viewer";
interface FileWorkspacePanelProps {
	project: ProjectRecord | null;
}

export function FileWorkspacePanel({ project }: FileWorkspacePanelProps) {
	const blocked = <FileEmptyStates project={project} />;

	return (
		<div className="file-workspace" data-testid="workspace-panel-files">
			{project && project.availability.status === "available" ? (
				<>
					<FileExplorer />
					<FileViewer />
				</>
			) : (
				blocked
			)}
		</div>
	);
}
