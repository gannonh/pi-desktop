import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { initializeGitRepository } from "../../src/main/projects/git";

const execFileAsync = promisify(execFile);

describe("git project initialization", () => {
	it("initializes git and git branch --show-current returns main", async () => {
		const projectDir = await mkdtemp(join(tmpdir(), "pi-git-project-"));

		await initializeGitRepository(projectDir);
		const { stdout } = await execFileAsync("git", ["branch", "--show-current"], { cwd: projectDir });

		expect(stdout.trim()).toBe("main");
	});
});
