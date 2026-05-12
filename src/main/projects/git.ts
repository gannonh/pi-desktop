import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const initializeGitRepository = async (projectPath: string): Promise<void> => {
	await execFileAsync("git", ["init", "-b", "main"], { cwd: projectPath });
};
