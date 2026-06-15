import { describe, expect, it, vi } from "vitest";
import type { IPty } from "node-pty";
import type { ProjectRecord } from "../../src/shared/project-state";
import { ok } from "../../src/shared/result";
import { createLocalTerminalService } from "../../src/main/terminal/local-terminal-service";

const createProject = (overrides: Partial<ProjectRecord> = {}): ProjectRecord => ({
	id: "project:/tmp/pi-desktop",
	displayName: "pi-desktop",
	path: "/tmp/pi-desktop",
	createdAt: "2026-05-12T09:00:00.000Z",
	updatedAt: "2026-05-12T10:00:00.000Z",
	lastOpenedAt: "2026-05-12T10:00:00.000Z",
	pinned: false,
	availability: { status: "available" },
	gitSettings: { defaultBaseRef: "main" },
	...overrides,
});

const createMockPty = () => {
	const dataHandlers: Array<(data: string) => void> = [];
	const exitHandlers: Array<(event: { exitCode: number; signal?: number }) => void> = [];
	const kill = vi.fn();
	const write = vi.fn();
	const resize = vi.fn();
	const proc = {
		pid: 4242,
		cols: 80,
		rows: 24,
		process: "zsh",
		handleFlowControl: false,
		pause: vi.fn(),
		resume: vi.fn(),
		onData: (handler: (data: string) => void) => {
			dataHandlers.push(handler);
			return { dispose: vi.fn() };
		},
		onExit: (handler: (event: { exitCode: number; signal?: number }) => void) => {
			exitHandlers.push(handler);
			return { dispose: vi.fn() };
		},
		write,
		resize,
		kill,
	} as unknown as IPty;

	return { proc, dataHandlers, exitHandlers, kill, write, resize };
};

describe("local terminal service", () => {
	it("spawns a PTY with the resolved project cwd", async () => {
		const project = createProject();
		const spawnCalls: Array<{ file: string; options: { cwd: string; cols: number; rows: number } }> = [];
		const service = createLocalTerminalService({
			resolveCwd: async () => ok({ cwd: project.path }),
			spawnPty: (file, _args, options) => {
				spawnCalls.push({ file, options });
				return createMockPty().proc;
			},
		});

		const result = await service.spawn({
			projectId: project.id,
			cols: 100,
			rows: 30,
		});
		if (!result.ok) {
			return;
		}
		expect(result.data.terminalId).toBeTruthy();
		expect(spawnCalls).toHaveLength(1);
		expect(spawnCalls[0]?.options.cwd).toBe(project.path);
		expect(spawnCalls[0]?.options.cols).toBe(100);
		expect(spawnCalls[0]?.options.rows).toBe(30);
		expect(service.write({ terminalId: result.data.terminalId, data: "" })).toEqual({
			ok: true,
			data: { accepted: true },
		});
	});

	it("rejects spawn when cwd resolution fails", async () => {
		const service = createLocalTerminalService({
			resolveCwd: async () => ({
				ok: false,
				error: {
					code: "terminal.project_missing",
					message: "Project folder is missing.",
				},
			}),
			spawnPty: () => createMockPty().proc,
		});

		const result = await service.spawn({
			projectId: "project:/tmp/missing",
			cols: 80,
			rows: 24,
		});

		expect(result).toEqual({
			ok: false,
			error: {
				code: "terminal.project_missing",
				message: "Project folder is missing.",
			},
		});
	});

	it("routes write, resize, and kill to the active PTY", async () => {
		const project = createProject();
		const { proc, write, resize, kill } = createMockPty();
		const service = createLocalTerminalService({
			resolveCwd: async () => ok({ cwd: project.path }),
			spawnPty: () => proc,
		});
		const spawned = await service.spawn({
			projectId: project.id,
			cols: 80,
			rows: 24,
		});
		if (!spawned.ok) {
			throw new Error("Expected spawn to succeed.");
		}

		expect(service.write({ terminalId: spawned.data.terminalId, data: "pwd\n" })).toEqual({
			ok: true,
			data: { accepted: true },
		});
		expect(write).toHaveBeenCalledWith("pwd\n");

		expect(service.resize({ terminalId: spawned.data.terminalId, cols: 120, rows: 40 })).toEqual({
			ok: true,
			data: { accepted: true },
		});
		expect(resize).toHaveBeenCalledWith(120, 40);

		expect(service.kill({ terminalId: spawned.data.terminalId })).toEqual({
			ok: true,
			data: { accepted: true },
		});
		expect(kill).toHaveBeenCalled();
		expect(service.kill({ terminalId: spawned.data.terminalId })).toEqual({
			ok: false,
			error: {
				code: "terminal.not_found",
				message: "Terminal session is not available.",
			},
		});
	});

	it("emits exit when kill is requested", async () => {
		const project = createProject();
		const { proc, kill, exitHandlers } = createMockPty();
		const events: Array<{ type: string; code?: number }> = [];
		const service = createLocalTerminalService({
			resolveCwd: async () => ok({ cwd: project.path }),
			spawnPty: () => proc,
			onEvent: (event) => {
				events.push(event);
			},
		});
		const spawned = await service.spawn({
			projectId: project.id,
			cols: 80,
			rows: 24,
		});
		if (!spawned.ok) {
			throw new Error("Expected spawn to succeed.");
		}

		expect(exitHandlers).toHaveLength(1);
		expect(service.kill({ terminalId: spawned.data.terminalId })).toEqual({
			ok: true,
			data: { accepted: true },
		});
		expect(kill).toHaveBeenCalled();
		expect(events).toEqual([{ type: "exit", terminalId: spawned.data.terminalId, code: 0 }]);
	});

	it("emits exit events and clears sessions", async () => {
		const project = createProject();
		const { proc, exitHandlers } = createMockPty();
		const events: Array<{ type: string }> = [];
		const service = createLocalTerminalService({
			resolveCwd: async () => ok({ cwd: project.path }),
			spawnPty: () => proc,
			onEvent: (event) => {
				events.push(event);
			},
		});
		const spawned = await service.spawn({
			projectId: project.id,
			cols: 80,
			rows: 24,
		});
		if (!spawned.ok) {
			throw new Error("Expected spawn to succeed.");
		}

		exitHandlers[0]?.({ exitCode: 0, signal: undefined });
		expect(events).toEqual([{ type: "exit", terminalId: spawned.data.terminalId, code: 0 }]);
		expect(service.kill({ terminalId: spawned.data.terminalId })).toEqual({
			ok: false,
			error: {
				code: "terminal.not_found",
				message: "Terminal session is not available.",
			},
		});
	});

	it("disposes all sessions", async () => {
		const project = createProject();
		const { proc, kill } = createMockPty();
		const service = createLocalTerminalService({
			resolveCwd: async () => ok({ cwd: project.path }),
			spawnPty: () => proc,
		});
		const spawned = await service.spawn({
			projectId: project.id,
			cols: 80,
			rows: 24,
		});
		if (!spawned.ok) {
			throw new Error("Expected spawn to succeed.");
		}
		service.disposeAll();
		expect(service.kill({ terminalId: spawned.data.terminalId })).toEqual({
			ok: false,
			error: {
				code: "terminal.not_found",
				message: "Terminal session is not available.",
			},
		});
		expect(kill).toHaveBeenCalled();
	});
});
