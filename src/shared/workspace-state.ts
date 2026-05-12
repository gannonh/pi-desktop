import { z } from "zod";

export const WorkspaceSummarySchema = z.strictObject({
	id: z.string().min(1),
	name: z.string().min(1),
	path: z.string().min(1),
});

export const SessionSummarySchema = z.strictObject({
	id: z.string().min(1),
	title: z.string().min(1),
	status: z.enum(["idle", "running", "failed"]),
	lastUpdatedLabel: z.string().min(1),
});

export const PanelSummarySchema = z.strictObject({
	id: z.string().min(1),
	kind: z.enum(["files", "diffs", "terminal"]),
	title: z.string().min(1),
	summary: z.string().min(1),
});

export const WorkspaceStateSchema = z.strictObject({
	activeWorkspace: WorkspaceSummarySchema,
	sessions: z.array(SessionSummarySchema),
	panels: z.array(PanelSummarySchema),
});

export type WorkspaceSummary = z.infer<typeof WorkspaceSummarySchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type PanelSummary = z.infer<typeof PanelSummarySchema>;
export type WorkspaceState = z.infer<typeof WorkspaceStateSchema>;
