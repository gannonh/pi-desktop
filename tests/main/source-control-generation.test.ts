import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGitChildProcessEnvironment, initializeGitRepository } from "../../src/main/projects/git";
import type { ProjectService } from "../../src/main/projects/project-service";
import {
	createSourceControlService,
	SourceControlGenerationCancelledError,
} from "../../src/main/source-control/source-control-service";
import {
	createSourceControlGenerationRegistry,
	type SourceControlTextGenerator,
} from "../../src/main/source-control/source-control-text-generator";
import { COMMIT_MESSAGE_SYSTEM_PROMPT } from "../../src/main/source-control/source-control-prompts";

const execFileAsync = promisify(execFile);

const runGit = (args: string[], cwd: string) =>
	execFileAsync("git", args, { cwd, env: createGitChildProcessEnvironment() });

describe("source control generation service", () => {
	let repoDir = "";
	const projectId = "project:test";

	afterEach(async () => {
		if (repoDir) {
			await rm(repoDir, { recursive: true, force: true });
			repoDir = "";
		}
	});

	const createRepo = async () => {
		repoDir = await mkdtemp(join(tmpdir(), "pi-source-control-generation-"));
		await initializeGitRepository(repoDir);
		await writeFile(join(repoDir, "README.md"), "# hello\n", "utf8");
		await runGit(["add", "README.md"], repoDir);
		await runGit(["commit", "-m", "initial"], repoDir);
	};

	const createService = (textGenerator: SourceControlTextGenerator) => {
		const projectService = {
			getSessionWorkspace: async () => ({
				projectId,
				displayName: "test",
				path: repoDir,
			}),
		} as Pick<ProjectService, "getSessionWorkspace">;

		return createSourceControlService({
			projectService: projectService as ProjectService,
			initializeGitRepository,
			textGenerator,
			generationRegistry: createSourceControlGenerationRegistry(),
		});
	};

	it("generates a commit message from staged diff context", async () => {
		await createRepo();
		await writeFile(join(repoDir, "README.md"), "# generated\n", "utf8");
		await runGit(["add", "README.md"], repoDir);

		const generate = vi.fn(async ({ systemPrompt, userPrompt }) => {
			expect(systemPrompt).toBe(COMMIT_MESSAGE_SYSTEM_PROMPT);
			expect(userPrompt).toContain("Staged files (1):");
			expect(userPrompt).toContain("- README.md");
			expect(userPrompt).toContain("generated");
			return "feat(changes): update readme";
		});

		const service = createService({ generate });
		const result = await service.generateCommitMessage({ projectId, requestId: "req-1" });

		expect(generate).toHaveBeenCalledOnce();
		expect(result.message).toBe("feat(changes): update readme");
	});

	it("generates pull request fields from branch compare context", async () => {
		await createRepo();
		await runGit(["checkout", "-b", "feature"], repoDir);
		await writeFile(join(repoDir, "README.md"), "# pr\n", "utf8");
		await runGit(["add", "README.md"], repoDir);
		await runGit(["commit", "-m", "feature"], repoDir);

		const generate = vi.fn(async () => '{"title":"Feature PR","body":"Summary"}');
		const service = createService({ generate });
		const result = await service.generatePullRequestFields({
			projectId,
			requestId: "req-2",
			baseRef: "main",
			headRef: "feature",
		});

		expect(generate).toHaveBeenCalledOnce();
		expect(result).toEqual({ title: "Feature PR", body: "Summary" });
	});

	it("cancels in-flight generation via the registry", async () => {
		await createRepo();
		await writeFile(join(repoDir, "README.md"), "# cancel\n", "utf8");
		await runGit(["add", "README.md"], repoDir);

		let observedSignal: AbortSignal | undefined;
		const generate = vi.fn(({ signal }: { signal: AbortSignal }) => {
			observedSignal = signal;
			if (signal.aborted) {
				return Promise.reject(new SourceControlGenerationCancelledError());
			}
			return new Promise<string>((_resolve, reject) => {
				signal.addEventListener("abort", () => {
					reject(new SourceControlGenerationCancelledError());
				});
			});
		});
		const service = createService({ generate });

		const pending = service.generateCommitMessage({ projectId, requestId: "req-cancel" });
		await service.cancelGeneration({ requestId: "req-cancel" });

		await expect(pending).rejects.toBeInstanceOf(SourceControlGenerationCancelledError);
		expect(observedSignal?.aborted).toBe(true);
	});

	it("surfaces generator failures as operation errors", async () => {
		await createRepo();
		await writeFile(join(repoDir, "README.md"), "# fail\n", "utf8");
		await runGit(["add", "README.md"], repoDir);

		const service = createService({
			generate: vi.fn(async () => {
				throw new Error("No API key for openai/gpt-5.");
			}),
		});

		await expect(service.generateCommitMessage({ projectId, requestId: "req-3" })).rejects.toThrow(/No API key/);
	});
});
