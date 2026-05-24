import { z } from "zod";
import {
	type PiSessionAbortInput,
	PiSessionAbortInputSchema,
	type PiSessionActionResult,
	PiSessionActionResultSchema,
	type PiSessionDisposeInput,
	PiSessionDisposeInputSchema,
	type PiSessionEvent,
	PiSessionEventSchema,
	type PiSessionGetDefaultSettingsInput,
	PiSessionGetDefaultSettingsInputSchema,
	type PiSessionGetSettingsInput,
	PiSessionGetSettingsInputSchema,
	type PiSessionHistoryInput,
	PiSessionHistoryInputSchema,
	type PiSessionHistoryResult,
	PiSessionHistoryResultSchema,
	type PiSessionQueueResult,
	PiSessionQueueResultSchema,
	type PiSessionRemoveQueuedMessageInput,
	PiSessionRemoveQueuedMessageInputSchema,
	type PiSessionSetDefaultModelInput,
	PiSessionSetDefaultModelInputSchema,
	type PiSessionSetDefaultThinkingLevelInput,
	PiSessionSetDefaultThinkingLevelInputSchema,
	type PiSessionSetModelInput,
	PiSessionSetModelInputSchema,
	type PiSessionSetThinkingLevelInput,
	PiSessionSetThinkingLevelInputSchema,
	type PiSessionSettingsResult,
	PiSessionSettingsResultSchema,
	type PiSessionStartInput,
	PiSessionStartInputSchema,
	type PiSessionStartResult,
	PiSessionStartResultSchema,
	type PiSessionSubmitInput,
	PiSessionSubmitInputSchema,
	type PiSessionUpdateQueuedMessageInput,
	PiSessionUpdateQueuedMessageInputSchema,
} from "./pi-session";
import { type ProjectStateView, ProjectStateViewSchema } from "./project-state";
import { createResultSchema, type IpcResult } from "./result";
import {
	type WorkspaceFilesPathInput,
	WorkspaceFilesPathInputSchema,
	type WorkspaceFilesWriteInput,
	WorkspaceFilesWriteInputSchema,
	type WorkspaceListDirectoryResult,
	WorkspaceListDirectoryResultSchema,
	type WorkspaceReadFileResult,
	WorkspaceReadFileResultSchema,
	type WorkspaceWriteFileResult,
	WorkspaceWriteFileResultSchema,
} from "./workspace-files";

export const ClipboardWriteTextInputSchema = z.strictObject({
	text: z.string(),
});

export const ClipboardWriteTextResultSchema = createResultSchema(
	z.strictObject({
		written: z.literal(true),
	}),
);

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
	chatCreateStandalone: "chat:createStandalone",
	chatSelect: "chat:select",
	chatRename: "chat:rename",
	chatSelectStandalone: "chat:selectStandalone",
	chatFork: "chat:fork",
	chatClone: "chat:clone",
	chatBranch: "chat:branch",
	piSessionStart: "pi-session:start",
	piSessionSubmit: "pi-session:submit",
	piSessionAbort: "pi-session:abort",
	piSessionHistory: "pi-session:history",
	piSessionDispose: "pi-session:dispose",
	piSessionGetSettings: "pi-session:getSettings",
	piSessionGetDefaultSettings: "pi-session:getDefaultSettings",
	piSessionSetModel: "pi-session:setModel",
	piSessionSetThinkingLevel: "pi-session:setThinkingLevel",
	piSessionSetDefaultModel: "pi-session:setDefaultModel",
	piSessionSetDefaultThinkingLevel: "pi-session:setDefaultThinkingLevel",
	piSessionUpdateQueuedMessage: "pi-session:updateQueuedMessage",
	piSessionRemoveQueuedMessage: "pi-session:removeQueuedMessage",
	piSessionEvent: "pi-session:event",
	workspaceFilesListDirectory: "workspace-files:listDirectory",
	workspaceFilesReadFile: "workspace-files:readFile",
	workspaceFilesWriteFile: "workspace-files:writeFile",
	clipboardWriteText: "clipboard:writeText",
} as const;

export const PiSessionOperationFailedCode = "pi_session.operation_failed";

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

export const ChatStandaloneCreateInputSchema = z.strictObject({});

export const ChatSelectionInputSchema = z.strictObject({
	projectId: z.string().min(1),
	chatId: z.string().min(1),
});

export const ChatRenameInputSchema = z.strictObject({
	projectId: z.string().min(1).nullable(),
	chatId: z.string().min(1),
	title: z.string().trim().min(1),
});

export const ChatStandaloneSelectionInputSchema = z.strictObject({
	chatId: z.string().min(1),
});

export const ChatForkInputSchema = z.strictObject({
	projectId: z.string().min(1),
	chatId: z.string().min(1),
});

export const ChatCloneInputSchema = ChatForkInputSchema;

export const ChatBranchInputSchema = ChatForkInputSchema.extend({
	entryId: z.string().min(1),
});

export {
	WorkspaceFilesPathInputSchema,
	WorkspaceFilesWriteInputSchema,
	WorkspaceListDirectoryResultSchema,
	WorkspaceReadFileResultSchema,
	WorkspaceWriteFileResultSchema,
};

export const AppVersionResultSchema = createResultSchema(AppVersionSchema);
export const ProjectStateViewResultSchema = createResultSchema(ProjectStateViewSchema);

export {
	PiSessionAbortInputSchema,
	PiSessionActionResultSchema,
	PiSessionDisposeInputSchema,
	PiSessionEventSchema,
	PiSessionGetDefaultSettingsInputSchema,
	PiSessionGetSettingsInputSchema,
	PiSessionHistoryInputSchema,
	PiSessionHistoryResultSchema,
	PiSessionQueueResultSchema,
	PiSessionRemoveQueuedMessageInputSchema,
	PiSessionSetDefaultModelInputSchema,
	PiSessionSetDefaultThinkingLevelInputSchema,
	PiSessionSetModelInputSchema,
	PiSessionSetThinkingLevelInputSchema,
	PiSessionSettingsResultSchema,
	PiSessionStartInputSchema,
	PiSessionStartResultSchema,
	PiSessionSubmitInputSchema,
	PiSessionUpdateQueuedMessageInputSchema,
};

export type ClipboardWriteTextInput = z.infer<typeof ClipboardWriteTextInputSchema>;
export type ClipboardWriteTextResult = z.infer<typeof ClipboardWriteTextResultSchema>;
export type AppVersion = z.infer<typeof AppVersionSchema>;
export type ProjectIdInput = z.infer<typeof ProjectIdInputSchema>;
export type ProjectRenameInput = z.infer<typeof ProjectRenameInputSchema>;
export type ProjectPinnedInput = z.infer<typeof ProjectPinnedInputSchema>;
export type ChatCreateInput = z.infer<typeof ChatCreateInputSchema>;
export type ChatStandaloneCreateInput = z.infer<typeof ChatStandaloneCreateInputSchema>;
export type ChatSelectionInput = z.infer<typeof ChatSelectionInputSchema>;
export type ChatRenameInput = z.infer<typeof ChatRenameInputSchema>;
export type ChatStandaloneSelectionInput = z.infer<typeof ChatStandaloneSelectionInputSchema>;
export type ChatForkInput = z.infer<typeof ChatForkInputSchema>;
export type ChatCloneInput = z.infer<typeof ChatCloneInputSchema>;
export type ChatBranchInput = z.infer<typeof ChatBranchInputSchema>;
export type AppVersionResult = IpcResult<AppVersion>;
export type ProjectStateViewResult = IpcResult<ProjectStateView>;
export type {
	PiSessionAbortInput,
	PiSessionActionResult,
	PiSessionDisposeInput,
	PiSessionEvent,
	PiSessionGetDefaultSettingsInput,
	PiSessionGetSettingsInput,
	PiSessionHistoryInput,
	PiSessionHistoryResult,
	PiSessionQueueResult,
	PiSessionRemoveQueuedMessageInput,
	PiSessionSetDefaultModelInput,
	PiSessionSetDefaultThinkingLevelInput,
	PiSessionSetModelInput,
	PiSessionSetThinkingLevelInput,
	PiSessionSettingsResult,
	PiSessionStartInput,
	PiSessionStartResult,
	PiSessionSubmitInput,
	PiSessionUpdateQueuedMessageInput,
	WorkspaceFilesPathInput,
	WorkspaceFilesWriteInput,
	WorkspaceListDirectoryResult,
	WorkspaceReadFileResult,
	WorkspaceWriteFileResult,
};
