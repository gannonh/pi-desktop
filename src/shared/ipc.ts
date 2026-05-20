import { z } from "zod";
import {
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
	type PiSessionAbortInput,
	type PiSessionActionResult,
	type PiSessionDisposeInput,
	type PiSessionEvent,
	type PiSessionGetSettingsInput,
	type PiSessionHistoryInput,
	type PiSessionHistoryResult,
	type PiSessionQueueResult,
	type PiSessionRemoveQueuedMessageInput,
	type PiSessionSetDefaultModelInput,
	type PiSessionSetDefaultThinkingLevelInput,
	type PiSessionSetModelInput,
	type PiSessionSetThinkingLevelInput,
	type PiSessionSettingsResult,
	type PiSessionStartInput,
	type PiSessionStartResult,
	type PiSessionSubmitInput,
	type PiSessionUpdateQueuedMessageInput,
} from "./pi-session";
import { type ProjectStateView, ProjectStateViewSchema } from "./project-state";
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
};
