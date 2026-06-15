import type { PiDesktopApi } from "../../shared/preload-api";
import { err } from "../../shared/result";

export const createTerminalUnavailableNamespace = (
	message = "Terminal is unavailable in this environment. Use the Electron desktop app.",
): PiDesktopApi["terminal"] => ({
	spawn: async () => err("terminal.unavailable", message),
	write: () => {},
	resize: async () => err("terminal.unavailable", message),
	kill: async () => err("terminal.unavailable", message),
	onEvent: () => () => {},
});
