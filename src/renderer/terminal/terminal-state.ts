import type { ProjectRecord } from "../../shared/project-state";

export type TerminalPanelPhase =
	| { kind: "no-project" }
	| { kind: "project-unavailable"; message: string }
	| { kind: "idle" }
	| { kind: "starting"; projectId: string }
	| { kind: "running"; projectId: string }
	| { kind: "exited"; exitCode: number }
	| { kind: "error"; message: string };

export type TerminalPanelState = {
	phase: TerminalPanelPhase;
};

export const createInitialTerminalPanelState = (): TerminalPanelState => ({
	phase: { kind: "no-project" },
});

export const resolveTerminalAvailability = (
	project: Pick<ProjectRecord, "availability"> | null,
): TerminalPanelPhase => {
	if (!project) {
		return { kind: "no-project" };
	}
	if (project.availability.status === "missing") {
		return { kind: "project-unavailable", message: "Project folder is missing." };
	}
	if (project.availability.status === "unavailable") {
		return {
			kind: "project-unavailable",
			message: project.availability.reason,
		};
	}
	return { kind: "idle" };
};

export const terminalPanelReducer = (
	state: TerminalPanelState,
	action:
		| {
				type: "sync-project";
				project: Pick<ProjectRecord, "id" | "path" | "availability"> | null;
		  }
		| { type: "start"; projectId: string }
		| { type: "running"; projectId: string }
		| { type: "exited"; exitCode: number }
		| { type: "error"; message: string }
		| { type: "reset-idle" },
): TerminalPanelState => {
	switch (action.type) {
		case "sync-project": {
			const availability = resolveTerminalAvailability(action.project);
			if (availability.kind !== "idle") {
				return { phase: availability };
			}
			if (state.phase.kind === "running" && action.project && state.phase.projectId === action.project.id) {
				return state;
			}
			if (state.phase.kind === "starting" && action.project && state.phase.projectId === action.project.id) {
				return state;
			}
			return { phase: { kind: "idle" } };
		}
		case "start":
			return { phase: { kind: "starting", projectId: action.projectId } };
		case "running":
			return { phase: { kind: "running", projectId: action.projectId } };
		case "exited":
			return { phase: { kind: "exited", exitCode: action.exitCode } };
		case "error":
			return { phase: { kind: "error", message: action.message } };
		case "reset-idle":
			return { phase: { kind: "idle" } };
		default:
			return state;
	}
};
