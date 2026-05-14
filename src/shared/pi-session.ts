import { z } from "zod";
import { createResultSchema, type IpcResult } from "./result";

export const PiSessionStatusSchema = z.enum(["idle", "starting", "running", "retrying", "aborting", "failed"]);

export const PiSessionStartInputSchema = z.strictObject({
	projectId: z.string().min(1),
	prompt: z.string().trim().min(1),
});

export const PiSessionSubmitInputSchema = z.strictObject({
	sessionId: z.string().min(1),
	prompt: z.string().trim().min(1),
});

export const PiSessionAbortInputSchema = z.strictObject({
	sessionId: z.string().min(1),
});

export const PiSessionDisposeInputSchema = z.strictObject({
	sessionId: z.string().min(1),
});

export const PiSessionStartPayloadSchema = z.strictObject({
	sessionId: z.string().min(1),
	projectId: z.string().min(1),
	workspacePath: z.string().min(1),
	status: PiSessionStatusSchema,
});

export const PiSessionActionPayloadSchema = z.strictObject({
	sessionId: z.string().min(1),
	status: PiSessionStatusSchema,
});

export const PiSessionMessageRoleSchema = z.enum(["user", "assistant", "tool", "system"]);

export const PiSessionEventSchema = z.discriminatedUnion("type", [
	z.strictObject({
		type: z.literal("status"),
		sessionId: z.string().min(1),
		status: PiSessionStatusSchema,
		label: z.string().min(1),
		receivedAt: z.string().datetime(),
	}),
	z.strictObject({
		type: z.literal("message_start"),
		sessionId: z.string().min(1),
		messageId: z.string().min(1),
		role: PiSessionMessageRoleSchema,
		content: z.string(),
		receivedAt: z.string().datetime(),
	}),
	z.strictObject({
		type: z.literal("assistant_delta"),
		sessionId: z.string().min(1),
		messageId: z.string().min(1),
		delta: z.string(),
		receivedAt: z.string().datetime(),
	}),
	z.strictObject({
		type: z.literal("message_end"),
		sessionId: z.string().min(1),
		messageId: z.string().min(1),
		role: PiSessionMessageRoleSchema,
		content: z.string(),
		receivedAt: z.string().datetime(),
	}),
	z.strictObject({
		type: z.literal("runtime_error"),
		sessionId: z.string().min(1).optional(),
		code: z.string().min(1),
		message: z.string().min(1),
		receivedAt: z.string().datetime(),
	}),
	z.strictObject({
		type: z.literal("retry"),
		sessionId: z.string().min(1),
		attempt: z.number().int().positive(),
		maxAttempts: z.number().int().positive().optional(),
		delayMs: z.number().int().nonnegative().optional(),
		message: z.string().min(1),
		receivedAt: z.string().datetime(),
	}),
]);

export const PiSessionStartResultSchema = createResultSchema(PiSessionStartPayloadSchema);
export const PiSessionActionResultSchema = createResultSchema(PiSessionActionPayloadSchema);

export type PiSessionStatus = z.infer<typeof PiSessionStatusSchema>;
export type PiSessionStartInput = z.infer<typeof PiSessionStartInputSchema>;
export type PiSessionSubmitInput = z.infer<typeof PiSessionSubmitInputSchema>;
export type PiSessionAbortInput = z.infer<typeof PiSessionAbortInputSchema>;
export type PiSessionDisposeInput = z.infer<typeof PiSessionDisposeInputSchema>;
export type PiSessionStartPayload = z.infer<typeof PiSessionStartPayloadSchema>;
export type PiSessionActionPayload = z.infer<typeof PiSessionActionPayloadSchema>;
export type PiSessionEvent = z.infer<typeof PiSessionEventSchema>;
export type PiSessionStartResult = IpcResult<PiSessionStartPayload>;
export type PiSessionActionResult = IpcResult<PiSessionActionPayload>;
