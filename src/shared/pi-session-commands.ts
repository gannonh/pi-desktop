import { z } from "zod";
import { createResultSchema, type IpcResult } from "./result";

export const PiSessionRuntimeCommandSourceSchema = z.enum(["extension", "prompt-template", "skill"]);
export const PiSessionRuntimeCommandAvailabilitySchema = z.strictObject({
	state: z.enum(["available", "unavailable"]),
	reason: z.string().min(1).optional(),
});
export const PiSessionRuntimeCommandProvenanceSchema = z.strictObject({
	path: z.string().min(1),
	source: z.string().min(1),
	origin: z.enum(["package", "top-level"]),
	baseDir: z.string().min(1).optional(),
});
export const PiSessionRuntimeCommandSchema = z.strictObject({
	id: z.string().min(1),
	title: z.string().min(1),
	slashCommand: z.string().min(1),
	source: PiSessionRuntimeCommandSourceSchema,
	description: z.string().optional(),
	argumentHint: z.string().min(1).optional(),
	scope: z.enum(["user", "project", "temporary"]),
	provenance: PiSessionRuntimeCommandProvenanceSchema,
	availability: PiSessionRuntimeCommandAvailabilitySchema,
});
export const PiSessionRuntimeCommandsPayloadSchema = z.strictObject({
	sessionId: z.string().min(1).optional(),
	commands: z.array(PiSessionRuntimeCommandSchema),
});
export const PiSessionGetRuntimeCommandsInputSchema = z.strictObject({
	sessionId: z.string().min(1),
});
export const PiSessionRuntimeCommandsResultSchema = createResultSchema(PiSessionRuntimeCommandsPayloadSchema);

export type PiSessionRuntimeCommandSource = z.infer<typeof PiSessionRuntimeCommandSourceSchema>;
export type PiSessionRuntimeCommandAvailability = z.infer<typeof PiSessionRuntimeCommandAvailabilitySchema>;
export type PiSessionRuntimeCommandProvenance = z.infer<typeof PiSessionRuntimeCommandProvenanceSchema>;
export type PiSessionRuntimeCommand = z.infer<typeof PiSessionRuntimeCommandSchema>;
export type PiSessionRuntimeCommandsPayload = z.infer<typeof PiSessionRuntimeCommandsPayloadSchema>;
export type PiSessionGetRuntimeCommandsInput = z.infer<typeof PiSessionGetRuntimeCommandsInputSchema>;
export type PiSessionRuntimeCommandsResult = IpcResult<PiSessionRuntimeCommandsPayload>;
