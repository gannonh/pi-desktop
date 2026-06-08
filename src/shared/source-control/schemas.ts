import { z } from "zod";
import { createResultSchema } from "../result";

export const SourceControlProjectInputSchema = z.strictObject({
	projectId: z.string().min(1),
});

export const SourceControlPathInputSchema = z.strictObject({
	projectId: z.string().min(1),
	relativePath: z.string().min(1),
});

export const SourceControlBulkPathsInputSchema = z.strictObject({
	projectId: z.string().min(1),
	relativePaths: z.array(z.string().min(1)).min(1),
});

export const SourceControlCommitInputSchema = z.strictObject({
	projectId: z.string().min(1),
	message: z.string().trim().min(1),
});

export const GitFileStatusSchema = z.enum(["modified", "added", "deleted", "renamed", "untracked", "copied"]);
export const GitStagingAreaSchema = z.enum(["staged", "unstaged", "untracked"]);
export const GitConflictOperationSchema = z.enum(["merge", "rebase", "cherry-pick", "unknown"]);

export const SourceControlDiscardInputSchema = SourceControlPathInputSchema.extend({
	area: GitStagingAreaSchema,
});

export const SourceControlBulkDiscardInputSchema = z.strictObject({
	projectId: z.string().min(1),
	entries: z.array(z.strictObject({ relativePath: z.string().min(1), area: GitStagingAreaSchema })).min(1),
});

export const GitConflictKindSchema = z.enum([
	"both_modified",
	"both_added",
	"both_deleted",
	"added_by_us",
	"added_by_them",
	"deleted_by_us",
	"deleted_by_them",
]);

export const GitStatusEntrySchema = z.strictObject({
	path: z.string(),
	status: GitFileStatusSchema,
	area: GitStagingAreaSchema,
	oldPath: z.string().optional(),
	conflictKind: GitConflictKindSchema.optional(),
	added: z.number().int().nonnegative().optional(),
	removed: z.number().int().nonnegative().optional(),
});

export const GitUpstreamStatusSchema = z.strictObject({
	hasUpstream: z.boolean(),
	upstreamName: z.string().optional(),
	ahead: z.number().int().nonnegative(),
	behind: z.number().int().nonnegative(),
});

export const GitStatusPayloadSchema = z.strictObject({
	entries: z.array(GitStatusEntrySchema),
	conflictOperation: GitConflictOperationSchema,
	head: z.string().optional(),
	branch: z.string().optional(),
	upstreamStatus: GitUpstreamStatusSchema.optional(),
	ignoredPaths: z.array(z.string()).optional(),
});

export const SourceControlEmptyPayloadSchema = z.strictObject({});

export const GitDiffKindSchema = z.enum(["unstaged", "staged", "untracked", "branch", "commit"]);

export const SourceControlGetDiffInputSchema = z.discriminatedUnion("kind", [
	z.strictObject({
		projectId: z.string().min(1),
		relativePath: z.string().min(1),
		kind: z.literal("unstaged"),
	}),
	z.strictObject({
		projectId: z.string().min(1),
		relativePath: z.string().min(1),
		kind: z.literal("staged"),
	}),
	z.strictObject({
		projectId: z.string().min(1),
		relativePath: z.string().min(1),
		kind: z.literal("untracked"),
	}),
	z.strictObject({
		projectId: z.string().min(1),
		relativePath: z.string().min(1),
		kind: z.literal("branch"),
		baseRef: z.string().min(1),
		headRef: z.string().min(1),
	}),
	z.strictObject({
		projectId: z.string().min(1),
		relativePath: z.string().min(1),
		kind: z.literal("commit"),
		commitRef: z.string().min(1),
	}),
]);

export const GitDiffPayloadSchema = z.discriminatedUnion("kind", [
	z.strictObject({
		kind: z.literal("text"),
		path: z.string(),
		title: z.string(),
		patch: z.string(),
		diffKind: GitDiffKindSchema,
	}),
	z.strictObject({
		kind: z.enum(["binary", "too_large", "unsupported"]),
		path: z.string(),
		title: z.string(),
		diffKind: GitDiffKindSchema,
		message: z.string(),
	}),
]);

export const GitCommitResultSchema = z.strictObject({
	sha: z.string().regex(/^[a-f0-9]{40}$/),
	summary: z.string(),
});

export const GitBranchCompareFileSchema = z.strictObject({
	path: z.string(),
	status: GitFileStatusSchema,
	oldPath: z.string().optional(),
	added: z.number().int().nonnegative().optional(),
	removed: z.number().int().nonnegative().optional(),
});

export const GitBranchCompareResultSchema = z.strictObject({
	baseRef: z.string(),
	headRef: z.string(),
	ahead: z.number().int().nonnegative(),
	behind: z.number().int().nonnegative(),
	files: z.array(GitBranchCompareFileSchema),
});

export const SourceControlBranchCompareInputSchema = z.strictObject({
	projectId: z.string().min(1),
	baseRef: z.string().min(1),
	headRef: z.string().min(1),
});

export const SourceControlRemoteActionInputSchema = z.strictObject({
	projectId: z.string().min(1),
});

export const SourceControlRebaseInputSchema = z.strictObject({
	projectId: z.string().min(1),
	baseRef: z.string().min(1).optional(),
});

export const SourceControlAbortConflictInputSchema = z.strictObject({
	projectId: z.string().min(1),
	operation: z.enum(["merge", "rebase", "cherry-pick"]),
});

export const SourceControlCreatePullRequestInputSchema = z.strictObject({
	projectId: z.string().min(1),
	title: z.string().trim().min(1),
	body: z.string(),
});

export const SourceControlPullRequestInfoSchema = z.strictObject({
	title: z.string(),
	url: z.string(),
	state: z.enum(["open", "closed", "merged", "unknown"]),
});

export const SourceControlGetStatusResultSchema = createResultSchema(GitStatusPayloadSchema);
export const SourceControlMutationResultSchema = createResultSchema(SourceControlEmptyPayloadSchema);
export const SourceControlCheckIgnoredResultSchema = createResultSchema(
	z.strictObject({ ignoredPaths: z.array(z.string()) }),
);
export const SourceControlGetDiffResultSchema = createResultSchema(GitDiffPayloadSchema);
export const SourceControlCommitResultSchema = createResultSchema(GitCommitResultSchema);
export const SourceControlUpstreamStatusResultSchema = createResultSchema(GitUpstreamStatusSchema);
export const SourceControlBranchCompareResultSchema = createResultSchema(GitBranchCompareResultSchema);
export const SourceControlPullRequestInfoResultSchema = createResultSchema(SourceControlPullRequestInfoSchema);

export type SourceControlProjectInput = z.infer<typeof SourceControlProjectInputSchema>;
export type SourceControlPathInput = z.infer<typeof SourceControlPathInputSchema>;
export type SourceControlDiscardInput = z.infer<typeof SourceControlDiscardInputSchema>;
export type SourceControlBulkPathsInput = z.infer<typeof SourceControlBulkPathsInputSchema>;
export type SourceControlBulkDiscardInput = z.infer<typeof SourceControlBulkDiscardInputSchema>;
export type SourceControlCommitInput = z.infer<typeof SourceControlCommitInputSchema>;
export type SourceControlGetDiffInput = z.infer<typeof SourceControlGetDiffInputSchema>;
export type SourceControlBranchCompareInput = z.infer<typeof SourceControlBranchCompareInputSchema>;
export type SourceControlRemoteActionInput = z.infer<typeof SourceControlRemoteActionInputSchema>;
export type SourceControlRebaseInput = z.infer<typeof SourceControlRebaseInputSchema>;
export type SourceControlAbortConflictInput = z.infer<typeof SourceControlAbortConflictInputSchema>;
export type SourceControlCreatePullRequestInput = z.infer<typeof SourceControlCreatePullRequestInputSchema>;
export type GitStatusPayload = z.infer<typeof GitStatusPayloadSchema>;
export type SourceControlGetStatusResult = z.infer<typeof SourceControlGetStatusResultSchema>;
export type SourceControlMutationResult = z.infer<typeof SourceControlMutationResultSchema>;
export type SourceControlCheckIgnoredResult = z.infer<typeof SourceControlCheckIgnoredResultSchema>;
export type SourceControlGetDiffResult = z.infer<typeof SourceControlGetDiffResultSchema>;
export type SourceControlCommitResult = z.infer<typeof SourceControlCommitResultSchema>;
export type SourceControlUpstreamStatusResult = z.infer<typeof SourceControlUpstreamStatusResultSchema>;
export type SourceControlBranchCompareResult = z.infer<typeof SourceControlBranchCompareResultSchema>;
export type SourceControlPullRequestInfoResult = z.infer<typeof SourceControlPullRequestInfoResultSchema>;
