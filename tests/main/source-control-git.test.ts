import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { createGitChildProcessEnvironment, initializeGitRepository } from "../../src/main/projects/git";
import {
	abortConflictOperation,
	bulkDiscardChanges,
	bulkStageFiles,
	bulkUnstageFiles,
	commitStagedChanges,
	discardChanges,
	fetchRemote,
	getBranchCompare,
	getDiff,
	getStatus,
	getUpstreamStatus,
	publishBranch,
	pushRemote,
	stageFile,
	unstageFile,
} from "../../src/main/git/status";
import { isGitRepo } from "../../src/main/git/repo";

const execFileAsync = promisify(execFile);

const runGit = (args: string[], cwd: string) =>
	execFileAsync("git", args, { cwd, env: createGitChildProcessEnvironment() });

const createBareRemote = async () => {
	const remoteDir = await mkdtemp(join(tmpdir(), "pi-source-control-remote-"));
	await runGit(["init", "--bare"], remoteDir);
	return remoteDir;
};

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

	it("discards staged tracked changes and staged additions", async () => {
		const repo = await createRepo();
		await writeFile(join(repo, "README.md"), "# staged\n", "utf8");
		await writeFile(join(repo, "created.txt"), "created\n", "utf8");
		await stageFile(repo, "README.md");
		await stageFile(repo, "created.txt");

		await discardChanges(repo, "README.md");
		await discardChanges(repo, "created.txt");

		const status = await getStatus(repo);
		expect(status.entries).toEqual([]);
		expect(await runGit(["show", "HEAD:README.md"], repo)).toMatchObject({ stdout: "# hello\n" });
	});

	it("discards staged renames completely", async () => {
		const repo = await createRepo();
		await runGit(["mv", "README.md", "RENAMED.md"], repo);

		await discardChanges(repo, "RENAMED.md");

		const status = await getStatus(repo);
		expect(status.entries).toEqual([]);
		expect(await runGit(["show", "HEAD:README.md"], repo)).toMatchObject({ stdout: "# hello\n" });
	});

	it("propagates git status failures", async () => {
		const repo = await createRepo();
		await writeFile(join(repo, ".git", "index"), "not an index\n", "utf8");

		await expect(getStatus(repo)).rejects.toThrow();
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

	it("commits staged changes and returns the created commit", async () => {
		const repo = await createRepo();
		await writeFile(join(repo, "README.md"), "# committed\n", "utf8");
		await stageFile(repo, "README.md");

		const result = await commitStagedChanges(repo, "Update readme");

		expect(result.sha).toMatch(/^[a-f0-9]{40}$/);
		expect(result.summary).toBe("Update readme");
		expect((await getStatus(repo)).entries).toEqual([]);
	});

	it("returns text, binary, and untracked diff payloads", async () => {
		const repo = await createRepo();
		await writeFile(join(repo, "README.md"), "# changed\n", "utf8");
		await writeFile(join(repo, "asset.bin"), Buffer.from([0, 1, 2, 3]));
		await writeFile(join(repo, "new.txt"), "new\n", "utf8");
		await stageFile(repo, "asset.bin");

		const textDiff = await getDiff(repo, { relativePath: "README.md", kind: "unstaged" });
		const binaryDiff = await getDiff(repo, { relativePath: "asset.bin", kind: "staged" });
		const untrackedDiff = await getDiff(repo, { relativePath: "new.txt", kind: "untracked" });

		expect(textDiff).toMatchObject({ kind: "text", path: "README.md" });
		if (textDiff.kind !== "text") {
			throw new Error(`Expected text diff, received ${textDiff.kind}`);
		}
		expect(textDiff.patch).toContain("-# hello");
		expect(textDiff.patch).toContain("+# changed");
		expect(binaryDiff.kind).toBe("binary");
		expect(untrackedDiff).toMatchObject({ kind: "unsupported", path: "new.txt", diffKind: "untracked" });
	});

	it("returns too_large when diff output exceeds the display limit", async () => {
		const repo = await createRepo();
		await writeFile(join(repo, "README.md"), `${"a".repeat(600 * 1024)}\n`, "utf8");

		const diff = await getDiff(repo, { relativePath: "README.md", kind: "unstaged" });

		expect(diff).toMatchObject({ kind: "too_large", path: "README.md" });
	});

	it("tracks upstream status and publishes branches", async () => {
		const repo = await createRepo();
		const remote = await createBareRemote();
		await runGit(["remote", "add", "origin", remote], repo);

		let upstream = await getUpstreamStatus(repo);
		expect(upstream.hasUpstream).toBe(false);

		await publishBranch(repo);
		upstream = await getUpstreamStatus(repo);
		expect(upstream).toMatchObject({ hasUpstream: true, ahead: 0, behind: 0 });

		await writeFile(join(repo, "README.md"), "# local ahead\n", "utf8");
		await stageFile(repo, "README.md");
		await commitStagedChanges(repo, "Local ahead");
		upstream = await getUpstreamStatus(repo);
		expect(upstream.ahead).toBe(1);

		await pushRemote(repo);
		upstream = await getUpstreamStatus(repo);
		expect(upstream.ahead).toBe(0);
		await fetchRemote(repo);
	});

	it("returns branch compare metadata and diff entries", async () => {
		const repo = await createRepo();
		await runGit(["checkout", "-b", "feature"], repo);
		await writeFile(join(repo, "feature.txt"), "feature\n", "utf8");
		await stageFile(repo, "feature.txt");
		await commitStagedChanges(repo, "Add feature");

		const compare = await getBranchCompare(repo, { baseRef: "main", headRef: "feature" });

		expect(compare).toMatchObject({ baseRef: "main", headRef: "feature", ahead: 1, behind: 0 });
		expect(compare.files).toContainEqual(expect.objectContaining({ path: "feature.txt", status: "added" }));
	});

	it("aborts in-progress merge conflicts", async () => {
		const repo = await createRepo();
		await runGit(["checkout", "-b", "left"], repo);
		await writeFile(join(repo, "README.md"), "# left\n", "utf8");
		await stageFile(repo, "README.md");
		await commitStagedChanges(repo, "Left change");
		await runGit(["checkout", "main"], repo);
		await runGit(["checkout", "-b", "right"], repo);
		await writeFile(join(repo, "README.md"), "# right\n", "utf8");
		await stageFile(repo, "README.md");
		await commitStagedChanges(repo, "Right change");

		await expect(runGit(["merge", "left"], repo)).rejects.toBeTruthy();
		expect((await getStatus(repo)).conflictOperation).toBe("merge");

		await abortConflictOperation(repo, "merge");

		expect((await getStatus(repo)).conflictOperation).toBe("unknown");
	});
});
