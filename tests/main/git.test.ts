import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { createGitChildProcessEnvironment, initializeGitRepository } from "../../src/main/projects/git";

const execFileAsync = promisify(execFile);

const runGit = (args: string[], cwd: string) =>
	execFileAsync("git", args, { cwd, env: createGitChildProcessEnvironment() });

const withGitRepositoryEnvironment = async (gitDir: string, workTree: string, run: () => Promise<void>) => {
	const originalGitDir = process.env.GIT_DIR;
	const originalGitWorkTree = process.env.GIT_WORK_TREE;

	process.env.GIT_DIR = gitDir;
	process.env.GIT_WORK_TREE = workTree;

	try {
		await run();
	} finally {
		if (originalGitDir === undefined) {
			delete process.env.GIT_DIR;
		} else {
			process.env.GIT_DIR = originalGitDir;
		}

		if (originalGitWorkTree === undefined) {
			delete process.env.GIT_WORK_TREE;
		} else {
			process.env.GIT_WORK_TREE = originalGitWorkTree;
		}
	}
};

describe("git project initialization", () => {
	it("initializes git and git branch --show-current returns main", async () => {
		const projectDir = await mkdtemp(join(tmpdir(), "pi-git-project-"));

		await initializeGitRepository(projectDir);
		const { stdout } = await runGit(["branch", "--show-current"], projectDir);

		expect(stdout.trim()).toBe("main");
	});

	it("initializes the requested directory when inherited git hook environment points at another repository", async () => {
		const outerRepoDir = await mkdtemp(join(tmpdir(), "pi-git-outer-"));
		const projectDir = await mkdtemp(join(tmpdir(), "pi-git-project-"));
		await runGit(["init", "-b", "outer"], outerRepoDir);

		await withGitRepositoryEnvironment(join(outerRepoDir, ".git"), outerRepoDir, async () => {
			await initializeGitRepository(projectDir);
		});

		const { stdout: projectBranch } = await runGit(["branch", "--show-current"], projectDir);
		const { stdout: outerBranch } = await runGit(["branch", "--show-current"], outerRepoDir);

		expect(projectBranch.trim()).toBe("main");
		expect(outerBranch.trim()).toBe("outer");
	});
});
