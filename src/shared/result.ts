import { z } from "zod";

export const IpcErrorSchema = z.object({
	code: z.string().min(1),
	message: z.string().min(1),
}).strict();

export type IpcError = z.infer<typeof IpcErrorSchema>;

export const createIpcError = (code: string, message: string): IpcError =>
	IpcErrorSchema.parse({
		code,
		message,
	});

export type IpcResult<TData> =
	| {
			ok: true;
			data: TData;
	  }
	| {
			ok: false;
			error: IpcError;
	  };

export const ok = <TData>(data: TData): IpcResult<TData> => ({
	ok: true,
	data,
});

export const err = (code: string, message: string): IpcResult<never> => ({
	ok: false,
	error: createIpcError(code, message),
});

export const createResultSchema = <TSchema extends z.ZodTypeAny>(dataSchema: TSchema) =>
	z.discriminatedUnion("ok", [
		z.object({
			ok: z.literal(true),
			data: dataSchema,
		}).strict(),
		z.object({
			ok: z.literal(false),
			error: IpcErrorSchema,
		}).strict(),
	]);
