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
	const result = await requestCommands({ sessionId, reloadResources: reloadResources || undefined });
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
