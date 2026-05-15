import { afterEach, describe, expect, it } from "vitest";
import { installDevPreviewApi } from "../../src/renderer/dev-preview-api";
import type { PiSessionEvent } from "../../src/shared/pi-session";

const installApi = () => {
	const previewWindow = {};
	vi.stubGlobal("window", previewWindow);
	installDevPreviewApi();
	return (previewWindow as Window & typeof globalThis).piDesktop;
};

describe("dev preview API", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("returns an error result when a project operation references an unknown project", async () => {
		const api = installApi();

		const result = await api.project.select({ projectId: "project:/missing" });

		expect(result).toEqual({
			ok: false,
			error: {
				code: "preview.project_not_found",
				message: "Project not found in preview data.",
			},
		});
	});

	it("creates a unique project id for each preview existing-folder add", async () => {
		const api = installApi();

		const first = await api.project.addExistingFolder();
		const second = await api.project.addExistingFolder();

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!second.ok) {
			return;
		}
		const piMonoProjects = second.data.projects.filter((project) => project.path.includes("/pi-mono"));
		expect(new Set(piMonoProjects.map((project) => project.id)).size).toBe(piMonoProjects.length);
	});

	it("streams deterministic preview session events", async () => {
		const api = installApi();
		const events: PiSessionEvent[] = [];
		const unsubscribe = api.piSession.onEvent((event) => events.push(event));
		const state = await api.project.getState();
		expect(state.ok).toBe(true);
		if (!state.ok) {
			return;
		}
		const projectId = state.data.projects.find((project) => project.displayName === "pi-desktop")?.id;
		expect(projectId).toBeDefined();
		if (!projectId) {
			return;
		}

		const started = await api.piSession.start({ projectId, prompt: "What files are here?" });
		expect(started.ok).toBe(true);
		if (!started.ok) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
		unsubscribe();

		const sessionId = started.data.sessionId;
		expect(events).toEqual([
			{ type: "status", sessionId, status: "running", label: "Running", receivedAt: "2026-05-12T18:00:00.000Z" },
			{
				type: "message_start",
				sessionId,
				messageId: `${sessionId}:preview:0:user`,
				role: "user",
				content: "What files are here?",
				receivedAt: "2026-05-12T18:00:00.001Z",
			},
			{
				type: "message_start",
				sessionId,
				messageId: `${sessionId}:preview:0:assistant`,
				role: "assistant",
				content: "",
				receivedAt: "2026-05-12T18:00:00.002Z",
			},
			{
				type: "assistant_delta",
				sessionId,
				messageId: `${sessionId}:preview:0:assistant`,
				delta: "I can see this project. ",
				receivedAt: "2026-05-12T18:00:00.003Z",
			},
			{
				type: "assistant_delta",
				sessionId,
				messageId: `${sessionId}:preview:0:assistant`,
				delta: "Pi session streaming is connected.",
				receivedAt: "2026-05-12T18:00:00.004Z",
			},
			{
				type: "message_end",
				sessionId,
				messageId: `${sessionId}:preview:0:assistant`,
				role: "assistant",
				content: "I can see this project. Pi session streaming is connected.",
				receivedAt: "2026-05-12T18:00:00.005Z",
			},
			{ type: "status", sessionId, status: "idle", label: "Idle", receivedAt: "2026-05-12T18:00:00.006Z" },
		]);
	});

	it("cancels a pending preview stream when aborting", async () => {
		vi.useFakeTimers();
		const api = installApi();
		const events: PiSessionEvent[] = [];
		const unsubscribe = api.piSession.onEvent((event) => events.push(event));
		const state = await api.project.getState();
		expect(state.ok).toBe(true);
		if (!state.ok) {
			return;
		}
		const projectId = state.data.projects.find((project) => project.displayName === "pi-desktop")?.id;
		expect(projectId).toBeDefined();
		if (!projectId) {
			return;
		}

		const started = await api.piSession.start({ projectId, prompt: "Stop this" });
		expect(started.ok).toBe(true);
		if (!started.ok) {
			return;
		}
		const aborted = await api.piSession.abort({ sessionId: started.data.sessionId });
		expect(aborted).toEqual({ ok: true, data: { sessionId: started.data.sessionId, status: "idle" } });
		await vi.runAllTimersAsync();
		unsubscribe();

		expect(events).toEqual([
			{
				type: "status",
				sessionId: started.data.sessionId,
				status: "aborting",
				label: "Aborting",
				receivedAt: "2026-05-12T18:00:00.000Z",
			},
			{
				type: "status",
				sessionId: started.data.sessionId,
				status: "idle",
				label: "Idle",
				receivedAt: "2026-05-12T18:00:00.001Z",
			},
		]);
	});
});
