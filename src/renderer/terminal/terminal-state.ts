import type { ProjectRecord } from "../../shared/project-state";
import type { TerminalAvailabilityPhase } from "../../shared/terminal-eligibility";
import { resolveTerminalAvailability } from "../../shared/terminal-eligibility";

export type TerminalPanelPhase =
	| TerminalAvailabilityPhase
	| { kind: "starting"; projectId: string }
	| { kind: "running"; projectId: string }
	| { kind: "exited"; exitCode: number }
	| { kind: "terminated" }
	| { kind: "error"; message: string };

export type TerminalPanelState = {
	phase: TerminalPanelPhase;
};

export const createInitialTerminalPanelState = (): TerminalPanelState => ({
	phase: { kind: "no-project" },
});

export { resolveTerminalAvailability };

export const terminalPanelReducer = (
	state: TerminalPanelState,
	action:
		| {
				type: "sync-project";
				project: Pick<ProjectRecord, "id" | "availability"> | null;
		  }
		| { type: "start"; projectId: string }
		| { type: "running"; projectId: string }
		| { type: "exited"; exitCode: number }
		| { type: "terminated" }
		| { type: "error"; message: string }
		| { type: "reset-idle" },
): TerminalPanelState => {
	switch (action.type) {
		case "sync-project": {
			const availability = resolveTerminalAvailability(action.project);
			if (availability.kind !== "idle") {
				if (state.phase.kind === availability.kind) {
					if (
						availability.kind !== "project-unavailable" ||
						(state.phase.kind === "project-unavailable" && state.phase.message === availability.message)
					) {
						return state;
					}
				}
				return { phase: availability };
			}
			if (state.phase.kind === "running" && action.project && state.phase.projectId === action.project.id) {
				return state;
			}
			if (state.phase.kind === "starting" && action.project && state.phase.projectId === action.project.id) {
				return state;
			}
			if (state.phase.kind === "idle") {
				return state;
			}
			if (state.phase.kind === "terminated" || state.phase.kind === "exited" || state.phase.kind === "error") {
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
		case "terminated":
			return { phase: { kind: "terminated" } };
		case "error":
			return { phase: { kind: "error", message: action.message } };
		case "reset-idle":
			return { phase: { kind: "idle" } };
		default:
			return state;
	}
};
