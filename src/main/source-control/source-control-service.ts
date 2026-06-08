import { realpath } from "node:fs/promises";
import path from "node:path";
import type {
	SourceControlAbortConflictInput,
	SourceControlBranchCompareInput,
	SourceControlBulkDiscardInput,
	SourceControlBulkPathsInput,
	SourceControlCommitInput,
	SourceControlCreatePullRequestInput,
	SourceControlDiscardInput,
	SourceControlGetDiffInput,
	SourceControlPathInput,
	SourceControlProjectInput,
	SourceControlRebaseInput,
	SourceControlRemoteActionInput,
} from "../../shared/source-control/schemas";
import type { GitStatusResult } from "../../shared/source-control/types";
import { checkIgnoredPaths } from "../git/check-ignored-paths";
import { isGitRepo } from "../git/repo";
import { gitExecFileAsync } from "../git/runner";
import {
	abortConflictOperation,
	bulkDiscardChanges,
	bulkStageFiles,
	bulkUnstageFiles,
	commitStagedChanges,
	createPullRequest,
	discardChanges,
	fastForwardBranch,
	fetchRemote,
	getBranchCompare,
	getDiff,
	getPullRequestInfo,
	getStatus,
	getUpstreamStatus,
	publishBranch,
	pullRemote,
	pushRemote,
	rebaseFromBase,
	stageFile,
	syncRemote,
	unstageFile,
} from "../git/status";
import type { ProjectService } from "../projects/project-service";
import { normalizeRelativePath, WorkspacePathError } from "../workspace-files/path-guard";

export class NotAGitRepositoryError extends Error {
	constructor() {
		super("Project is not a git repository.");
		this.name = "NotAGitRepositoryError";
	}
}

export type SourceControlServiceDeps = {
	projectService: ProjectService;
	initializeGitRepository: (projectPath: string) => Promise<void>;
};

const assertSafeRelativePath = (relativePath: string): string => {
	const normalized = normalizeRelativePath(relativePath);
	if (normalized.length === 0) {
		throw new WorkspacePathError("A file path is required.");
	}
	return normalized;
};

const resolveProjectRoot = async (deps: SourceControlServiceDeps, projectId: string): Promise<string> => {
	const workspace = await deps.projectService.getSessionWorkspace({ projectId });
	return workspace.path;
};

const assertGitRepo = async (projectRoot: string): Promise<void> => {
	if (!(await isGitRepo(projectRoot))) {
		throw new NotAGitRepositoryError();
	}
};

const assertProjectIsRepositoryRoot = async (projectRoot: string): Promise<void> => {
	const { stdout } = await gitExecFileAsync(["rev-parse", "--show-toplevel"], { cwd: projectRoot });
	const repositoryRoot = path.resolve(await realpath(stdout.trim()));
	const selectedRoot = path.resolve(await realpath(projectRoot));
	if (repositoryRoot !== selectedRoot) {
		throw new Error("Source control is only supported from the repository root.");
	}
};

export type SourceControlService = {
	getStatus: (input: SourceControlProjectInput) => Promise<GitStatusResult>;
	checkIgnored: (input: SourceControlBulkPathsInput) => Promise<{ ignoredPaths: string[] }>;
	stage: (input: SourceControlPathInput) => Promise<void>;
	unstage: (input: SourceControlPathInput) => Promise<void>;
	discard: (input: SourceControlDiscardInput) => Promise<void>;
	bulkStage: (input: SourceControlBulkPathsInput) => Promise<void>;
	bulkUnstage: (input: SourceControlBulkPathsInput) => Promise<void>;
	bulkDiscard: (input: SourceControlBulkDiscardInput) => Promise<void>;
	initializeRepository: (input: SourceControlProjectInput) => Promise<void>;
	commit: (input: SourceControlCommitInput) => ReturnType<typeof commitStagedChanges>;
	getDiff: (input: SourceControlGetDiffInput) => ReturnType<typeof getDiff>;
	getUpstreamStatus: (input: SourceControlProjectInput) => ReturnType<typeof getUpstreamStatus>;
	fetch: (input: SourceControlRemoteActionInput) => Promise<void>;
	push: (input: SourceControlRemoteActionInput) => Promise<void>;
	pull: (input: SourceControlRemoteActionInput) => Promise<void>;
	sync: (input: SourceControlRemoteActionInput) => Promise<void>;
	fastForward: (input: SourceControlRemoteActionInput) => Promise<void>;
	publish: (input: SourceControlRemoteActionInput) => Promise<void>;
	rebaseFromBase: (input: SourceControlRebaseInput) => Promise<void>;
	getBranchCompare: (input: SourceControlBranchCompareInput) => ReturnType<typeof getBranchCompare>;
	abortConflict: (input: SourceControlAbortConflictInput) => Promise<void>;
	createPullRequest: (input: SourceControlCreatePullRequestInput) => ReturnType<typeof createPullRequest>;
	getPullRequestInfo: (input: SourceControlProjectInput) => ReturnType<typeof getPullRequestInfo>;
};

export const createSourceControlService = (deps: SourceControlServiceDeps): SourceControlService => {
	const withProjectRoot = async <T>(projectId: string, operation: (projectRoot: string) => Promise<T>): Promise<T> => {
		const projectRoot = await resolveProjectRoot(deps, projectId);
		await assertGitRepo(projectRoot);
		await assertProjectIsRepositoryRoot(projectRoot);
		return operation(projectRoot);
	};

	return {
		getStatus: (input) => withProjectRoot(input.projectId, (projectRoot) => getStatus(projectRoot)),

		checkIgnored: (input) =>
			withProjectRoot(input.projectId, async (projectRoot) => {
				const relativePaths = input.relativePaths.map(assertSafeRelativePath);
				const ignoredPaths = await checkIgnoredPaths(projectRoot, relativePaths);
				return { ignoredPaths };
			}),

		stage: (input) =>
			withProjectRoot(input.projectId, async (projectRoot) => {
				await stageFile(projectRoot, assertSafeRelativePath(input.relativePath));
			}),

		unstage: (input) =>
			withProjectRoot(input.projectId, async (projectRoot) => {
				await unstageFile(projectRoot, assertSafeRelativePath(input.relativePath));
			}),

		discard: (input) =>
			withProjectRoot(input.projectId, async (projectRoot) => {
				await discardChanges(projectRoot, assertSafeRelativePath(input.relativePath), input.area);
			}),

		bulkStage: (input) =>
			withProjectRoot(input.projectId, async (projectRoot) => {
				const relativePaths = input.relativePaths.map(assertSafeRelativePath);
				await bulkStageFiles(projectRoot, relativePaths);
			}),

		bulkUnstage: (input) =>
			withProjectRoot(input.projectId, async (projectRoot) => {
				const relativePaths = input.relativePaths.map(assertSafeRelativePath);
				await bulkUnstageFiles(projectRoot, relativePaths);
			}),

		bulkDiscard: (input) =>
			withProjectRoot(input.projectId, async (projectRoot) => {
				const entries = input.entries.map((entry) => ({
					relativePath: assertSafeRelativePath(entry.relativePath),
					area: entry.area,
				}));
				await bulkDiscardChanges(projectRoot, entries);
			}),

		initializeRepository: async (input) => {
			const projectRoot = await resolveProjectRoot(deps, input.projectId);
			if (await isGitRepo(projectRoot)) {
				return;
			}
			await deps.initializeGitRepository(projectRoot);
		},

		commit: (input) =>
			withProjectRoot(input.projectId, (projectRoot) => commitStagedChanges(projectRoot, input.message)),

		getDiff: (input) =>
			withProjectRoot(input.projectId, (projectRoot) => {
				const relativePath = assertSafeRelativePath(input.relativePath);
				if (input.kind === "branch") {
					return getDiff(projectRoot, {
						kind: input.kind,
						relativePath,
						baseRef: input.baseRef,
						headRef: input.headRef,
					});
				}
				if (input.kind === "commit") {
					return getDiff(projectRoot, {
						kind: input.kind,
						relativePath,
						commitRef: input.commitRef,
					});
				}
				return getDiff(projectRoot, { kind: input.kind, relativePath });
			}),

		getUpstreamStatus: (input) => withProjectRoot(input.projectId, (projectRoot) => getUpstreamStatus(projectRoot)),

		fetch: (input) => withProjectRoot(input.projectId, (projectRoot) => fetchRemote(projectRoot)),
		push: (input) => withProjectRoot(input.projectId, (projectRoot) => pushRemote(projectRoot)),
		pull: (input) => withProjectRoot(input.projectId, (projectRoot) => pullRemote(projectRoot)),
		sync: (input) => withProjectRoot(input.projectId, (projectRoot) => syncRemote(projectRoot)),
		fastForward: (input) => withProjectRoot(input.projectId, (projectRoot) => fastForwardBranch(projectRoot)),
		publish: (input) => withProjectRoot(input.projectId, (projectRoot) => publishBranch(projectRoot)),
		rebaseFromBase: (input) =>
			withProjectRoot(input.projectId, (projectRoot) => rebaseFromBase(projectRoot, input.baseRef)),
		getBranchCompare: (input) =>
			withProjectRoot(input.projectId, (projectRoot) =>
				getBranchCompare(projectRoot, { baseRef: input.baseRef, headRef: input.headRef }),
			),
		abortConflict: (input) =>
			withProjectRoot(input.projectId, (projectRoot) => abortConflictOperation(projectRoot, input.operation)),
		createPullRequest: (input) =>
			withProjectRoot(input.projectId, (projectRoot) =>
				createPullRequest(projectRoot, { title: input.title, body: input.body }),
			),
		getPullRequestInfo: (input) => withProjectRoot(input.projectId, (projectRoot) => getPullRequestInfo(projectRoot)),
	};
};
