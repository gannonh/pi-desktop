import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { createGitChildProcessEnvironment, initializeGitRepository } from "../../src/main/projects/git";
import { createSourceControlService } from "../../src/main/source-control/source-control-service";
import type { ProjectService } from "../../src/main/projects/project-service";

const execFileAsync = promisify(execFile);

const runGit = (args: string[], cwd: string) =>
	execFileAsync("git", args, { cwd, env: createGitChildProcessEnvironment() });

describe("source control service", () => {
	let repoDir = "";
	const projectId = "project:test";

	afterEach(async () => {
		if (repoDir) {
			await rm(repoDir, { recursive: true, force: true });
			repoDir = "";
		}
	});

	const createService = () => {
		const projectService = {
			getSessionWorkspace: async () => ({
				projectId,
				displayName: "test",
				path: repoDir,
			}),
		} as Pick<ProjectService, "getSessionWorkspace">;

		return createSourceControlService({
			projectService: projectService as ProjectService,
			initializeGitRepository: initializeGitRepository,
		});
	};

	const createRepo = async () => {
		repoDir = await mkdtemp(join(tmpdir(), "pi-source-control-service-"));
		await initializeGitRepository(repoDir);
		await writeFile(join(repoDir, "README.md"), "# hello\n", "utf8");
		await runGit(["add", "README.md"], repoDir);
		await runGit(["commit", "-m", "initial"], repoDir);
	};

	it("returns live status for a project", async () => {
		await createRepo();
		await writeFile(join(repoDir, "new.txt"), "new\n", "utf8");

		const service = createService();
		const status = await service.getStatus({ projectId });

		expect(status.entries).toContainEqual(
			expect.objectContaining({ path: "new.txt", area: "untracked", status: "untracked" }),
		);
	});

	it("stages files within the project root", async () => {
		await createRepo();
		await writeFile(join(repoDir, "tracked.txt"), "tracked\n", "utf8");

		const service = createService();
		await service.stage({ projectId, relativePath: "tracked.txt" });
		const status = await service.getStatus({ projectId });

		expect(status.entries).toContainEqual(
			expect.objectContaining({ path: "tracked.txt", area: "staged", status: "added" }),
		);
	});

	it("rejects paths outside the project root", async () => {
		await createRepo();
		const service = createService();

		await expect(service.stage({ projectId, relativePath: "../escape.txt" })).rejects.toThrow();
		await expect(service.discard({ projectId, relativePath: "../escape.txt" })).rejects.toThrow();
	});
});
