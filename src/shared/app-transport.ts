import { z } from "zod";
import {
	AppVersionResultSchema,
	ChatCreateInputSchema,
	ChatSelectionInputSchema,
	PiSessionAbortInputSchema,
	PiSessionActionResultSchema,
	PiSessionDisposeInputSchema,
	PiSessionEventSchema,
	PiSessionStartInputSchema,
	PiSessionStartResultSchema,
	PiSessionSubmitInputSchema,
	ProjectIdInputSchema,
	ProjectPinnedInputSchema,
	ProjectRenameInputSchema,
	ProjectStateViewResultSchema,
} from "./ipc";

export const AppRpcRequestSchema = z.discriminatedUnion("operation", [
	z.strictObject({ operation: z.literal("app.getVersion"), input: z.undefined().optional() }),
	z.strictObject({ operation: z.literal("project.getState"), input: z.undefined().optional() }),
	z.strictObject({ operation: z.literal("project.createFromScratch"), input: z.undefined().optional() }),
	z.strictObject({ operation: z.literal("project.addExistingFolder"), input: z.undefined().optional() }),
	z.strictObject({ operation: z.literal("project.select"), input: ProjectIdInputSchema }),
	z.strictObject({ operation: z.literal("project.rename"), input: ProjectRenameInputSchema }),
	z.strictObject({ operation: z.literal("project.remove"), input: ProjectIdInputSchema }),
	z.strictObject({ operation: z.literal("project.openInFinder"), input: ProjectIdInputSchema }),
	z.strictObject({ operation: z.literal("project.locateFolder"), input: ProjectIdInputSchema }),
	z.strictObject({ operation: z.literal("project.setPinned"), input: ProjectPinnedInputSchema }),
	z.strictObject({ operation: z.literal("project.checkAvailability"), input: ProjectIdInputSchema }),
	z.strictObject({ operation: z.literal("chat.create"), input: ChatCreateInputSchema }),
	z.strictObject({ operation: z.literal("chat.select"), input: ChatSelectionInputSchema }),
	z.strictObject({ operation: z.literal("piSession.start"), input: PiSessionStartInputSchema }),
	z.strictObject({ operation: z.literal("piSession.submit"), input: PiSessionSubmitInputSchema }),
	z.strictObject({ operation: z.literal("piSession.abort"), input: PiSessionAbortInputSchema }),
	z.strictObject({ operation: z.literal("piSession.dispose"), input: PiSessionDisposeInputSchema }),
]);

export type AppRpcRequest = z.infer<typeof AppRpcRequestSchema>;
export type AppRpcOperation = AppRpcRequest["operation"];

export const AppRpcResponseSchemas = {
	"app.getVersion": AppVersionResultSchema,
	"project.getState": ProjectStateViewResultSchema,
	"project.createFromScratch": ProjectStateViewResultSchema,
	"project.addExistingFolder": ProjectStateViewResultSchema,
	"project.select": ProjectStateViewResultSchema,
	"project.rename": ProjectStateViewResultSchema,
	"project.remove": ProjectStateViewResultSchema,
	"project.openInFinder": ProjectStateViewResultSchema,
	"project.locateFolder": ProjectStateViewResultSchema,
	"project.setPinned": ProjectStateViewResultSchema,
	"project.checkAvailability": ProjectStateViewResultSchema,
	"chat.create": ProjectStateViewResultSchema,
	"chat.select": ProjectStateViewResultSchema,
	"piSession.start": PiSessionStartResultSchema,
	"piSession.submit": PiSessionActionResultSchema,
	"piSession.abort": PiSessionActionResultSchema,
	"piSession.dispose": PiSessionActionResultSchema,
} as const satisfies Record<AppRpcOperation, z.ZodTypeAny>;

export const PiSessionEventEnvelopeSchema = z.strictObject({
	type: z.literal("pi-session:event"),
	event: PiSessionEventSchema,
});

export type PiSessionEventEnvelope = z.infer<typeof PiSessionEventEnvelopeSchema>;
