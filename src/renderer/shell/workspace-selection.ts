import type { WorkspaceSummary } from "../../shared/workspace-state";

export const createWorkspaceSummaryFromPath = (workspacePath: string): WorkspaceSummary => ({
	id: `workspace:${workspacePath}`,
	name: workspacePath.split("/").filter(Boolean).at(-1) ?? workspacePath,
	path: workspacePath,
});
