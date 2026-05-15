import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { createAppBackend } from "../../src/main/app-backend";
import { PiSessionOperationFailedCode } from "../../src/shared/ipc";
import type { PiSdkSession } from "../../src/main/pi-session/pi-session-runtime";
import type { ProjectService } from "../../src/main/projects/project-service";
import type { ProjectStateView } from "../../src/shared/project-state";

const emptyState: ProjectStateView = {
	projects: [],
	standaloneChats: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
};

const createProjectService = (): ProjectService => ({
	getState: vi.fn(async () => emptyState),
	createFromScratch: vi.fn(async () => emptyState),
	addExistingFolder: vi.fn(async () => emptyState),
	selectProject: vi.fn(async () => emptyState),
	renameProject: vi.fn(async () => emptyState),
	removeProject: vi.fn(async () => emptyState),
	openProjectInFinder: vi.fn(async () => emptyState),
	locateFolder: vi.fn(async () => emptyState),
	setPinned: vi.fn(async () => emptyState),
	checkAvailability: vi.fn(async () => emptyState),
	getSessionWorkspace: vi.fn(async () => ({
		projectId: "project:one",
		displayName: "one",
		path: "/tmp/one",
	})),
	createChat: vi.fn(async () => emptyState),
	selectChat: vi.fn(async () => emptyState),
});

const waitForScheduledPrompt = async (events: unknown[]) => {
	await vi.waitFor(() => {
		expect(events).toContainEqual(expect.objectContaining({ type: "status", status: "running" }));
	});
};

const createSession = (): PiSdkSession => {
	let listener: ((event: AgentSessionEvent) => void) | undefined;
	return {
		sessionId: "sdk-session:one",
		bindExtensions: vi.fn(async () => undefined),
		prompt: vi.fn(async () => {
			listener?.({ type: "agent_start" });
		}),
		abort: vi.fn(async () => undefined),
		dispose: vi.fn(() => undefined),
		subscribe: vi.fn((nextListener) => {
			listener = nextListener;
			return () => {
				listener = undefined;
			};
		}),
	};
};

describe("app backend", () => {
	it("wraps project operation failures in structured results", async () => {
		const projectService = createProjectService();
		vi.mocked(projectService.getState).mockRejectedValueOnce(new Error("store unavailable"));
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
		});

		const result = await backend.handle({ operation: "project.getState" });

		expect(result).toEqual({
			ok: false,
			error: { code: "project.operation_failed", message: "store unavailable" },
		});
	});

	it("wraps Pi session operation failures in structured results with sanitized messages", async () => {
		const projectService = createProjectService();
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
			createAgentSession: vi.fn(async () => {
				throw new Error("provider failed\nAuthorization: Bearer secret-token");
			}),
		});

		const result = await backend.handle({
			operation: "piSession.start",
			input: { projectId: "project:one", prompt: "Hello" },
		});

		expect(result).toEqual({
			ok: false,
			error: { code: PiSessionOperationFailedCode, message: "provider failed" },
		});
	});

	it("starts a Pi session through the selected workspace and fans out events", async () => {
		const projectService = createProjectService();
		const session = createSession();
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
			createAgentSession: vi.fn(async () => ({ session })),
		});
		const events: unknown[] = [];
		const unsubscribe = backend.onPiSessionEvent((event) => events.push(event));

		const result = await backend.handle({
			operation: "piSession.start",
			input: { projectId: "project:one", prompt: "Hello" },
		});

		await waitForScheduledPrompt(events);
		unsubscribe();
		expect(result.ok).toBe(true);
		expect(projectService.getSessionWorkspace).toHaveBeenCalledWith({ projectId: "project:one" });
		expect(events).toContainEqual({
			type: "status",
			sessionId: "project:one:sdk-session:one",
			status: "running",
			label: "Running",
			receivedAt: "2026-05-15T12:00:00.000Z",
		});
	});

	it("isolates Pi session event listener failures from later listeners", async () => {
		const projectService = createProjectService();
		const session = createSession();
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
			createAgentSession: vi.fn(async () => ({ session })),
		});
		const listenerError = new Error("listener failed");
		const failingListener = vi.fn(() => {
			throw listenerError;
		});
		const events: unknown[] = [];
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const unsubscribeFailing = backend.onPiSessionEvent(failingListener);
		const unsubscribeReceiving = backend.onPiSessionEvent((event) => events.push(event));

		try {
			const result = await backend.handle({
				operation: "piSession.start",
				input: { projectId: "project:one", prompt: "Hello" },
			});
			await waitForScheduledPrompt(events);

			expect(result.ok).toBe(true);
			expect(failingListener).toHaveBeenCalled();
			expect(events).toContainEqual({
				type: "status",
				sessionId: "project:one:sdk-session:one",
				status: "running",
				label: "Running",
				receivedAt: "2026-05-15T12:00:00.000Z",
			});
			expect(consoleError).toHaveBeenCalledWith("Pi session event listener failed.", listenerError);
		} finally {
			unsubscribeFailing();
			unsubscribeReceiving();
			consoleError.mockRestore();
		}
	});
});
