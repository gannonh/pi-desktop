import { z } from "zod";
import { createResultSchema, type IpcResult } from "./result";
import { WorkspaceStateSchema, type WorkspaceState } from "./workspace-state";

export const IpcChannels = {
	appGetVersion: "app:getVersion",
	workspaceGetInitialState: "workspace:getInitialState",
	workspaceSelectFolder: "workspace:selectFolder",
} as const;

export const AppVersionSchema = z.object({
	name: z.string().min(1),
	version: z.string().min(1),
});

export const SelectFolderResponseSchema = z.discriminatedUnion("status", [
	z.object({
		status: z.literal("selected"),
		path: z.string().min(1),
	}),
	z.object({
		status: z.literal("cancelled"),
	}),
]);

export const AppVersionResultSchema = createResultSchema(AppVersionSchema);
export const WorkspaceStateResultSchema = createResultSchema(WorkspaceStateSchema);
export const SelectFolderResultSchema = createResultSchema(SelectFolderResponseSchema);

export type AppVersion = z.infer<typeof AppVersionSchema>;
export type SelectFolderResponse = z.infer<typeof SelectFolderResponseSchema>;
export type AppVersionResult = IpcResult<AppVersion>;
export type WorkspaceStateResult = IpcResult<WorkspaceState>;
export type SelectFolderResult = IpcResult<SelectFolderResponse>;
