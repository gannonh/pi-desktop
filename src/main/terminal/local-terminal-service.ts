// Adapted from Orca local-pty-provider PTY lifecycle patterns (MIT, stablyai/orca).

import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import type { IPty } from "node-pty";
import type { TerminalEvent } from "../../shared/terminal";
import { err, ok, type IpcResult } from "../../shared/result";
import type { TerminalCwdResolver } from "./resolve-terminal-cwd";
import { buildTerminalEnv, resolveDefaultShell } from "./shell-defaults";

export type PtySpawnFn = (file: string, args: string[] | string, options: PtySpawnOptions) => IPty;

export type PtySpawnOptions = {
	name: string;
	cols: number;
	rows: number;
	cwd: string;
	env: Record<string, string>;
};

type PtyDisposable = { dispose: () => void };

type PtyWithTeardown = IPty & {
	destroy?: () => void;
};

export type LocalTerminalServiceDeps = {
	resolveCwd: TerminalCwdResolver;
	spawnPty?: PtySpawnFn;
	onEvent?: (event: TerminalEvent) => void;
};

const requireNodePty = createRequire(import.meta.url);

const defaultSpawnPty: PtySpawnFn = (file, args, options) => {
	const pty = requireNodePty("node-pty") as typeof import("node-pty");
	return pty.spawn(file, args, options);
};

const destroyPtyProcess = (proc: IPty, alreadyKilled = false): void => {
	if (process.platform === "win32" && alreadyKilled) {
		return;
	}
	const teardown = proc as PtyWithTeardown;
	if (process.platform !== "win32") {
		teardown.kill = () => {};
	}
	try {
		teardown.destroy?.();
	} catch {
		/* already torn down */
	}
};

export const createLocalTerminalService = (deps: LocalTerminalServiceDeps) => {
	const spawnPty = deps.spawnPty ?? defaultSpawnPty;
	const sessions = new Map<string, IPty>();
	const disposables = new Map<string, PtyDisposable[]>();

	const emit = (event: TerminalEvent) => {
		deps.onEvent?.(event);
	};

	const disposeListeners = (terminalId: string) => {
		const listeners = disposables.get(terminalId);
		if (!listeners) {
			return;
		}
		for (const listener of listeners) {
			listener.dispose();
		}
		disposables.delete(terminalId);
	};

	const clearSession = (terminalId: string) => {
		disposeListeners(terminalId);
		sessions.delete(terminalId);
	};

	const safeKill = (terminalId: string, proc: IPty) => {
		if (!sessions.has(terminalId)) {
			return;
		}

		const listeners = disposables.get(terminalId);
		listeners?.[0]?.dispose();

		try {
			proc.kill();
		} catch {
			/* already dead */
		}

		if (!sessions.has(terminalId)) {
			destroyPtyProcess(proc, true);
			return;
		}

		disposeListeners(terminalId);
		emit({ type: "exit", terminalId, code: 0 });
		destroyPtyProcess(proc, true);
		sessions.delete(terminalId);
	};

	const getProc = (terminalId: string): IPty | null => sessions.get(terminalId) ?? null;

	const spawn = async (input: {
		projectId: string;
		cols: number;
		rows: number;
	}): Promise<IpcResult<{ terminalId: string }>> => {
		const cwdResult = await deps.resolveCwd(input.projectId);
		if (!cwdResult.ok) {
			return cwdResult;
		}

		const cwd = cwdResult.data.cwd;
		const terminalId = randomUUID();
		const shell = resolveDefaultShell();
		const env = buildTerminalEnv(shell, cwd);

		let proc: IPty;
		try {
			proc = spawnPty(shell, [], {
				name: "xterm-256color",
				cols: input.cols,
				rows: input.rows,
				cwd,
				env,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to spawn terminal.";
			return err("terminal.spawn_failed", message);
		}

		const dataDisposable = proc.onData((data) => {
			emit({ type: "data", terminalId, data });
		});
		const exitDisposable = proc.onExit((event) => {
			emit({ type: "exit", terminalId, code: event.exitCode });
			clearSession(terminalId);
		});

		disposables.set(terminalId, [dataDisposable, exitDisposable]);
		sessions.set(terminalId, proc);

		return ok({ terminalId });
	};

	const write = (input: { terminalId: string; data: string }): IpcResult<{ accepted: true }> => {
		const proc = getProc(input.terminalId);
		if (!proc) {
			return err("terminal.not_found", "Terminal session is not available.");
		}
		try {
			proc.write(input.data);
			return ok({ accepted: true as const });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to write to terminal.";
			emit({ type: "error", terminalId: input.terminalId, message });
			return err("terminal.write_failed", message);
		}
	};

	const resize = (input: { terminalId: string; cols: number; rows: number }): IpcResult<{ accepted: true }> => {
		const proc = getProc(input.terminalId);
		if (!proc) {
			return err("terminal.not_found", "Terminal session is not available.");
		}
		try {
			proc.resize(input.cols, input.rows);
			return ok({ accepted: true as const });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to resize terminal.";
			emit({ type: "error", terminalId: input.terminalId, message });
			return err("terminal.resize_failed", message);
		}
	};

	const kill = (input: { terminalId: string }): IpcResult<{ accepted: true }> => {
		const proc = getProc(input.terminalId);
		if (!proc) {
			return err("terminal.not_found", "Terminal session is not available.");
		}
		safeKill(input.terminalId, proc);
		return ok({ accepted: true as const });
	};

	const disposeAll = () => {
		for (const [terminalId, proc] of sessions.entries()) {
			safeKill(terminalId, proc);
		}
	};

	return {
		spawn,
		write,
		resize,
		kill,
		disposeAll,
	};
};

export type LocalTerminalService = ReturnType<typeof createLocalTerminalService>;
