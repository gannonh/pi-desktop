import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createGitChildProcessEnvironment } from "../projects/git";

const execFileAsync = promisify(execFile);

const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

export type GitExecOptions = {
	cwd: string;
	env?: NodeJS.ProcessEnv;
	maxBuffer?: number;
};

export const gitOptionalLocksDisabledEnv = (sourceEnvironment: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv => ({
	...createGitChildProcessEnvironment(sourceEnvironment),
	GIT_OPTIONAL_LOCKS: "0",
});

export const gitExecFileAsync = async (
	args: string[],
	options: GitExecOptions,
	command = "git",
): Promise<{ stdout: string; stderr: string }> => {
	const { stdout, stderr } = await execFileAsync(command, args, {
		cwd: options.cwd,
		env: { ...createGitChildProcessEnvironment(), ...options.env },
		maxBuffer: options.maxBuffer ?? DEFAULT_MAX_BUFFER,
	});
	return { stdout: stdout.toString(), stderr: stderr.toString() };
};
