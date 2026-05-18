import { SessionManager } from "@earendil-works/pi-coding-agent";
import { resolvePiSessionFilesDirForCwd } from "../app-paths";

export const writeSessionName = async (sessionPath: string, name: string): Promise<void> => {
	SessionManager.open(sessionPath).appendSessionInfo(name);
};

export const forkSession = async (
	sourcePath: string,
	targetCwd: string,
	env: NodeJS.ProcessEnv = process.env,
): Promise<string> => {
	const manager = SessionManager.forkFrom(
		sourcePath,
		targetCwd,
		resolvePiSessionFilesDirForCwd({ cwd: targetCwd, env }),
	);
	const forkedPath = manager.getSessionFile();
	if (!forkedPath) {
		throw new Error("Pi session fork did not create a persisted session file.");
	}
	return forkedPath;
};

export const cloneSession = async (
	sourcePath: string,
	targetCwd: string,
	env: NodeJS.ProcessEnv = process.env,
): Promise<string> => {
	const manager = SessionManager.open(sourcePath, resolvePiSessionFilesDirForCwd({ cwd: targetCwd, env }), targetCwd);
	const leafId = manager.getLeafId();
	if (!leafId) {
		throw new Error("Cannot clone a session without entries.");
	}
	const clonedPath = manager.createBranchedSession(leafId);
	if (!clonedPath) {
		throw new Error("Pi session clone did not create a persisted session file.");
	}
	return clonedPath;
};

export const branchSession = async (
	sourcePath: string,
	targetCwd: string,
	entryId: string,
	env: NodeJS.ProcessEnv = process.env,
): Promise<string> => {
	const manager = SessionManager.open(sourcePath, resolvePiSessionFilesDirForCwd({ cwd: targetCwd, env }), targetCwd);
	const branchedPath = manager.createBranchedSession(entryId);
	if (!branchedPath) {
		throw new Error("Pi session branch did not create a persisted session file.");
	}
	return branchedPath;
};
