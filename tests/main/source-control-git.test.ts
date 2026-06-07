import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { createGitChildProcessEnvironment, initializeGitRepository } from "../../src/main/projects/git";
import {
	bulkDiscardChanges,
	bulkStageFiles,
	bulkUnstageFiles,
	discardChanges,
	getStatus,
	stageFile,
	unstageFile,
} from "../../src/main/git/status";
import { isGitRepo } from "../../src/main/git/repo";

const execFileAsync = promisify(execFile);

const runGit = (args: string[], cwd: string) =>
	execFileAsync("git", args, { cwd, env: createGitChildProcessEnvironment() });

describe("source control git operations", () => {
	let repoDir = "";

	afterEach(async () => {
		if (repoDir) {
			await rm(repoDir, { recursive: true, force: true });
			repoDir = "";
		}
	});

	const createRepo = async () => {
		repoDir = await mkdtemp(join(tmpdir(), "pi-source-control-"));
		await initializeGitRepository(repoDir);
		await writeFile(join(repoDir, "README.md"), "# hello\n", "utf8");
		await runGit(["add", "README.md"], repoDir);
		await runGit(["commit", "-m", "initial"], repoDir);
		return repoDir;
	};

	it("detects git repositories", async () => {
		const repo = await createRepo();
		expect(isGitRepo(repo)).toBe(true);
		expect(isGitRepo(tmpdir())).toBe(false);
	});

	it("returns staged, unstaged, and untracked entries from getStatus", async () => {
		const repo = await createRepo();
		await writeFile(join(repo, "README.md"), "# changed\n", "utf8");
		await writeFile(join(repo, "new.txt"), "new\n", "utf8");
		await runGit(["add", "README.md"], repo);

		const status = await getStatus(repo);

		expect(status.entries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: "README.md", area: "staged", status: "modified" }),
				expect.objectContaining({ path: "new.txt", area: "untracked", status: "untracked" }),
			]),
		);
		expect(status.branch).toBe("refs/heads/main");
		expect(status.conflictOperation).toBe("unknown");
	});

	it("stages and unstages files", async () => {
		const repo = await createRepo();
		await writeFile(join(repo, "tracked.txt"), "tracked\n", "utf8");

		await stageFile(repo, "tracked.txt");
		let status = await getStatus(repo);
		expect(status.entries).toContainEqual(
			expect.objectContaining({ path: "tracked.txt", area: "staged", status: "added" }),
		);

		await unstageFile(repo, "tracked.txt");
		status = await getStatus(repo);
		expect(status.entries).toContainEqual(
			expect.objectContaining({ path: "tracked.txt", area: "untracked", status: "untracked" }),
		);
	});

	it("discards tracked and untracked changes", async () => {
		const repo = await createRepo();
		await writeFile(join(repo, "README.md"), "# changed\n", "utf8");
		await writeFile(join(repo, "temp.txt"), "temp\n", "utf8");

		await discardChanges(repo, "README.md");
		await discardChanges(repo, "temp.txt");

		const status = await getStatus(repo);
		expect(status.entries).toEqual([]);
		expect(await runGit(["show", "HEAD:README.md"], repo)).toMatchObject({ stdout: "# hello\n" });
	});

	it("bulk stages, unstages, and discards files", async () => {
		const repo = await createRepo();
		await mkdir(join(repo, "src"), { recursive: true });
		await writeFile(join(repo, "src", "a.ts"), "a\n", "utf8");
		await writeFile(join(repo, "src", "b.ts"), "b\n", "utf8");

		await bulkStageFiles(repo, ["src/a.ts", "src/b.ts"]);
		let status = await getStatus(repo);
		expect(status.entries.filter((entry) => entry.area === "staged")).toHaveLength(2);

		await bulkUnstageFiles(repo, ["src/a.ts", "src/b.ts"]);
		status = await getStatus(repo);
		expect(status.entries.filter((entry) => entry.area === "untracked")).toHaveLength(2);

		await bulkDiscardChanges(repo, ["src/a.ts", "src/b.ts"]);
		status = await getStatus(repo);
		expect(status.entries).toEqual([]);
	});

	it("rejects paths that escape the repository root", async () => {
		const repo = await createRepo();
		await expect(discardChanges(repo, "../../etc/passwd")).rejects.toThrow(/outside the worktree/);
		await expect(stageFile(repo, "../escape.txt")).rejects.toBeTruthy();
	});
});
