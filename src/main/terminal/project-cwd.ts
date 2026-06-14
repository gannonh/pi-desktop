import { resolve } from "node:path";
import type { ProjectRecord } from "../../shared/project-state";
import { err, ok, type IpcResult } from "../../shared/result";

export type ProjectLookup = (projectId: string) => Promise<ProjectRecord | null>;

export const validateProjectCwd = async (
	lookup: ProjectLookup,
	projectId: string,
	projectPath: string,
): Promise<IpcResult<{ cwd: string }>> => {
	const project = await lookup(projectId);
	if (!project) {
		return err("terminal.project_not_found", "Selected project was not found.");
	}

	const normalizedRequested = resolve(projectPath);
	const normalizedStored = resolve(project.path);
	if (normalizedRequested !== normalizedStored) {
		return err("terminal.project_path_mismatch", "Project path does not match the selected project.");
	}

	if (project.availability.status === "missing") {
		return err("terminal.project_missing", "Project folder is missing.");
	}

	if (project.availability.status === "unavailable") {
		return err("terminal.project_unavailable", project.availability.reason);
	}

	return ok({ cwd: normalizedStored });
};
