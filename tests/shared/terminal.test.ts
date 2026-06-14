import { describe, expect, it } from "vitest";
import {
	TerminalActionResultSchema,
	TerminalEventSchema,
	TerminalKillInputSchema,
	TerminalResizeInputSchema,
	TerminalSpawnInputSchema,
	TerminalSpawnResultSchema,
	TerminalWriteInputSchema,
} from "../../src/shared/terminal";

describe("terminal IPC schemas", () => {
	it("accepts valid spawn input", () => {
		expect(
			TerminalSpawnInputSchema.parse({
				projectId: "project:/tmp/pi-desktop",
				projectPath: "/tmp/pi-desktop",
				cols: 80,
				rows: 24,
			}),
		).toEqual({
			projectId: "project:/tmp/pi-desktop",
			projectPath: "/tmp/pi-desktop",
			cols: 80,
			rows: 24,
		});
	});

	it("rejects invalid spawn dimensions", () => {
		expect(() =>
			TerminalSpawnInputSchema.parse({
				projectId: "project:/tmp/pi-desktop",
				projectPath: "/tmp/pi-desktop",
				cols: 0,
				rows: 24,
			}),
		).toThrow();
	});

	it("parses terminal events", () => {
		expect(TerminalEventSchema.parse({ type: "data", terminalId: "t1", data: "hello" })).toEqual({
			type: "data",
			terminalId: "t1",
			data: "hello",
		});
		expect(TerminalEventSchema.parse({ type: "exit", terminalId: "t1", code: 0 })).toEqual({
			type: "exit",
			terminalId: "t1",
			code: 0,
		});
		expect(TerminalEventSchema.parse({ type: "error", terminalId: "t1", message: "boom" })).toEqual({
			type: "error",
			terminalId: "t1",
			message: "boom",
		});
	});

	it("parses action results", () => {
		expect(TerminalSpawnResultSchema.parse({ ok: true, data: { terminalId: "abc" } })).toEqual({
			ok: true,
			data: { terminalId: "abc" },
		});
		expect(TerminalActionResultSchema.parse({ ok: true, data: { accepted: true } })).toEqual({
			ok: true,
			data: { accepted: true },
		});
	});

	it("accepts write, resize, and kill inputs", () => {
		expect(TerminalWriteInputSchema.parse({ terminalId: "t1", data: "ls\n" })).toEqual({
			terminalId: "t1",
			data: "ls\n",
		});
		expect(TerminalResizeInputSchema.parse({ terminalId: "t1", cols: 120, rows: 40 })).toEqual({
			terminalId: "t1",
			cols: 120,
			rows: 40,
		});
		expect(TerminalKillInputSchema.parse({ terminalId: "t1" })).toEqual({ terminalId: "t1" });
	});
});
