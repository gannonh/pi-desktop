import { existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createGitChildProcessEnvironment } from "../projects/git";

const gitExecFileSync = (args: string[], options: { cwd: string }): string => {
	return execFileSync("git", args, {
		cwd: options.cwd,
		env: createGitChildProcessEnvironment(),
		encoding: "utf8",
	});
};

export const isGitRepo = (repoPath: string): boolean => {
	try {
		if (!existsSync(repoPath) || !statSync(repoPath).isDirectory()) {
			return false;
		}
		const insideWorkTree = gitExecFileSync(["rev-parse", "--is-inside-work-tree"], { cwd: repoPath }).trim();
		if (insideWorkTree === "true") {
			return true;
		}
	} catch {
		// Fall through to bare-repo probe.
	}

	try {
		const bareRepo = gitExecFileSync(["rev-parse", "--is-bare-repository"], { cwd: repoPath }).trim();
		return bareRepo === "true";
	} catch {
		return false;
	}
};
