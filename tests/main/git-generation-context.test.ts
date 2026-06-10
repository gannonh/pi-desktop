import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { getPullRequestGenerationContext, getStagedGenerationContext } from "../../src/main/git/generation-context";
import { createGitChildProcessEnvironment, initializeGitRepository } from "../../src/main/projects/git";

const execFileAsync = promisify(execFile);

const runGit = (args: string[], cwd: string) =>
	execFileAsync("git", args, { cwd, env: createGitChildProcessEnvironment() });

describe("git generation context", () => {
	let repoDir = "";

	afterEach(async () => {
		if (repoDir) {
			await rm(repoDir, { recursive: true, force: true });
			repoDir = "";
		}
	});

	const createRepo = async () => {
		repoDir = await mkdtemp(join(tmpdir(), "pi-git-generation-context-"));
		await initializeGitRepository(repoDir);
		await writeFile(join(repoDir, "README.md"), "# hello\n", "utf8");
		await runGit(["add", "README.md"], repoDir);
		await runGit(["commit", "-m", "initial"], repoDir);
	};

	it("collects staged diff context for commit generation", async () => {
		await createRepo();
		await writeFile(join(repoDir, "README.md"), "# staged\n", "utf8");
		await runGit(["add", "README.md"], repoDir);

		const context = await getStagedGenerationContext(repoDir);

		expect(context.stagedPaths).toEqual(["README.md"]);
		expect(context.patch).toContain("staged");
	});

	it("rejects commit generation when nothing is staged", async () => {
		await createRepo();
		await writeFile(join(repoDir, "README.md"), "# unstaged\n", "utf8");

		await expect(getStagedGenerationContext(repoDir)).rejects.toThrow(/Stage changes/);
	});

	it("collects branch compare diff context for pull request generation", async () => {
		await createRepo();
		await runGit(["checkout", "-b", "feature"], repoDir);
		await writeFile(join(repoDir, "README.md"), "# feature\n", "utf8");
		await runGit(["add", "README.md"], repoDir);
		await runGit(["commit", "-m", "feature change"], repoDir);

		const context = await getPullRequestGenerationContext(repoDir, { baseRef: "main", headRef: "feature" });

		expect(context.files).toEqual([expect.objectContaining({ path: "README.md", status: "modified" })]);
		expect(context.patch).toContain("feature");
	});
});
