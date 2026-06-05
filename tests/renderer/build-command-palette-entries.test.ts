import { describe, expect, it, vi } from "vitest";
import { buildCommandPaletteEntries } from "../../src/renderer/chat/build-command-palette-entries";
import { createMockSessionCommandPaletteActions } from "./session-command-palette-fixtures";

const createMockOutputCommandPaletteActions = () => ({
	onCopyLastAssistantMessage: vi.fn(),
	onNotify: vi.fn(),
});

const runtimeCommands = [
	{
		id: "runtime-command:demo:run",
		title: "demo:run",
		slashCommand: "demo:run",
		source: "extension" as const,
		description: "Run the demo command",
		scope: "project" as const,
		provenance: { path: "/tmp/demo.ts", source: "demo-extension", origin: "top-level" as const },
		availability: { state: "available" as const },
	},
	{
		id: "runtime-command:review",
		title: "review",
		slashCommand: "review",
		source: "prompt-template" as const,
		description: "Review a path",
		argumentHint: "[path]",
		scope: "project" as const,
		provenance: { path: "/tmp/review.md", source: "project", origin: "top-level" as const },
		availability: { state: "available" as const },
	},
	{
		id: "runtime-command:skill:summarize",
		title: "skill:summarize",
		slashCommand: "skill:summarize",
		source: "skill" as const,
		description: "Summarize a path",
		scope: "user" as const,
		provenance: { path: "/tmp/SKILL.md", source: "user", origin: "top-level" as const },
		availability: { state: "available" as const },
	},
	{
		id: "runtime-command:skill:missing",
		title: "skill:missing",
		slashCommand: "skill:missing",
		source: "skill" as const,
		description: "Missing skill",
		scope: "user" as const,
		provenance: { path: "/tmp/missing/SKILL.md", source: "user", origin: "top-level" as const },
		availability: { state: "unavailable" as const, reason: "Skill metadata is unavailable." },
	},
];

describe("buildCommandPaletteEntries", () => {
	it("uses family stubs when actions are not provided", () => {
		const entries = buildCommandPaletteEntries();

		expect(entries.filter((entry) => entry.sectionId === "session")).toHaveLength(1);
		expect(entries.some((entry) => entry.id === "session.stub")).toBe(true);
		expect(entries.filter((entry) => entry.sectionId === "output")).toHaveLength(1);
		expect(entries.some((entry) => entry.id === "output.stub")).toBe(true);
	});

	it("replaces the session stub with concrete S011 entries when session actions are provided", () => {
		const entries = buildCommandPaletteEntries({ session: createMockSessionCommandPaletteActions() });
		const sessionEntries = entries.filter((entry) => entry.sectionId === "session");

		expect(sessionEntries).toHaveLength(9);
		expect(sessionEntries.some((entry) => entry.id === "session.stub")).toBe(false);
		expect(entries.filter((entry) => entry.sectionId === "config")).toHaveLength(5);
	});

	it("adds available runtime commands without replacing built-in entries", () => {
		const entries = buildCommandPaletteEntries({ runtimeCommands });

		expect(entries.some((entry) => entry.id === "config.model")).toBe(true);
		expect(
			entries
				.filter((entry) => entry.id.startsWith("runtime-command:") && entry.slashCommand)
				.map((entry) => entry.title),
		).toEqual(["/demo:run", "/review", "/skill:summarize"]);
		expect(entries.find((entry) => entry.id === "runtime-command:review")).toMatchObject({
			description: "Review a path Arguments: [path]",
			scopeTag: "Prompt template",
			detail: "project · project · /tmp/review.md",
		});
		expect(entries.find((entry) => entry.id === "runtime-command:skill:missing")).toMatchObject({
			description: "Missing skill Skill metadata is unavailable.",
			scopeTag: "Unavailable skill",
			slashCommand: undefined,
		});
	});

	it("replaces the output stub with concrete S013 entries when output actions are provided", () => {
		const entries = buildCommandPaletteEntries({ output: createMockOutputCommandPaletteActions() });

		expect(entries.some((entry) => entry.id === "output.stub")).toBe(false);
		expect(entries.filter((entry) => entry.sectionId === "output").map((entry) => entry.id)).toEqual([
			"output.copy",
			"output.export",
			"output.share",
		]);
	});
});
