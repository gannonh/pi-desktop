import type { PiSessionPrepareInput, PiSessionStartResult } from "../../shared/pi-session";
import type {
	PiSessionGetRuntimeCommandsInput,
	PiSessionRuntimeCommand,
	PiSessionRuntimeCommandsResult,
} from "../../shared/pi-session-commands";
import type { StatusMessageTone } from "../status-message";

export type RuntimeCommandRefreshOptions = {
	sessionId: string;
	reloadResources?: boolean;
	requestCommands: (input: PiSessionGetRuntimeCommandsInput) => Promise<PiSessionRuntimeCommandsResult>;
	getCurrentSessionId: () => string | null;
	replaceCommands: (commands: PiSessionRuntimeCommand[]) => void;
	notify?: (message: string, tone: StatusMessageTone) => void;
};

export async function refreshRuntimeCommandPalette({
	sessionId,
	reloadResources,
	requestCommands,
	getCurrentSessionId,
	replaceCommands,
	notify,
}: RuntimeCommandRefreshOptions): Promise<void> {
	const result = await requestCommands({ sessionId, reloadResources: reloadResources ? true : undefined });
	if (getCurrentSessionId() !== sessionId) {
		return;
	}
	if (result.ok) {
		replaceCommands(result.data.commands);
		if (reloadResources) {
			notify?.("Runtime commands refreshed.", "success");
		}
		return;
	}
	replaceCommands([]);
	notify?.(result.error.message, "error");
}

export type RestoreRuntimeCommandsAfterHydrationOptions = {
	sessionId: string;
	requestCommands: RuntimeCommandRefreshOptions["requestCommands"];
	attachSession?: () => Promise<{ ok: boolean }>;
	isStillActive: () => boolean;
	onRestored: (sessionId: string, commands: PiSessionRuntimeCommand[]) => void;
};

export async function restoreRuntimeCommandsAfterHydration({
	sessionId,
	requestCommands,
	attachSession,
	isStillActive,
	onRestored,
}: RestoreRuntimeCommandsAfterHydrationOptions): Promise<void> {
	let result = await requestCommands({ sessionId });
	if (!isStillActive()) {
		return;
	}

	if (!result.ok && attachSession) {
		const attached = await attachSession();
		if (!isStillActive()) {
			return;
		}
		if (attached.ok) {
			result = await requestCommands({ sessionId });
		}
	}

	if (!isStillActive() || !result.ok) {
		return;
	}

	onRestored(sessionId, result.data.commands);
}

export type PrepareRuntimeSessionForComposerOptions = {
	projectId: string | null;
	chatId: string | null;
	prepareSession: (input: PiSessionPrepareInput) => Promise<PiSessionStartResult>;
	requestCommands: RuntimeCommandRefreshOptions["requestCommands"];
	isStillActive: () => boolean;
	onPrepared: (sessionId: string, commands: PiSessionRuntimeCommand[]) => void;
};

export async function prepareRuntimeSessionForComposer({
	projectId,
	chatId,
	prepareSession,
	requestCommands,
	isStillActive,
	onPrepared,
}: PrepareRuntimeSessionForComposerOptions): Promise<string | null> {
	const prepared = await prepareSession({ projectId, chatId });
	if (!isStillActive()) {
		return null;
	}
	if (!prepared.ok) {
		return null;
	}

	const sessionId = prepared.data.sessionId;
	const commandsResult = await requestCommands({ sessionId });
	if (!isStillActive()) {
		return null;
	}
	if (!commandsResult.ok) {
		return sessionId;
	}

	onPrepared(sessionId, commandsResult.data.commands);
	return sessionId;
}
