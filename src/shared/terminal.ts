import { z } from "zod";
import { createResultSchema } from "./result";

export const TerminalSpawnInputSchema = z.strictObject({
	projectId: z.string().min(1),
	cols: z.number().int().positive(),
	rows: z.number().int().positive(),
});

export const TerminalWriteInputSchema = z.strictObject({
	terminalId: z.string().min(1),
	data: z.string(),
});

export const TerminalResizeInputSchema = z.strictObject({
	terminalId: z.string().min(1),
	cols: z.number().int().positive(),
	rows: z.number().int().positive(),
});

export const TerminalKillInputSchema = z.strictObject({
	terminalId: z.string().min(1),
});

export const TerminalSpawnDataSchema = z.strictObject({
	terminalId: z.string().min(1),
});

export const TerminalActionDataSchema = z.strictObject({
	accepted: z.literal(true),
});

export const TerminalSpawnResultSchema = createResultSchema(TerminalSpawnDataSchema);
export const TerminalActionResultSchema = createResultSchema(TerminalActionDataSchema);

export const TerminalDataEventSchema = z.strictObject({
	type: z.literal("data"),
	terminalId: z.string().min(1),
	data: z.string(),
});

export const TerminalExitEventSchema = z.strictObject({
	type: z.literal("exit"),
	terminalId: z.string().min(1),
	code: z.number().int(),
});

export const TerminalErrorEventSchema = z.strictObject({
	type: z.literal("error"),
	terminalId: z.string().min(1),
	message: z.string().min(1),
});

export const TerminalEventSchema = z.discriminatedUnion("type", [
	TerminalDataEventSchema,
	TerminalExitEventSchema,
	TerminalErrorEventSchema,
]);

export type TerminalSpawnInput = z.infer<typeof TerminalSpawnInputSchema>;
export type TerminalWriteInput = z.infer<typeof TerminalWriteInputSchema>;
export type TerminalResizeInput = z.infer<typeof TerminalResizeInputSchema>;
export type TerminalKillInput = z.infer<typeof TerminalKillInputSchema>;
export type TerminalSpawnResult = z.infer<typeof TerminalSpawnResultSchema>;
export type TerminalActionResult = z.infer<typeof TerminalActionResultSchema>;
export type TerminalEvent = z.infer<typeof TerminalEventSchema>;
