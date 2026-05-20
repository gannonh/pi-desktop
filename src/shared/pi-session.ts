import { z } from "zod";
import { createResultSchema, type IpcResult } from "./result";

export const PiSessionStatusSchema = z.enum(["idle", "starting", "running", "retrying", "aborting", "failed"]);

export const PiSessionDeliverySchema = z.enum(["prompt", "steer", "followUp"]);

export const PiSessionThinkingLevelSchema = z.enum(["off", "minimal", "low", "medium", "high", "xhigh"]);

export const PiSessionStartInputSchema = z.strictObject({
	projectId: z.string().min(1).nullable(),
	chatId: z.string().min(1).nullable().optional(),
	prompt: z.string().trim().min(1),
	modelProvider: z.string().min(1).optional(),
	modelId: z.string().min(1).optional(),
	thinkingLevel: PiSessionThinkingLevelSchema.optional(),
});

export const PiSessionSubmitInputSchema = z.strictObject({
	sessionId: z.string().min(1),
	prompt: z.string().trim().min(1),
	delivery: PiSessionDeliverySchema.optional(),
});

export const PiSessionAbortInputSchema = z.strictObject({
	sessionId: z.string().min(1),
});

export const PiSessionHistoryInputSchema = z.strictObject({
	projectId: z.string().min(1).nullable(),
	chatId: z.string().min(1),
});

export const PiSessionDisposeInputSchema = z.strictObject({
	sessionId: z.string().min(1),
});

export const PiSessionGetSettingsInputSchema = z.strictObject({
	sessionId: z.string().min(1),
});

export const PiSessionGetDefaultSettingsInputSchema = z.strictObject({
	workspacePath: z.string().min(1).optional(),
});

export const PiSessionSetModelInputSchema = z.strictObject({
	sessionId: z.string().min(1),
	provider: z.string().min(1),
	modelId: z.string().min(1),
});

export const PiSessionSetThinkingLevelInputSchema = z.strictObject({
	sessionId: z.string().min(1),
	level: PiSessionThinkingLevelSchema,
});

export const PiSessionSetDefaultModelInputSchema = z.strictObject({
	workspacePath: z.string().min(1).optional(),
	provider: z.string().min(1),
	modelId: z.string().min(1),
});

export const PiSessionSetDefaultThinkingLevelInputSchema = z.strictObject({
	workspacePath: z.string().min(1).optional(),
	level: PiSessionThinkingLevelSchema,
});

export const PiSessionQueuedMessageIdSchema = z.strictObject({
	queue: z.enum(["steer", "followUp"]),
	index: z.number().int().nonnegative(),
});

export const PiSessionUpdateQueuedMessageInputSchema = z.strictObject({
	sessionId: z.string().min(1),
	messageId: PiSessionQueuedMessageIdSchema,
	delivery: z.enum(["steer", "followUp"]),
});

export const PiSessionRemoveQueuedMessageInputSchema = z.strictObject({
	sessionId: z.string().min(1),
	messageId: PiSessionQueuedMessageIdSchema,
});

export const PiSessionModelOptionSchema = z.strictObject({
	provider: z.string().min(1),
	id: z.string().min(1),
	label: z.string().min(1),
});

export const PiSessionSettingsPayloadSchema = z.strictObject({
	modelLabel: z.string().min(1),
	modelProvider: z.string().min(1).nullable(),
	modelId: z.string().min(1).nullable(),
	thinkingLevel: PiSessionThinkingLevelSchema,
	availableModels: z.array(PiSessionModelOptionSchema),
	availableThinkingLevels: z.array(PiSessionThinkingLevelSchema),
});

export const PiSessionQueuedMessageSchema = z.strictObject({
	id: PiSessionQueuedMessageIdSchema,
	text: z.string(),
	delivery: z.enum(["steer", "followUp"]),
});

export const PiSessionQueuePayloadSchema = z.strictObject({
	sessionId: z.string().min(1),
	messages: z.array(PiSessionQueuedMessageSchema),
});

export const PiSessionStartPayloadSchema = z.strictObject({
	sessionId: z.string().min(1),
	projectId: z.string().min(1).nullable(),
	chatId: z.string().min(1).nullable(),
	workspacePath: z.string().min(1),
	sessionPath: z.string().min(1).nullable(),
	status: PiSessionStatusSchema,
	resumed: z.boolean(),
});

export const PiSessionActionPayloadSchema = z.strictObject({
	sessionId: z.string().min(1),
	status: PiSessionStatusSchema,
});

export const PiSessionMessageRoleSchema = z.enum(["user", "assistant", "tool", "system"]);

export const PiSessionHistoryMessageSchema = z.strictObject({
	id: z.string().min(1),
	role: PiSessionMessageRoleSchema,
	content: z.string(),
	streaming: z.boolean(),
});

export const PiSessionHistoryPayloadSchema = z.strictObject({
	sessionId: z.string().min(1),
	status: PiSessionStatusSchema,
	statusLabel: z.string().min(1),
	messages: z.array(PiSessionHistoryMessageSchema),
});

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
	z.strictObject({
		type: z.literal("session_settings"),
		sessionId: z.string().min(1).optional(),
		settings: PiSessionSettingsPayloadSchema,
		receivedAt: z.string().datetime(),
	}),
	z.strictObject({
		type: z.literal("queue_update"),
		sessionId: z.string().min(1),
		messages: z.array(PiSessionQueuedMessageSchema),
		receivedAt: z.string().datetime(),
	}),
]);

export const PiSessionStartResultSchema = createResultSchema(PiSessionStartPayloadSchema);
export const PiSessionActionResultSchema = createResultSchema(PiSessionActionPayloadSchema);
export const PiSessionHistoryResultSchema = createResultSchema(PiSessionHistoryPayloadSchema);
export const PiSessionSettingsResultSchema = createResultSchema(PiSessionSettingsPayloadSchema);
export const PiSessionQueueResultSchema = createResultSchema(PiSessionQueuePayloadSchema);

export type PiSessionStatus = z.infer<typeof PiSessionStatusSchema>;
export type PiSessionDelivery = z.infer<typeof PiSessionDeliverySchema>;
export type PiSessionThinkingLevel = z.infer<typeof PiSessionThinkingLevelSchema>;
export type PiSessionStartInput = z.infer<typeof PiSessionStartInputSchema>;
export type PiSessionSubmitInput = z.infer<typeof PiSessionSubmitInputSchema>;
export type PiSessionAbortInput = z.infer<typeof PiSessionAbortInputSchema>;
export type PiSessionHistoryInput = z.infer<typeof PiSessionHistoryInputSchema>;
export type PiSessionDisposeInput = z.infer<typeof PiSessionDisposeInputSchema>;
export type PiSessionGetSettingsInput = z.infer<typeof PiSessionGetSettingsInputSchema>;
export type PiSessionGetDefaultSettingsInput = z.infer<typeof PiSessionGetDefaultSettingsInputSchema>;
export type PiSessionSetModelInput = z.infer<typeof PiSessionSetModelInputSchema>;
export type PiSessionSetThinkingLevelInput = z.infer<typeof PiSessionSetThinkingLevelInputSchema>;
export type PiSessionSetDefaultModelInput = z.infer<typeof PiSessionSetDefaultModelInputSchema>;
export type PiSessionSetDefaultThinkingLevelInput = z.infer<typeof PiSessionSetDefaultThinkingLevelInputSchema>;
export type PiSessionUpdateQueuedMessageInput = z.infer<typeof PiSessionUpdateQueuedMessageInputSchema>;
export type PiSessionRemoveQueuedMessageInput = z.infer<typeof PiSessionRemoveQueuedMessageInputSchema>;
export type PiSessionModelOption = z.infer<typeof PiSessionModelOptionSchema>;
export type PiSessionSettingsPayload = z.infer<typeof PiSessionSettingsPayloadSchema>;
export type PiSessionQueuedMessageId = z.infer<typeof PiSessionQueuedMessageIdSchema>;
export type PiSessionQueuedMessage = z.infer<typeof PiSessionQueuedMessageSchema>;
export type PiSessionQueuePayload = z.infer<typeof PiSessionQueuePayloadSchema>;
export type PiSessionStartPayload = z.infer<typeof PiSessionStartPayloadSchema>;
export type PiSessionActionPayload = z.infer<typeof PiSessionActionPayloadSchema>;
export type PiSessionMessageRole = z.infer<typeof PiSessionMessageRoleSchema>;
export type PiSessionHistoryMessage = z.infer<typeof PiSessionHistoryMessageSchema>;
export type PiSessionHistoryPayload = z.infer<typeof PiSessionHistoryPayloadSchema>;
export type PiSessionEvent = z.infer<typeof PiSessionEventSchema>;
export type PiSessionStartResult = IpcResult<PiSessionStartPayload>;
export type PiSessionActionResult = IpcResult<PiSessionActionPayload>;
export type PiSessionHistoryResult = IpcResult<PiSessionHistoryPayload>;
export type PiSessionSettingsResult = IpcResult<PiSessionSettingsPayload>;
export type PiSessionQueueResult = IpcResult<PiSessionQueuePayload>;
