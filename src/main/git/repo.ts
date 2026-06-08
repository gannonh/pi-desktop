import { stat } from "node:fs/promises";
import { gitExecFileAsync } from "./runner";

export const isGitRepo = async (repoPath: string): Promise<boolean> => {
	try {
		if (!(await stat(repoPath)).isDirectory()) {
			return false;
		}
		const { stdout } = await gitExecFileAsync(["rev-parse", "--is-inside-work-tree"], { cwd: repoPath });
		const insideWorkTree = stdout.trim();
		if (insideWorkTree === "true") {
			return true;
		}
	} catch {
		// Fall through to bare-repo probe.
	}

	try {
		const { stdout } = await gitExecFileAsync(["rev-parse", "--is-bare-repository"], { cwd: repoPath });
		const bareRepo = stdout.trim();
		return bareRepo === "true";
	} catch {
		return false;
	}
};
