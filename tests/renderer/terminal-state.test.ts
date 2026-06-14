import { describe, expect, it } from "vitest";
import {
	createInitialTerminalPanelState,
	resolveTerminalAvailability,
	terminalPanelReducer,
} from "../../src/renderer/terminal/terminal-state";

const availableProject = {
	id: "project:/tmp/pi-desktop",
	path: "/tmp/pi-desktop",
	availability: { status: "available" as const },
};

describe("terminal panel state", () => {
	it("starts with no project selected", () => {
		expect(createInitialTerminalPanelState()).toEqual({ phase: { kind: "no-project" } });
	});

	it("resolves project availability phases", () => {
		expect(resolveTerminalAvailability(null)).toEqual({ kind: "no-project" });
		expect(
			resolveTerminalAvailability({
				...availableProject,
				availability: { status: "missing", checkedAt: "2026-05-12T10:00:00.000Z" },
			}),
		).toEqual({
			kind: "project-unavailable",
			message: "Project folder is missing.",
		});
		expect(resolveTerminalAvailability(availableProject)).toEqual({ kind: "idle" });
	});

	it("tracks running and exited transitions", () => {
		let state = createInitialTerminalPanelState();
		state = terminalPanelReducer(state, { type: "sync-project", project: availableProject });
		expect(state.phase).toEqual({ kind: "idle" });

		state = terminalPanelReducer(state, { type: "start", projectId: availableProject.id });
		expect(state.phase).toEqual({ kind: "starting", projectId: availableProject.id });

		state = terminalPanelReducer(state, {
			type: "running",
			projectId: availableProject.id,
		});
		expect(state.phase).toEqual({
			kind: "running",
			projectId: availableProject.id,
		});

		state = terminalPanelReducer(state, { type: "exited", exitCode: 0 });
		expect(state.phase).toEqual({ kind: "exited", exitCode: 0 });
	});

	it("resets to idle when project changes away from a running session", () => {
		const running = terminalPanelReducer(createInitialTerminalPanelState(), {
			type: "running",
			projectId: availableProject.id,
		});
		const next = terminalPanelReducer(running, {
			type: "sync-project",
			project: { id: "project:/tmp/other", availability: availableProject.availability },
		});
		expect(next.phase).toEqual({ kind: "idle" });
	});

	it("keeps idle when the same available project is synced again", () => {
		const state = terminalPanelReducer(createInitialTerminalPanelState(), {
			type: "sync-project",
			project: availableProject,
		});
		const next = terminalPanelReducer(state, { type: "sync-project", project: availableProject });
		expect(next).toBe(state);
	});

	it("stores terminated transitions", () => {
		const state = terminalPanelReducer(createInitialTerminalPanelState(), { type: "terminated" });
		expect(state.phase).toEqual({ kind: "terminated" });
	});

	it("stores terminal errors", () => {
		const state = terminalPanelReducer(createInitialTerminalPanelState(), {
			type: "error",
			message: "PTY spawn failed",
		});
		expect(state.phase).toEqual({ kind: "error", message: "PTY spawn failed" });
	});
});
