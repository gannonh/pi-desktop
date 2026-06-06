import { describe, expect, it, vi } from "vitest";
import type { PiSessionRuntimeCommand } from "../../src/shared/pi-session-commands";
import { refreshRuntimeCommandPalette } from "../../src/renderer/chat/runtime-command-refresh";
import { createIpcError } from "../../src/shared/result";

const command = (slashCommand: string): PiSessionRuntimeCommand => ({
	id: `runtime-command:${slashCommand}`,
	title: slashCommand,
	slashCommand,
	source: "extension",
	description: `Run ${slashCommand}`,
	scope: "project",
	provenance: { path: `/tmp/${slashCommand}.ts`, source: "project", origin: "top-level" },
	availability: { state: "available" },
});

describe("refreshRuntimeCommandPalette", () => {
	it("replaces the active command list after Pi reload removes stale resources", async () => {
		const replaceCommands = vi.fn();
		const requestCommands = vi.fn(async () => ({
			ok: true as const,
			data: { sessionId: "session:one", commands: [command("new-command")] },
		}));

		await refreshRuntimeCommandPalette({
			sessionId: "session:one",
			reloadResources: true,
			requestCommands,
			getCurrentSessionId: () => "session:one",
			replaceCommands,
		});

		expect(requestCommands).toHaveBeenCalledWith({ sessionId: "session:one", reloadResources: true });
		expect(replaceCommands).toHaveBeenCalledWith([command("new-command")]);
	});

	it("clears stale commands and reports the failed refresh visibly", async () => {
		const replaceCommands = vi.fn();
		const notify = vi.fn();
		const requestCommands = vi.fn(async () => ({
			ok: false as const,
			error: createIpcError("pi_session.operation_failed", "Reload failed"),
		}));

		await refreshRuntimeCommandPalette({
			sessionId: "session:one",
			reloadResources: true,
			requestCommands,
			getCurrentSessionId: () => "session:one",
			replaceCommands,
			notify,
		});

		expect(replaceCommands).toHaveBeenCalledWith([]);
		expect(notify).toHaveBeenCalledWith("Reload failed", "error");
	});
});
