import { z } from "zod";
import { createResultSchema } from "./result";

export const WORKSPACE_FILES_MAX_BYTES = 2 * 1024 * 1024;

export const WorkspaceFilesPathInputSchema = z.strictObject({
	projectId: z.string().min(1),
	relativePath: z.string(),
});

export const WorkspaceFilesWriteInputSchema = z.strictObject({
	projectId: z.string().min(1),
	relativePath: z.string().min(1),
	content: z.string(),
});

export const WorkspaceDirectoryEntrySchema = z.strictObject({
	name: z.string().min(1),
	relativePath: z.string(),
	kind: z.enum(["file", "directory"]),
});

export const WorkspaceListDirectoryPayloadSchema = z.strictObject({
	entries: z.array(WorkspaceDirectoryEntrySchema),
});

export const WorkspaceReadFileTextPayloadSchema = z.strictObject({
	kind: z.literal("text"),
	content: z.string(),
	size: z.number().int().nonnegative(),
});

export const WorkspaceReadFileStatusPayloadSchema = z.discriminatedUnion("kind", [
	WorkspaceReadFileTextPayloadSchema,
	z.strictObject({ kind: z.literal("binary") }),
	z.strictObject({ kind: z.literal("too_large"), size: z.number().int().nonnegative() }),
	z.strictObject({ kind: z.literal("not_found") }),
	z.strictObject({ kind: z.literal("unsupported") }),
]);

export const WorkspaceWriteFilePayloadSchema = z.strictObject({
	relativePath: z.string().min(1),
	size: z.number().int().nonnegative(),
});

export const WorkspaceListDirectoryResultSchema = createResultSchema(WorkspaceListDirectoryPayloadSchema);
export const WorkspaceReadFileResultSchema = createResultSchema(WorkspaceReadFileStatusPayloadSchema);
export const WorkspaceWriteFileResultSchema = createResultSchema(WorkspaceWriteFilePayloadSchema);

export type WorkspaceFilesPathInput = z.infer<typeof WorkspaceFilesPathInputSchema>;
export type WorkspaceFilesWriteInput = z.infer<typeof WorkspaceFilesWriteInputSchema>;
export type WorkspaceDirectoryEntry = z.infer<typeof WorkspaceDirectoryEntrySchema>;
export type WorkspaceListDirectoryPayload = z.infer<typeof WorkspaceListDirectoryPayloadSchema>;
export type WorkspaceReadFileStatusPayload = z.infer<typeof WorkspaceReadFileStatusPayloadSchema>;
export type WorkspaceWriteFilePayload = z.infer<typeof WorkspaceWriteFilePayloadSchema>;
export type WorkspaceListDirectoryResult = z.infer<typeof WorkspaceListDirectoryResultSchema>;
export type WorkspaceReadFileResult = z.infer<typeof WorkspaceReadFileResultSchema>;
export type WorkspaceWriteFileResult = z.infer<typeof WorkspaceWriteFileResultSchema>;
