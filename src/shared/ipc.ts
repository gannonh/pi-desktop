import { z } from "zod";
import {
	PiSessionGetRuntimeCommandsInputSchema,
	PiSessionRuntimeCommandsResultSchema,
	type PiSessionGetRuntimeCommandsInput,
	type PiSessionRuntimeCommandsResult,
} from "./pi-session-commands";
import {
	type PiSessionAbortInput,
	PiSessionAbortInputSchema,
	type PiSessionActionResult,
	PiSessionActionResultSchema,
	type PiSessionAttachInput,
	PiSessionAttachInputSchema,
	type PiSessionPrepareInput,
	PiSessionPrepareInputSchema,
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
import {
	type ProjectGitSettings,
	ProjectGitSettingsSchema,
	type ProjectStateView,
	ProjectStateViewSchema,
} from "./project-state";
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
	projectGetGitSettings: "project:getGitSettings",
	projectSetGitSettings: "project:setGitSettings",
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
	piSessionPrepare: "pi-session:prepare",
	piSessionAttach: "pi-session:attach",
	piSessionDispose: "pi-session:dispose",
	piSessionGetSettings: "pi-session:getSettings",
	piSessionGetDefaultSettings: "pi-session:getDefaultSettings",
	piSessionGetCommands: "pi-session:getCommands",
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
	sourceControlGetStatus: "source-control:getStatus",
	sourceControlCheckIgnored: "source-control:checkIgnored",
	sourceControlStage: "source-control:stage",
	sourceControlUnstage: "source-control:unstage",
	sourceControlDiscard: "source-control:discard",
	sourceControlBulkStage: "source-control:bulkStage",
	sourceControlBulkUnstage: "source-control:bulkUnstage",
	sourceControlBulkDiscard: "source-control:bulkDiscard",
	sourceControlInitializeRepository: "source-control:initializeRepository",
	sourceControlCommit: "source-control:commit",
	sourceControlGetDiff: "source-control:getDiff",
	sourceControlGetUpstreamStatus: "source-control:getUpstreamStatus",
	sourceControlFetch: "source-control:fetch",
	sourceControlPush: "source-control:push",
	sourceControlForcePushWithLease: "source-control:forcePushWithLease",
	sourceControlPull: "source-control:pull",
	sourceControlSync: "source-control:sync",
	sourceControlFastForward: "source-control:fastForward",
	sourceControlPublish: "source-control:publish",
	sourceControlRebaseFromBase: "source-control:rebaseFromBase",
	sourceControlGetBranchCompare: "source-control:getBranchCompare",
	sourceControlGetHistory: "source-control:getHistory",
	sourceControlGetCommitFiles: "source-control:getCommitFiles",
	sourceControlAbortConflict: "source-control:abortConflict",
	sourceControlCreatePullRequest: "source-control:createPullRequest",
	sourceControlGetPullRequestInfo: "source-control:getPullRequestInfo",
	sourceControlGenerateCommitMessage: "source-control:generateCommitMessage",
	sourceControlGeneratePullRequestFields: "source-control:generatePullRequestFields",
	sourceControlCancelGeneration: "source-control:cancelGeneration",
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

export const ProjectGitSettingsInputSchema = z.strictObject({
	projectId: z.string().min(1),
	defaultBaseRef: ProjectGitSettingsSchema.shape.defaultBaseRef,
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

export {
	SourceControlAbortConflictInputSchema,
	SourceControlBranchCompareInputSchema,
	SourceControlBulkDiscardInputSchema,
	SourceControlBulkPathsInputSchema,
	SourceControlCheckIgnoredResultSchema,
	SourceControlCommitInputSchema,
	SourceControlCommitResultSchema,
	SourceControlCreatePullRequestInputSchema,
	SourceControlCancelGenerationInputSchema,
	SourceControlGenerateCommitMessageResultSchema,
	SourceControlGeneratePullRequestFieldsInputSchema,
	SourceControlGeneratePullRequestFieldsResultSchema,
	SourceControlGenerationRequestInputSchema,
	SourceControlDiscardInputSchema,
	SourceControlBranchCompareResultSchema,
	SourceControlGetCommitFilesInputSchema,
	SourceControlGetCommitFilesResultSchema,
	SourceControlGetDiffInputSchema,
	SourceControlGetHistoryInputSchema,
	SourceControlGetHistoryResultSchema,
	SourceControlGetDiffResultSchema,
	SourceControlGetStatusResultSchema,
	SourceControlMutationResultSchema,
	SourceControlPathInputSchema,
	SourceControlProjectInputSchema,
	SourceControlRebaseInputSchema,
	SourceControlRemoteActionInputSchema,
	SourceControlPullRequestInfoResultSchema,
	SourceControlUpstreamStatusResultSchema,
} from "./source-control/schemas";

export const AppVersionResultSchema = createResultSchema(AppVersionSchema);
export const ProjectStateViewResultSchema = createResultSchema(ProjectStateViewSchema);
export const ProjectGitSettingsResultSchema = createResultSchema(ProjectGitSettingsSchema);

export {
	PiSessionAbortInputSchema,
	PiSessionActionResultSchema,
	PiSessionAttachInputSchema,
	PiSessionPrepareInputSchema,
	PiSessionDisposeInputSchema,
	PiSessionEventSchema,
	PiSessionGetDefaultSettingsInputSchema,
	PiSessionGetRuntimeCommandsInputSchema,
	PiSessionGetSettingsInputSchema,
	PiSessionHistoryInputSchema,
	PiSessionHistoryResultSchema,
	PiSessionQueueResultSchema,
	PiSessionRemoveQueuedMessageInputSchema,
	PiSessionSetDefaultModelInputSchema,
	PiSessionSetDefaultThinkingLevelInputSchema,
	PiSessionSetModelInputSchema,
	PiSessionSetThinkingLevelInputSchema,
	PiSessionRuntimeCommandsResultSchema,
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
export type ProjectGitSettingsInput = z.infer<typeof ProjectGitSettingsInputSchema>;
export type ProjectGitSettingsResult = IpcResult<ProjectGitSettings>;
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
export type { ProjectGitSettings };
export type {
	PiSessionAbortInput,
	PiSessionActionResult,
	PiSessionAttachInput,
	PiSessionPrepareInput,
	PiSessionDisposeInput,
	PiSessionEvent,
	PiSessionGetDefaultSettingsInput,
	PiSessionGetRuntimeCommandsInput,
	PiSessionGetSettingsInput,
	PiSessionHistoryInput,
	PiSessionHistoryResult,
	PiSessionQueueResult,
	PiSessionRemoveQueuedMessageInput,
	PiSessionSetDefaultModelInput,
	PiSessionSetDefaultThinkingLevelInput,
	PiSessionSetModelInput,
	PiSessionSetThinkingLevelInput,
	PiSessionRuntimeCommandsResult,
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

export type {
	SourceControlAbortConflictInput,
	SourceControlBranchCompareInput,
	SourceControlBranchCompareResult,
	SourceControlBulkDiscardInput,
	SourceControlBulkPathsInput,
	SourceControlCheckIgnoredResult,
	SourceControlCommitInput,
	SourceControlCommitResult,
	SourceControlCreatePullRequestInput,
	SourceControlCancelGenerationInput,
	SourceControlGeneratePullRequestFieldsInput,
	SourceControlGenerateCommitMessageResult,
	SourceControlGeneratePullRequestFieldsResult,
	SourceControlGenerationRequestInput,
	SourceControlDiscardInput,
	SourceControlGetCommitFilesInput,
	SourceControlGetCommitFilesResult,
	SourceControlGetDiffInput,
	SourceControlGetHistoryInput,
	SourceControlGetHistoryResult,
	SourceControlGetDiffResult,
	SourceControlGetStatusResult,
	SourceControlMutationResult,
	SourceControlPathInput,
	SourceControlProjectInput,
	SourceControlPullRequestInfoResult,
	SourceControlRebaseInput,
	SourceControlRemoteActionInput,
	SourceControlUpstreamStatusResult,
} from "./source-control/schemas";
