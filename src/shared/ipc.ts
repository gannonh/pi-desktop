import { z } from "zod";
import { ProjectStateViewSchema, type ProjectStateView } from "./project-state";
import { createResultSchema, type IpcResult } from "./result";

export const IpcChannels = {
	appGetVersion: "app:getVersion",
	projectGetState: "project:getState",
	projectCreateFromScratch: "project:createFromScratch",
	projectAddExistingFolder: "project:addExistingFolder",
	projectSelect: "project:select",
	projectRename: "project:rename",
	projectRemove: "project:remove",
	projectOpenInFinder: "project:openInFinder",
	projectLocateFolder: "project:locateFolder",
	projectSetPinned: "project:setPinned",
	projectCheckAvailability: "project:checkAvailability",
	chatCreate: "chat:create",
	chatSelect: "chat:select",
} as const;

export const AppVersionSchema = z.strictObject({
	name: z.string().min(1),
	version: z.string().min(1),
});

export const ProjectIdInputSchema = z.strictObject({
	projectId: z.string().min(1),
});

export const ProjectRenameInputSchema = z.strictObject({
	projectId: z.string().min(1),
	displayName: z.string().min(1),
});

export const ProjectPinnedInputSchema = z.strictObject({
	projectId: z.string().min(1),
	pinned: z.boolean(),
});

export const ChatCreateInputSchema = z.strictObject({
	projectId: z.string().min(1),
});

export const ChatSelectionInputSchema = z.strictObject({
	projectId: z.string().min(1),
	chatId: z.string().min(1),
});

export const AppVersionResultSchema = createResultSchema(AppVersionSchema);
export const ProjectStateViewResultSchema = createResultSchema(ProjectStateViewSchema);

export type AppVersion = z.infer<typeof AppVersionSchema>;
export type ProjectIdInput = z.infer<typeof ProjectIdInputSchema>;
export type ProjectRenameInput = z.infer<typeof ProjectRenameInputSchema>;
export type ProjectPinnedInput = z.infer<typeof ProjectPinnedInputSchema>;
export type ChatCreateInput = z.infer<typeof ChatCreateInputSchema>;
export type ChatSelectionInput = z.infer<typeof ChatSelectionInputSchema>;
export type AppVersionResult = IpcResult<AppVersion>;
export type ProjectStateViewResult = IpcResult<ProjectStateView>;
