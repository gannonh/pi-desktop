// Adapted from Orca local-pty-provider shell defaults (MIT, stablyai/orca).

export const resolveDefaultShell = (): string => {
	if (process.platform === "win32") {
		return process.env.COMSPEC || "cmd.exe";
	}
	return process.env.SHELL || "/bin/zsh";
};

export const resolveDefaultHome = (): string => {
	if (process.platform !== "win32") {
		return process.env.HOME || "/";
	}
	if (process.env.USERPROFILE) {
		return process.env.USERPROFILE;
	}
	if (process.env.HOMEDRIVE && process.env.HOMEPATH) {
		return `${process.env.HOMEDRIVE}${process.env.HOMEPATH}`;
	}
	return "C:\\";
};

export const buildTerminalEnv = (cwd: string): Record<string, string> => {
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) {
			env[key] = value;
		}
	}
	const shell = resolveDefaultShell();
	env.SHELL = shell;
	env.TERM = env.TERM || "xterm-256color";
	env.COLORTERM = env.COLORTERM || "truecolor";
	env.PI_DESKTOP_TERMINAL = "1";
	env.PWD = cwd;
	return env;
};
