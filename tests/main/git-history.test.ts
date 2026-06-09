import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { getCommitFiles, getHistory } from "../../src/main/git/history";
import { commitStagedChanges, stageFile } from "../../src/main/git/status";
import { createGitChildProcessEnvironment, initializeGitRepository } from "../../src/main/projects/git";

const execFileAsync = promisify(execFile);

const runGit = (args: string[], cwd: string) =>
	execFileAsync("git", args, { cwd, env: createGitChildProcessEnvironment() });

describe("git history operations", () => {
	let repoDir = "";

	afterEach(async () => {
		if (repoDir) {
			await rm(repoDir, { recursive: true, force: true });
			repoDir = "";
		}
	});

	const createRepo = async () => {
		repoDir = await mkdtemp(join(tmpdir(), "pi-git-history-"));
		await initializeGitRepository(repoDir);
		await writeFile(join(repoDir, "README.md"), "# hello\n", "utf8");
		await runGit(["add", "README.md"], repoDir);
		await runGit(["commit", "-m", "initial"], repoDir);
		return repoDir;
	};

	it("returns recent commits with metadata", async () => {
		const repo = await createRepo();
		await writeFile(join(repo, "README.md"), "# changed\n", "utf8");
		await stageFile(repo, "README.md");
		await commitStagedChanges(repo, "Update readme");

		const history = await getHistory(repo);

		expect(history.entries).toHaveLength(2);
		expect(history.entries[0]).toMatchObject({
			subject: "Update readme",
			author: expect.any(String),
			shortSha: expect.stringMatching(/^[a-f0-9]{7,}$/),
		});
		expect(history.incomingCount).toBe(0);
		expect(history.outgoingCount).toBe(0);
	});

	it("marks outgoing commits when upstream exists", async () => {
		const repo = await createRepo();
		const remoteDir = await mkdtemp(join(tmpdir(), "pi-git-history-remote-"));
		try {
			await runGit(["init", "--bare"], remoteDir);
			await runGit(["remote", "add", "origin", remoteDir], repo);
			await runGit(["push", "-u", "origin", "main"], repo);
			await writeFile(join(repo, "README.md"), "# local only\n", "utf8");
			await stageFile(repo, "README.md");
			await commitStagedChanges(repo, "Local only");

			const history = await getHistory(repo);

			expect(history.outgoingCount).toBe(1);
			expect(history.entries[0]?.isOutgoing).toBe(true);
			expect(history.entries[1]?.isOutgoing).toBe(false);
		} finally {
			await rm(remoteDir, { recursive: true, force: true });
		}
	});

	it("returns changed files for a commit", async () => {
		const repo = await createRepo();
		await mkdir(join(repo, "src"), { recursive: true });
		await writeFile(join(repo, "src", "app.ts"), "export {}\n", "utf8");
		await stageFile(repo, "src/app.ts");
		await commitStagedChanges(repo, "Add app");

		const headSha = (await runGit(["rev-parse", "HEAD"], repo)).stdout.trim();
		const files = await getCommitFiles(repo, { commitRef: headSha });

		expect(files.commitRef).toBe(headSha);
		expect(files.files).toEqual([expect.objectContaining({ path: "src/app.ts", status: "added" })]);
	});

	it("returns changed files for the root commit", async () => {
		const repo = await createRepo();
		const rootSha = (await runGit(["rev-list", "--max-parents=0", "HEAD"], repo)).stdout.trim();
		const files = await getCommitFiles(repo, { commitRef: rootSha });

		expect(files.commitRef).toBe(rootSha);
		expect(files.files).toEqual([expect.objectContaining({ path: "README.md", status: "added" })]);
	});
});
