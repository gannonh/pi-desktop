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

export const GitFileStatusSchema = z.enum(["modified", "added", "deleted", "renamed", "untracked", "copied"]);
export const GitStagingAreaSchema = z.enum(["staged", "unstaged", "untracked"]);
export const GitConflictOperationSchema = z.enum(["merge", "rebase", "cherry-pick", "unknown"]);
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

export const SourceControlGetStatusResultSchema = createResultSchema(GitStatusPayloadSchema);
export const SourceControlMutationResultSchema = createResultSchema(SourceControlEmptyPayloadSchema);
export const SourceControlCheckIgnoredResultSchema = createResultSchema(
	z.strictObject({ ignoredPaths: z.array(z.string()) }),
);

export type SourceControlProjectInput = z.infer<typeof SourceControlProjectInputSchema>;
export type SourceControlPathInput = z.infer<typeof SourceControlPathInputSchema>;
export type SourceControlBulkPathsInput = z.infer<typeof SourceControlBulkPathsInputSchema>;
export type GitStatusPayload = z.infer<typeof GitStatusPayloadSchema>;
export type SourceControlGetStatusResult = z.infer<typeof SourceControlGetStatusResultSchema>;
export type SourceControlMutationResult = z.infer<typeof SourceControlMutationResultSchema>;
export type SourceControlCheckIgnoredResult = z.infer<typeof SourceControlCheckIgnoredResultSchema>;
