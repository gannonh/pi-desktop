import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { isGitRepo } from "../../src/main/git/repo";
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
	rebaseFromBase,
	stageFile,
	unstageFile,
} from "../../src/main/git/status";
import { createGitChildProcessEnvironment, initializeGitRepository } from "../../src/main/projects/git";

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
		await expect(isGitRepo(repo)).resolves.toBe(true);
		await expect(isGitRepo(tmpdir())).resolves.toBe(false);
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

	it("unstages files before the first commit", async () => {
		repoDir = await mkdtemp(join(tmpdir(), "pi-source-control-unborn-"));
		await initializeGitRepository(repoDir);
		await writeFile(join(repoDir, "first.txt"), "first\n", "utf8");
		await stageFile(repoDir, "first.txt");

		await unstageFile(repoDir, "first.txt");

		const status = await getStatus(repoDir);
		expect(status.entries).toEqual([
			expect.objectContaining({ path: "first.txt", area: "untracked", status: "untracked" }),
		]);
	});

	it("bulk unstages files before the first commit", async () => {
		repoDir = await mkdtemp(join(tmpdir(), "pi-source-control-unborn-"));
		await initializeGitRepository(repoDir);
		await writeFile(join(repoDir, "first.txt"), "first\n", "utf8");
		await writeFile(join(repoDir, "second.txt"), "second\n", "utf8");
		await bulkStageFiles(repoDir, ["first.txt", "second.txt"]);

		await bulkUnstageFiles(repoDir, ["first.txt", "second.txt"]);

		const status = await getStatus(repoDir);
		expect(status.entries.filter((entry) => entry.area === "untracked")).toHaveLength(2);
	});

	it("discards tracked and untracked changes", async () => {
		const repo = await createRepo();
		await writeFile(join(repo, "README.md"), "# changed\n", "utf8");
		await writeFile(join(repo, "temp.txt"), "temp\n", "utf8");

		await discardChanges(repo, "README.md", "unstaged");
		await discardChanges(repo, "temp.txt", "untracked");

		const status = await getStatus(repo);
		expect(status.entries).toEqual([]);
		expect(await runGit(["show", "HEAD:README.md"], repo)).toMatchObject({ stdout: "# hello\n" });
	});

	it("does not discard ignored files through the untracked path", async () => {
		const repo = await createRepo();
		await writeFile(join(repo, ".gitignore"), ".env\n", "utf8");
		await stageFile(repo, ".gitignore");
		await commitStagedChanges(repo, "Ignore env files");
		await writeFile(join(repo, ".env"), "secret\n", "utf8");

		await discardChanges(repo, ".env", "untracked");

		expect(await readFile(join(repo, ".env"), "utf8")).toBe("secret\n");
	});

	it("discards staged tracked changes and staged additions", async () => {
		const repo = await createRepo();
		await writeFile(join(repo, "README.md"), "# staged\n", "utf8");
		await writeFile(join(repo, "created.txt"), "created\n", "utf8");
		await stageFile(repo, "README.md");
		await stageFile(repo, "created.txt");

		await discardChanges(repo, "README.md", "staged");
		await discardChanges(repo, "created.txt", "staged");

		const status = await getStatus(repo);
		expect(status.entries).toEqual([]);
		expect(await runGit(["show", "HEAD:README.md"], repo)).toMatchObject({ stdout: "# hello\n" });
	});

	it("discards staged additions before the first commit", async () => {
		repoDir = await mkdtemp(join(tmpdir(), "pi-source-control-unborn-"));
		await initializeGitRepository(repoDir);
		await writeFile(join(repoDir, "first.txt"), "first\n", "utf8");
		await stageFile(repoDir, "first.txt");

		await discardChanges(repoDir, "first.txt", "staged");

		const status = await getStatus(repoDir);
		expect(status.entries).toEqual([]);
	});

	it("discards staged renames completely", async () => {
		const repo = await createRepo();
		await runGit(["mv", "README.md", "RENAMED.md"], repo);

		await discardChanges(repo, "RENAMED.md", "staged");

		const status = await getStatus(repo);
		expect(status.entries).toEqual([]);
		expect(await runGit(["show", "HEAD:README.md"], repo)).toMatchObject({ stdout: "# hello\n" });
	});

	it("discards staged deletions completely", async () => {
		const repo = await createRepo();
		await rm(join(repo, "README.md"));
		await stageFile(repo, "README.md");

		await discardChanges(repo, "README.md", "staged");

		const status = await getStatus(repo);
		expect(status.entries).toEqual([]);
		expect(await runGit(["show", "HEAD:README.md"], repo)).toMatchObject({ stdout: "# hello\n" });
	});

	it("discards unstaged changes without clearing staged changes for the same file", async () => {
		const repo = await createRepo();
		await writeFile(join(repo, "README.md"), "# staged\n", "utf8");
		await stageFile(repo, "README.md");
		await writeFile(join(repo, "README.md"), "# unstaged\n", "utf8");

		await discardChanges(repo, "README.md", "unstaged");

		const status = await getStatus(repo);
		expect(status.entries).toEqual([
			expect.objectContaining({ path: "README.md", area: "staged", status: "modified" }),
		]);
		expect(await runGit(["diff", "--cached", "--", "README.md"], repo)).toMatchObject({
			stdout: expect.stringContaining("+# staged"),
		});
	});

	it("discards staged changes without clearing unstaged changes for the same file", async () => {
		const repo = await createRepo();
		await writeFile(join(repo, "README.md"), "# staged\n", "utf8");
		await stageFile(repo, "README.md");
		await writeFile(join(repo, "README.md"), "# unstaged\n", "utf8");

		await discardChanges(repo, "README.md", "staged");

		const status = await getStatus(repo);
		expect(status.entries).toEqual([
			expect.objectContaining({ path: "README.md", area: "unstaged", status: "modified" }),
		]);
		expect(await runGit(["diff", "--cached", "--", "README.md"], repo)).toMatchObject({ stdout: "" });
		expect(await runGit(["diff", "--", "README.md"], repo)).toMatchObject({
			stdout: expect.stringContaining("+# unstaged"),
		});
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

		await bulkDiscardChanges(repo, [
			{ relativePath: "src/a.ts", area: "untracked" },
			{ relativePath: "src/b.ts", area: "untracked" },
		]);
		status = await getStatus(repo);
		expect(status.entries).toEqual([]);
	});

	it("rejects paths that escape the repository root", async () => {
		const repo = await createRepo();
		await expect(discardChanges(repo, "../../etc/passwd", "unstaged")).rejects.toThrow(/outside the worktree/);
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

	it("rejects commits from subdirectory projects", async () => {
		const repo = await createRepo();
		await mkdir(join(repo, "packages", "app"), { recursive: true });
		await writeFile(join(repo, "outside.txt"), "outside\n", "utf8");
		await stageFile(repo, "outside.txt");

		await expect(commitStagedChanges(join(repo, "packages", "app"), "Subdir commit")).rejects.toThrow(
			/subdirectory project/,
		);
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

	it("rejects diff revision arguments that look like git options", async () => {
		const repo = await createRepo();

		await expect(
			getDiff(repo, { relativePath: "README.md", kind: "commit", commitRef: "--output=/tmp/pi-diff" }),
		).rejects.toThrow(/must not start/);
		await expect(getBranchCompare(repo, { baseRef: "--exec=touch bad", headRef: "HEAD" })).rejects.toThrow(
			/must not start/,
		);
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

	it("rejects rebase refs that look like git options", async () => {
		const repo = await createRepo();

		await expect(rebaseFromBase(repo, "--exec=touch should-not-run")).rejects.toThrow(/must not start/);
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

	it("returns unquoted branch compare paths", async () => {
		const repo = await createRepo();
		await runGit(["checkout", "-b", "feature"], repo);
		await writeFile(join(repo, "café.txt"), "feature\n", "utf8");
		await stageFile(repo, "café.txt");
		await commitStagedChanges(repo, "Add unicode path");

		const compare = await getBranchCompare(repo, { baseRef: "main", headRef: "feature" });

		expect(compare.files).toContainEqual(expect.objectContaining({ path: "café.txt", status: "added" }));
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
		const status = await getStatus(repo);
		expect(status.conflictOperation).toBe("merge");
		expect(status.entries).toContainEqual(
			expect.objectContaining({ path: "README.md", area: "unstaged", conflictKind: "both_modified" }),
		);

		await abortConflictOperation(repo, "merge");

		expect((await getStatus(repo)).conflictOperation).toBe("unknown");
	});
});
