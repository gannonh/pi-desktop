import type { GitStatusResult } from "../../shared/source-control/types";
import type {
	SourceControlBulkPathsInput,
	SourceControlPathInput,
	SourceControlProjectInput,
} from "../../shared/source-control/schemas";
import { normalizeRelativePath, WorkspacePathError } from "../workspace-files/path-guard";
import { checkIgnoredPaths } from "../git/check-ignored-paths";
import { isGitRepo } from "../git/repo";
import {
	bulkDiscardChanges,
	bulkStageFiles,
	bulkUnstageFiles,
	discardChanges,
	getStatus,
	stageFile,
	unstageFile,
} from "../git/status";
import type { ProjectService } from "../projects/project-service";

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

const assertGitRepo = (projectRoot: string): void => {
	if (!isGitRepo(projectRoot)) {
		throw new Error("Project is not a git repository.");
	}
};

export type SourceControlService = {
	getStatus: (input: SourceControlProjectInput) => Promise<GitStatusResult>;
	checkIgnored: (input: SourceControlBulkPathsInput) => Promise<{ ignoredPaths: string[] }>;
	stage: (input: SourceControlPathInput) => Promise<void>;
	unstage: (input: SourceControlPathInput) => Promise<void>;
	discard: (input: SourceControlPathInput) => Promise<void>;
	bulkStage: (input: SourceControlBulkPathsInput) => Promise<void>;
	bulkUnstage: (input: SourceControlBulkPathsInput) => Promise<void>;
	bulkDiscard: (input: SourceControlBulkPathsInput) => Promise<void>;
	initializeRepository: (input: SourceControlProjectInput) => Promise<void>;
};

export const createSourceControlService = (deps: SourceControlServiceDeps): SourceControlService => {
	const withProjectRoot = async <T>(
		projectId: string,
		operation: (projectRoot: string) => Promise<T>,
	): Promise<T> => {
		const projectRoot = await resolveProjectRoot(deps, projectId);
		assertGitRepo(projectRoot);
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
				await discardChanges(projectRoot, assertSafeRelativePath(input.relativePath));
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
				const relativePaths = input.relativePaths.map(assertSafeRelativePath);
				await bulkDiscardChanges(projectRoot, relativePaths);
			}),

		initializeRepository: async (input) => {
			const projectRoot = await resolveProjectRoot(deps, input.projectId);
			if (isGitRepo(projectRoot)) {
				return;
			}
			await deps.initializeGitRepository(projectRoot);
		},
	};
};
