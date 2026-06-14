import type { ProjectRecord } from "./project-state";
import { err, type IpcResult } from "./result";

export const TERMINAL_PROJECT_MISSING_MESSAGE = "Project folder is missing.";

export type TerminalAvailabilityPhase =
	| { kind: "no-project" }
	| { kind: "project-unavailable"; message: string }
	| { kind: "idle" };

export const resolveTerminalAvailability = (
	project: Pick<ProjectRecord, "availability"> | null,
): TerminalAvailabilityPhase => {
	if (!project) {
		return { kind: "no-project" };
	}
	if (project.availability.status === "missing") {
		return { kind: "project-unavailable", message: TERMINAL_PROJECT_MISSING_MESSAGE };
	}
	if (project.availability.status === "unavailable") {
		return {
			kind: "project-unavailable",
			message: project.availability.reason,
		};
	}
	return { kind: "idle" };
};

export const mapSessionWorkspaceError = (error: unknown): IpcResult<never> => {
	const message = error instanceof Error ? error.message : "Project is unavailable.";
	if (message.includes("missing") || message.includes("Locate the folder")) {
		return err("terminal.project_missing", TERMINAL_PROJECT_MISSING_MESSAGE);
	}
	if (message.includes("not found") || message.includes("Project not found")) {
		return err("terminal.project_not_found", "Selected project was not found.");
	}
	return err("terminal.project_unavailable", message);
};
