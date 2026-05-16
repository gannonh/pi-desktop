import { homedir } from "node:os";
import path from "node:path";

type DesktopPlatform = NodeJS.Platform | string;

const expandTildePath = (value: string, homeDir = homedir()): string => {
	if (value === "~") {
		return homeDir;
	}
	if (value.startsWith("~/")) {
		return path.join(homeDir, value.slice(2));
	}
	return value;
};

export const resolveElectronDevUserDataDir = (
	homeDir = homedir(),
	platform: DesktopPlatform = process.platform,
): string => {
	if (platform === "darwin") {
		return path.join(homeDir, "Library", "Application Support", "pi-desktop");
	}

	return path.join(homeDir, ".config", "pi-desktop");
};

export const resolveProjectStorePath = ({
	env = process.env,
	defaultUserDataDir,
	homeDir = homedir(),
}: {
	env?: NodeJS.ProcessEnv;
	defaultUserDataDir: string;
	homeDir?: string;
}): string => {
	const configuredPath = env.PI_DESKTOP_USER_DATA_DIR
		? expandTildePath(env.PI_DESKTOP_USER_DATA_DIR, homeDir)
		: defaultUserDataDir;

	return path.basename(configuredPath) === "project-store.json"
		? configuredPath
		: path.join(configuredPath, "project-store.json");
};

export const resolvePiAgentDir = (env: NodeJS.ProcessEnv = process.env, homeDir = homedir()): string =>
	expandTildePath(env.PI_CODING_AGENT_DIR ?? path.join("~", ".pi", "agent"), homeDir);

export const resolvePiSessionFilesRoot = (env: NodeJS.ProcessEnv = process.env, homeDir = homedir()): string =>
	expandTildePath(env.PI_CODING_AGENT_SESSION_DIR ?? path.join(resolvePiAgentDir(env, homeDir), "sessions"), homeDir);

export const resolvePiSessionFilesDirForCwd = ({
	cwd,
	env = process.env,
	homeDir = homedir(),
}: {
	cwd: string;
	env?: NodeJS.ProcessEnv;
	homeDir?: string;
}): string => {
	const safePath = `--${cwd.replace(/^[\\/]/, "").replace(/[\\/:]/g, "-")}--`;
	return path.join(resolvePiSessionFilesRoot(env, homeDir), safePath);
};
