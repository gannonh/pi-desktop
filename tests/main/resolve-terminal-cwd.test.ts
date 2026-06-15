import { describe, expect, it } from "vitest";
import { mapSessionWorkspaceError } from "../../src/shared/terminal-eligibility";
import { createTerminalCwdResolver } from "../../src/main/terminal/resolve-terminal-cwd";

describe("resolve terminal cwd", () => {
	it("maps session workspace failures to terminal errors", async () => {
		const resolveCwd = createTerminalCwdResolver(async () => {
			throw new Error("Project folder is missing. Locate the folder before starting a Pi session.");
		});

		await expect(resolveCwd("project:/tmp/missing")).resolves.toEqual({
			ok: false,
			error: {
				code: "terminal.project_missing",
				message: "Project folder is missing.",
			},
		});
	});

	it("returns cwd from session workspace", async () => {
		const resolveCwd = createTerminalCwdResolver(async () => ({
			path: "/tmp/pi-desktop",
		}));

		await expect(resolveCwd("project:/tmp/pi-desktop")).resolves.toEqual({
			ok: true,
			data: { cwd: "/tmp/pi-desktop" },
		});
	});

	it("maps project not found errors", () => {
		expect(mapSessionWorkspaceError(new Error("Project not found."))).toEqual({
			ok: false,
			error: {
				code: "terminal.project_not_found",
				message: "Selected project was not found.",
			},
		});
	});
});
