import type { IpcMain } from "electron";
import type { z } from "zod";
import { IpcChannels } from "../../shared/ipc";
import {
	TerminalKillInputSchema,
	TerminalResizeInputSchema,
	TerminalSpawnInputSchema,
	TerminalWriteInputSchema,
	type TerminalEvent,
} from "../../shared/terminal";
import { err, type IpcResult } from "../../shared/result";
import { createLocalTerminalService, type LocalTerminalService } from "./local-terminal-service";
import type { TerminalCwdResolver } from "./resolve-terminal-cwd";

const parseTerminalInput = <T>(
	schema: z.ZodType<T>,
	input: unknown,
): { ok: true; data: T } | { ok: false; result: IpcResult<never> } => {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		return { ok: false, result: err("terminal.input_invalid", "Terminal input is invalid.") };
	}
	return { ok: true, data: parsed.data };
};

const handleTerminalInvoke =
	<T>(
		getService: () => LocalTerminalService,
		schema: z.ZodType<T>,
		run: (service: LocalTerminalService, data: T) => IpcResult<{ accepted: true }>,
	) =>
	(_event: Electron.IpcMainInvokeEvent, input: unknown) => {
		const parsed = parseTerminalInput(schema, input);
		if (!parsed.ok) {
			return parsed.result;
		}
		return run(getService(), parsed.data);
	};

export type TerminalIpcHandle = {
	service: LocalTerminalService;
	dispose: () => void;
};

export const registerTerminalIpc = (deps: {
	ipcMain: IpcMain;
	resolveCwd: TerminalCwdResolver;
	sendEvent: (event: TerminalEvent) => void;
}): TerminalIpcHandle => {
	const service = createLocalTerminalService({
		resolveCwd: deps.resolveCwd,
		onEvent: deps.sendEvent,
	});
	const getService = () => service;

	deps.ipcMain.handle(IpcChannels.terminalSpawn, async (_event, input) => {
		const parsed = parseTerminalInput(TerminalSpawnInputSchema, input);
		if (!parsed.ok) {
			return parsed.result;
		}
		return service.spawn(parsed.data);
	});
	deps.ipcMain.on(IpcChannels.terminalWrite, (_event, input) => {
		const parsed = parseTerminalInput(TerminalWriteInputSchema, input);
		if (!parsed.ok) {
			return;
		}
		service.write(parsed.data);
	});
	deps.ipcMain.handle(
		IpcChannels.terminalResize,
		handleTerminalInvoke(getService, TerminalResizeInputSchema, (svc, data) => svc.resize(data)),
	);
	deps.ipcMain.handle(
		IpcChannels.terminalKill,
		handleTerminalInvoke(getService, TerminalKillInputSchema, (svc, data) => svc.kill(data)),
	);

	return {
		service,
		dispose: () => {
			service.disposeAll();
			deps.ipcMain.removeHandler(IpcChannels.terminalSpawn);
			deps.ipcMain.removeHandler(IpcChannels.terminalResize);
			deps.ipcMain.removeHandler(IpcChannels.terminalKill);
			deps.ipcMain.removeAllListeners(IpcChannels.terminalWrite);
		},
	};
};
