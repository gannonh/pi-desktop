// Adapted from Orca local-pty-provider shell defaults (MIT, stablyai/orca).

import { existsSync } from "node:fs";

const unixShellCandidates = (): string[] => {
	const candidates = [process.env.SHELL, "/bin/bash", "/bin/sh", "/bin/zsh"].filter(
		(candidate): candidate is string => typeof candidate === "string" && candidate.length > 0,
	);
	return [...new Set(candidates)];
};

export const resolveDefaultShell = (): string => {
	if (process.platform === "win32") {
		return process.env.COMSPEC || "cmd.exe";
	}
	for (const candidate of unixShellCandidates()) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}
	return "/bin/sh";
};

export const buildTerminalEnv = (shell: string, cwd: string): Record<string, string> => {
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) {
			env[key] = value;
		}
	}
	env.SHELL = shell;
	env.TERM = env.TERM || "xterm-256color";
	env.COLORTERM = env.COLORTERM || "truecolor";
	env.PI_DESKTOP_TERMINAL = "1";
	env.PWD = cwd;
	return env;
};
