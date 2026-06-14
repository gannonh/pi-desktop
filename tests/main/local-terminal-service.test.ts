import { describe, expect, it, vi } from "vitest";
import type { IPty } from "node-pty";
import type { ProjectRecord } from "../../src/shared/project-state";
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
		write,
		resize,
		clear: vi.fn(),
		kill,
		pause: vi.fn(),
		resume: vi.fn(),
		onData: vi.fn((handler: (data: string) => void) => {
			dataHandlers.push(handler);
			return { dispose: () => {} };
		}),
		onExit: vi.fn((handler: (event: { exitCode: number; signal?: number }) => void) => {
			exitHandlers.push(handler);
			return { dispose: () => {} };
		}),
	} as unknown as IPty;
	return { proc, dataHandlers, exitHandlers, kill, write, resize };
};

describe("local terminal service", () => {
	it("spawns a PTY with project cwd and default shell", async () => {
		const project = createProject();
		const spawnCalls: Array<{ file: string; args: string[] | string; options: Record<string, unknown> }> = [];
		const { proc } = createMockPty();
		const service = createLocalTerminalService({
			lookupProject: async (projectId) => (projectId === project.id ? project : null),
			spawnPty: (file, args, options) => {
				spawnCalls.push({ file, args, options });
				return proc;
			},
		});

		const result = await service.spawn({
			projectId: project.id,
			projectPath: project.path,
			cols: 100,
			rows: 30,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.terminalId).toBeTruthy();
		expect(spawnCalls).toHaveLength(1);
		expect(spawnCalls[0]?.options.cwd).toBe(project.path);
		expect(spawnCalls[0]?.options.cols).toBe(100);
		expect(spawnCalls[0]?.options.rows).toBe(30);
		expect(service.getSessionCount()).toBe(1);
	});

	it("rejects spawn when project path does not match", async () => {
		const project = createProject();
		const service = createLocalTerminalService({
			lookupProject: async () => project,
			spawnPty: () => createMockPty().proc,
		});

		const result = await service.spawn({
			projectId: project.id,
			projectPath: "/tmp/other",
			cols: 80,
			rows: 24,
		});

		expect(result).toEqual({
			ok: false,
			error: {
				code: "terminal.project_path_mismatch",
				message: "Project path does not match the selected project.",
			},
		});
	});

	it("routes write, resize, and kill to the active PTY", async () => {
		const project = createProject();
		const { proc, write, resize, kill } = createMockPty();
		const service = createLocalTerminalService({
			lookupProject: async () => project,
			spawnPty: () => proc,
		});
		const spawned = await service.spawn({
			projectId: project.id,
			projectPath: project.path,
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
		expect(service.getSessionCount()).toBe(0);
	});

	it("emits exit events and clears sessions", async () => {
		const project = createProject();
		const { proc, exitHandlers } = createMockPty();
		const events: Array<{ type: string }> = [];
		const service = createLocalTerminalService({
			lookupProject: async () => project,
			spawnPty: () => proc,
			onEvent: (event) => {
				events.push(event);
			},
		});
		const spawned = await service.spawn({
			projectId: project.id,
			projectPath: project.path,
			cols: 80,
			rows: 24,
		});
		if (!spawned.ok) {
			throw new Error("Expected spawn to succeed.");
		}

		exitHandlers[0]?.({ exitCode: 0, signal: undefined });
		expect(events).toEqual([{ type: "exit", terminalId: spawned.data.terminalId, code: 0 }]);
		expect(service.getSessionCount()).toBe(0);
	});

	it("disposes all sessions", async () => {
		const project = createProject();
		const { proc, kill } = createMockPty();
		const service = createLocalTerminalService({
			lookupProject: async () => project,
			spawnPty: () => proc,
		});
		await service.spawn({
			projectId: project.id,
			projectPath: project.path,
			cols: 80,
			rows: 24,
		});
		expect(service.getSessionCount()).toBe(1);
		service.disposeAll();
		expect(service.getSessionCount()).toBe(0);
		expect(kill).toHaveBeenCalled();
	});
});
