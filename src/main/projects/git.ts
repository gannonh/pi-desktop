import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const gitLocalEnvironmentVariables = [
	"GIT_ALTERNATE_OBJECT_DIRECTORIES",
	"GIT_CONFIG",
	"GIT_CONFIG_PARAMETERS",
	"GIT_CONFIG_COUNT",
	"GIT_OBJECT_DIRECTORY",
	"GIT_DIR",
	"GIT_WORK_TREE",
	"GIT_IMPLICIT_WORK_TREE",
	"GIT_GRAFT_FILE",
	"GIT_INDEX_FILE",
	"GIT_NO_REPLACE_OBJECTS",
	"GIT_REPLACE_REF_BASE",
	"GIT_PREFIX",
	"GIT_SHALLOW_FILE",
	"GIT_COMMON_DIR",
] as const;

export const createGitChildProcessEnvironment = (
	sourceEnvironment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv => {
	const childEnvironment = { ...sourceEnvironment };

	for (const variable of gitLocalEnvironmentVariables) {
		delete childEnvironment[variable];
	}

	return childEnvironment;
};

export const initializeGitRepository = async (projectPath: string): Promise<void> => {
	await execFileAsync("git", ["init", "-b", "main"], { cwd: projectPath, env: createGitChildProcessEnvironment() });
};
