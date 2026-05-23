import type { ProjectRecord } from "../../shared/project-state";
import { FileEmptyStates } from "./file-empty-states";
import { FileExplorer } from "./file-explorer";
import { FileViewer } from "./file-viewer";
import { FileWorkspaceProvider } from "./file-workspace-context";

interface FileWorkspacePanelProps {
	project: ProjectRecord | null;
}

export function FileWorkspacePanel({ project }: FileWorkspacePanelProps) {
	const blocked = <FileEmptyStates project={project} />;

	return (
		<FileWorkspaceProvider project={project}>
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
		</FileWorkspaceProvider>
	);
}
