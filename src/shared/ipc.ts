import { z } from "zod";
import {
	PiSessionAbortInputSchema,
	PiSessionActionResultSchema,
	PiSessionDisposeInputSchema,
	PiSessionEventSchema,
	PiSessionStartInputSchema,
	PiSessionStartResultSchema,
	PiSessionSubmitInputSchema,
	type PiSessionAbortInput,
	type PiSessionActionResult,
	type PiSessionDisposeInput,
	type PiSessionEvent,
	type PiSessionStartInput,
	type PiSessionStartResult,
	type PiSessionSubmitInput,
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
	chatSelect: "chat:select",
	piSessionStart: "pi-session:start",
	piSessionSubmit: "pi-session:submit",
	piSessionAbort: "pi-session:abort",
	piSessionDispose: "pi-session:dispose",
	piSessionEvent: "pi-session:event",
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

export {
	PiSessionAbortInputSchema,
	PiSessionActionResultSchema,
	PiSessionDisposeInputSchema,
	PiSessionEventSchema,
	PiSessionStartInputSchema,
	PiSessionStartResultSchema,
	PiSessionSubmitInputSchema,
};

export type AppVersion = z.infer<typeof AppVersionSchema>;
export type ProjectIdInput = z.infer<typeof ProjectIdInputSchema>;
export type ProjectRenameInput = z.infer<typeof ProjectRenameInputSchema>;
export type ProjectPinnedInput = z.infer<typeof ProjectPinnedInputSchema>;
export type ChatCreateInput = z.infer<typeof ChatCreateInputSchema>;
export type ChatSelectionInput = z.infer<typeof ChatSelectionInputSchema>;
export type AppVersionResult = IpcResult<AppVersion>;
export type ProjectStateViewResult = IpcResult<ProjectStateView>;
export type {
	PiSessionAbortInput,
	PiSessionActionResult,
	PiSessionDisposeInput,
	PiSessionEvent,
	PiSessionStartInput,
	PiSessionStartResult,
	PiSessionSubmitInput,
};
