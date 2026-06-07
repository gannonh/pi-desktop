import { describe, expect, it, vi } from "vitest";
import type { PiSessionRuntimeCommand } from "../../src/shared/pi-session-commands";
import {
	refreshRuntimeCommandPalette,
	prepareRuntimeSessionForComposer,
	restoreRuntimeCommandsAfterHydration,
} from "../../src/renderer/chat/runtime-command-refresh";
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

	it("only sends true when requesting a Pi resource reload", async () => {
		const replaceCommands = vi.fn();
		const requestCommands = vi.fn(async () => ({
			ok: true as const,
			data: { sessionId: "session:one", commands: [] },
		}));

		await refreshRuntimeCommandPalette({
			sessionId: "session:one",
			reloadResources: false,
			requestCommands,
			getCurrentSessionId: () => "session:one",
			replaceCommands,
		});

		expect(requestCommands).toHaveBeenCalledWith({ sessionId: "session:one", reloadResources: undefined });
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

describe("restoreRuntimeCommandsAfterHydration", () => {
	it("attaches the Pi session when command discovery fails on a cold hydrate", async () => {
		const onRestored = vi.fn();
		const attachSession = vi.fn(async () => ({ ok: true as const }));
		const requestCommands = vi
			.fn()
			.mockResolvedValueOnce({
				ok: false as const,
				error: createIpcError("pi_session.operation_failed", "Pi session not found."),
			})
			.mockResolvedValueOnce({
				ok: true as const,
				data: { sessionId: "session:one", commands: [command("skill:demo")] },
			});

		await restoreRuntimeCommandsAfterHydration({
			sessionId: "session:one",
			requestCommands,
			attachSession,
			isStillActive: () => true,
			onRestored,
		});

		expect(attachSession).toHaveBeenCalledOnce();
		expect(requestCommands).toHaveBeenCalledTimes(2);
		expect(onRestored).toHaveBeenCalledWith("session:one", [command("skill:demo")]);
	});

	it("leaves prior command state untouched when hydrate restoration is stale", async () => {
		const onRestored = vi.fn();
		const requestCommands = vi.fn(async () => ({
			ok: true as const,
			data: { sessionId: "session:one", commands: [command("demo:run")] },
		}));

		await restoreRuntimeCommandsAfterHydration({
			sessionId: "session:one",
			requestCommands,
			isStillActive: () => false,
			onRestored,
		});

		expect(onRestored).not.toHaveBeenCalled();
	});
});

describe("prepareRuntimeSessionForComposer", () => {
	it("prepares an idle session and loads runtime commands for the composer", async () => {
		const onPrepared = vi.fn();
		const prepareSession = vi.fn(async () => ({
			ok: true as const,
			data: {
				sessionId: "session:one",
				projectId: "project:/tmp/pi-desktop",
				chatId: "chat:one",
				workspacePath: "/tmp/pi-desktop",
				sessionPath: "/tmp/pi-desktop/.pi/sessions/session.json",
				status: "idle" as const,
				resumed: false,
			},
		}));
		const requestCommands = vi.fn(async () => ({
			ok: true as const,
			data: { sessionId: "session:one", commands: [command("skill:demo")] },
		}));

		await expect(
			prepareRuntimeSessionForComposer({
				projectId: "project:/tmp/pi-desktop",
				chatId: "chat:one",
				prepareSession,
				requestCommands,
				isStillActive: () => true,
				onPrepared,
			}),
		).resolves.toBe("session:one");

		expect(prepareSession).toHaveBeenCalledWith({
			projectId: "project:/tmp/pi-desktop",
			chatId: "chat:one",
		});
		expect(onPrepared).toHaveBeenCalledWith("session:one", [command("skill:demo")]);
	});

	it("returns null when prepare fails or the scope is stale", async () => {
		const onPrepared = vi.fn();
		const prepareSession = vi.fn(async () => ({
			ok: false as const,
			error: createIpcError("pi_session.operation_failed", "Prepare failed"),
		}));

		await expect(
			prepareRuntimeSessionForComposer({
				projectId: "project:/tmp/pi-desktop",
				chatId: "chat:one",
				prepareSession,
				requestCommands: vi.fn(),
				isStillActive: () => true,
				onPrepared,
			}),
		).resolves.toBeNull();

		expect(onPrepared).not.toHaveBeenCalled();
	});

	it("returns the prepared session id when command discovery fails", async () => {
		const onPrepared = vi.fn();
		const prepareSession = vi.fn(async () => ({
			ok: true as const,
			data: {
				sessionId: "session:one",
				projectId: "project:/tmp/pi-desktop",
				chatId: "chat:one",
				workspacePath: "/tmp/pi-desktop",
				sessionPath: "/tmp/pi-desktop/.pi/sessions/session.json",
				status: "idle" as const,
				resumed: false,
			},
		}));
		const requestCommands = vi.fn(async () => ({
			ok: false as const,
			error: createIpcError("pi_session.operation_failed", "Command fetch failed"),
		}));

		await expect(
			prepareRuntimeSessionForComposer({
				projectId: "project:/tmp/pi-desktop",
				chatId: "chat:one",
				prepareSession,
				requestCommands,
				isStillActive: () => true,
				onPrepared,
			}),
		).resolves.toBe("session:one");

		expect(requestCommands).toHaveBeenCalledWith({ sessionId: "session:one" });
		expect(onPrepared).not.toHaveBeenCalled();
	});
});
