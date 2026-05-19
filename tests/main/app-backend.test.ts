import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { createAppBackend } from "../../src/main/app-backend";
import type { AppRpcRequest } from "../../src/shared/app-transport";
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
	getSessionStartTarget: vi.fn(async () => ({
		projectId: "project:one",
		chatId: null,
		workspacePath: "/tmp/one",
		sessionPath: null,
	})),
	recordSessionStarted: vi.fn(async (input) => ({
		chatId: input.sessionPath ? (input.chatId ?? `chat:session:${input.sessionId}`) : (input.chatId ?? null),
	})),
	recordSessionStatus: vi.fn(async () => undefined),
	syncSessionChatTitle: vi.fn(async () => ({
		projects: [],
		standaloneChats: [],
		selectedProjectId: null,
		selectedChatId: null,
		selectedProject: null,
		selectedChat: null,
	})),
	createChat: vi.fn(async () => emptyState),
	createStandaloneChat: vi.fn(async () => emptyState),
	selectChat: vi.fn(async () => emptyState),
	renameChat: vi.fn(async () => emptyState),
	selectStandaloneChat: vi.fn(async () => emptyState),
	forkChat: vi.fn(async () => emptyState),
	cloneChat: vi.fn(async () => emptyState),
	branchChat: vi.fn(async () => emptyState),
});

type ProjectStateMethod =
	| "getState"
	| "createFromScratch"
	| "addExistingFolder"
	| "selectProject"
	| "renameProject"
	| "removeProject"
	| "openProjectInFinder"
	| "locateFolder"
	| "setPinned"
	| "checkAvailability"
	| "createChat"
	| "createStandaloneChat"
	| "selectChat"
	| "selectStandaloneChat"
	| "forkChat"
	| "cloneChat"
	| "branchChat";

type ProjectRouteCase = {
	request: AppRpcRequest;
	method: ProjectStateMethod;
	expectedArgs: unknown[];
};

const projectRouteCases: ProjectRouteCase[] = [
	{
		request: { operation: "project.getState" },
		method: "getState",
		expectedArgs: [],
	},
	{
		request: { operation: "project.createFromScratch" },
		method: "createFromScratch",
		expectedArgs: [],
	},
	{
		request: { operation: "project.addExistingFolder" },
		method: "addExistingFolder",
		expectedArgs: [],
	},
	{
		request: { operation: "project.select", input: { projectId: "project:one" } },
		method: "selectProject",
		expectedArgs: [{ projectId: "project:one" }],
	},
	{
		request: { operation: "project.rename", input: { projectId: "project:one", displayName: "Renamed" } },
		method: "renameProject",
		expectedArgs: [{ projectId: "project:one", displayName: "Renamed" }],
	},
	{
		request: { operation: "project.remove", input: { projectId: "project:one" } },
		method: "removeProject",
		expectedArgs: [{ projectId: "project:one" }],
	},
	{
		request: { operation: "project.openInFinder", input: { projectId: "project:one" } },
		method: "openProjectInFinder",
		expectedArgs: [{ projectId: "project:one" }],
	},
	{
		request: { operation: "project.locateFolder", input: { projectId: "project:one" } },
		method: "locateFolder",
		expectedArgs: [{ projectId: "project:one" }],
	},
	{
		request: { operation: "project.setPinned", input: { projectId: "project:one", pinned: true } },
		method: "setPinned",
		expectedArgs: [{ projectId: "project:one", pinned: true }],
	},
	{
		request: { operation: "project.checkAvailability", input: { projectId: "project:one" } },
		method: "checkAvailability",
		expectedArgs: [{ projectId: "project:one" }],
	},
	{
		request: { operation: "chat.create", input: { projectId: "project:one" } },
		method: "createChat",
		expectedArgs: [{ projectId: "project:one" }],
	},
	{
		request: { operation: "chat.createStandalone", input: {} },
		method: "createStandaloneChat",
		expectedArgs: [{}],
	},
	{
		request: { operation: "chat.select", input: { projectId: "project:one", chatId: "chat:one" } },
		method: "selectChat",
		expectedArgs: [{ projectId: "project:one", chatId: "chat:one" }],
	},
	{
		request: { operation: "chat.selectStandalone", input: { chatId: "chat:quick" } },
		method: "selectStandaloneChat",
		expectedArgs: [{ chatId: "chat:quick" }],
	},
	{
		request: { operation: "chat.fork", input: { projectId: "project:one", chatId: "chat:one" } },
		method: "forkChat",
		expectedArgs: [{ projectId: "project:one", chatId: "chat:one" }],
	},
	{
		request: { operation: "chat.clone", input: { projectId: "project:one", chatId: "chat:one" } },
		method: "cloneChat",
		expectedArgs: [{ projectId: "project:one", chatId: "chat:one" }],
	},
	{
		request: {
			operation: "chat.branch",
			input: { projectId: "project:one", chatId: "chat:one", entryId: "entry:one" },
		},
		method: "branchChat",
		expectedArgs: [{ projectId: "project:one", chatId: "chat:one", entryId: "entry:one" }],
	},
];

const waitForScheduledPrompt = async (events: unknown[]) => {
	await vi.waitFor(() => {
		expect(events).toContainEqual(expect.objectContaining({ type: "status", status: "running" }));
	});
};

const createSessionManager = (sessionPath: string | null = null) => ({
	getSessionFile: vi.fn(() => sessionPath ?? undefined),
	getSessionId: vi.fn(() => "sdk-session:one"),
});

const createSession = (promptEvents: AgentSessionEvent[] = [{ type: "agent_start" }]): PiSdkSession => {
	let listener: ((event: AgentSessionEvent) => void) | undefined;
	return {
		sessionId: "sdk-session:one",
		bindExtensions: vi.fn(async () => undefined),
		prompt: vi.fn(async () => {
			for (const event of promptEvents) {
				listener?.(event);
			}
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

	it("returns app version metadata", async () => {
		const projectService = createProjectService();
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
		});

		await expect(backend.handle({ operation: "app.getVersion" })).resolves.toEqual({
			ok: true,
			data: { name: "pi-desktop", version: "dev" },
		});
	});

	it.each(projectRouteCases)("routes $request.operation to the project service", async ({
		request,
		method,
		expectedArgs,
	}) => {
		const projectService = createProjectService();
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
		});

		const result = await backend.handle(request);

		expect(result).toEqual({ ok: true, data: emptyState });
		expect(projectService[method]).toHaveBeenCalledWith(...expectedArgs);
	});

	it("routes chat.rename to the project service", async () => {
		const projectService = createProjectService();
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
		});

		const result = await backend.handle({
			operation: "chat.rename",
			input: { projectId: "project:one", chatId: "chat:one", title: "Renamed chat" },
		});

		expect(result).toEqual({ ok: true, data: emptyState });
		expect(projectService.renameChat).toHaveBeenCalledWith({
			projectId: "project:one",
			chatId: "chat:one",
			title: "Renamed chat",
		});
	});

	it("wraps Pi session operation failures in structured results with sanitized messages", async () => {
		const projectService = createProjectService();
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
			createSessionManager: () => createSessionManager(),
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
			createSessionManager: () => createSessionManager(),
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
		expect(result).toEqual({
			ok: true,
			data: {
				sessionId: "project:one:sdk-session:one",
				projectId: "project:one",
				chatId: null,
				workspacePath: "/tmp/one",
				sessionPath: null,
				status: "running",
				resumed: false,
			},
		});
		expect(projectService.getSessionStartTarget).toHaveBeenCalledWith({ projectId: "project:one", chatId: null });
		expect(projectService.recordSessionStarted).toHaveBeenCalledWith({
			projectId: "project:one",
			chatId: null,
			sessionId: "project:one:sdk-session:one",
			sessionPath: null,
			status: "running",
		});
		expect(projectService.recordSessionStatus).toHaveBeenCalledWith({
			sessionId: "project:one:sdk-session:one",
			status: "running",
			attention: false,
			updatedAt: "2026-05-15T12:00:00.000Z",
		});
		expect(events).toContainEqual({
			type: "status",
			sessionId: "project:one:sdk-session:one",
			status: "running",
			label: "Running",
			receivedAt: "2026-05-15T12:00:00.000Z",
		});
	});

	it("persists retrying session status as running chat metadata", async () => {
		const projectService = createProjectService();
		const session = createSession([
			{
				type: "auto_retry_start",
				attempt: 1,
				maxAttempts: 3,
				delayMs: 100,
				errorMessage: "provider overloaded",
			} as AgentSessionEvent,
		]);
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
			createSessionManager: () => createSessionManager(),
			createAgentSession: vi.fn(async () => ({ session })),
		});
		const events: unknown[] = [];
		const unsubscribe = backend.onPiSessionEvent((event) => events.push(event));

		const result = await backend.handle({
			operation: "piSession.start",
			input: { projectId: "project:one", prompt: "Hello" },
		});

		await vi.waitFor(() => {
			expect(events).toContainEqual(expect.objectContaining({ type: "status", status: "retrying" }));
		});
		unsubscribe();
		expect(result.ok).toBe(true);
		expect(projectService.recordSessionStatus).toHaveBeenCalledWith({
			sessionId: "project:one:sdk-session:one",
			status: "running",
			attention: false,
			updatedAt: "2026-05-15T12:00:00.000Z",
		});
	});

	it("records disposed sessions as idle chat metadata", async () => {
		const projectService = createProjectService();
		const session = createSession();
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
			createSessionManager: () => createSessionManager(),
			createAgentSession: vi.fn(async () => ({ session })),
		});

		await backend.handle({
			operation: "piSession.start",
			input: { projectId: "project:one", prompt: "Hello" },
		});
		const result = await backend.handle({
			operation: "piSession.dispose",
			input: { sessionId: "project:one:sdk-session:one" },
		});

		expect(result).toEqual({ ok: true, data: { sessionId: "project:one:sdk-session:one", status: "idle" } });
		expect(projectService.recordSessionStatus).toHaveBeenLastCalledWith({
			sessionId: "project:one:sdk-session:one",
			status: "idle",
			attention: false,
			updatedAt: "2026-05-15T12:00:00.000Z",
		});
	});

	it("disposes a started runtime when metadata recording fails", async () => {
		const projectService = createProjectService();
		vi.mocked(projectService.recordSessionStarted).mockRejectedValueOnce(new Error("store unavailable"));
		const session = createSession();
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
			createSessionManager: () => createSessionManager(),
			createAgentSession: vi.fn(async () => ({ session })),
		});

		const result = await backend.handle({
			operation: "piSession.start",
			input: { projectId: "project:one", prompt: "Hello" },
		});

		expect(result).toEqual({
			ok: false,
			error: { code: PiSessionOperationFailedCode, message: "store unavailable" },
		});
		expect(session.dispose).toHaveBeenCalled();
	});

	it("loads persisted Pi session history for a selected chat", async () => {
		const projectService = createProjectService();
		vi.mocked(projectService.getSessionStartTarget).mockResolvedValueOnce({
			projectId: "project:one",
			chatId: "chat:one",
			workspacePath: "/tmp/one",
			sessionPath: "/tmp/one-session.jsonl",
		});
		const loadSessionHistory = vi.fn(() => ({
			sessionId: "project:one:sdk-session:one",
			status: "idle" as const,
			statusLabel: "Idle",
			messages: [{ id: "user:one", role: "user" as const, content: "what time is it?", streaming: false }],
		}));
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
			env: { PI_CODING_AGENT_SESSION_DIR: "/tmp/pi-sessions" },
			loadSessionHistory,
		});

		const result = await backend.handle({
			operation: "piSession.history",
			input: { projectId: "project:one", chatId: "chat:one" },
		});

		expect(projectService.getSessionStartTarget).toHaveBeenCalledWith({
			projectId: "project:one",
			chatId: "chat:one",
		});
		expect(loadSessionHistory).toHaveBeenCalledWith({
			projectId: "project:one",
			workspacePath: "/tmp/one",
			sessionPath: "/tmp/one-session.jsonl",
			env: { PI_CODING_AGENT_SESSION_DIR: "/tmp/pi-sessions" },
		});
		expect(result).toEqual({
			ok: true,
			data: {
				sessionId: "project:one:sdk-session:one",
				status: "idle",
				statusLabel: "Idle",
				messages: [{ id: "user:one", role: "user", content: "what time is it?", streaming: false }],
			},
		});
	});

	it("loads persisted Pi session history for a quick-start chat", async () => {
		const projectService = createProjectService();
		vi.mocked(projectService.getSessionStartTarget).mockResolvedValueOnce({
			projectId: null,
			chatId: "chat:quick",
			workspacePath: "/tmp/desktop-chats",
			sessionPath: "/tmp/desktop-chats/quick.jsonl",
		});
		const loadSessionHistory = vi.fn(() => ({
			sessionId: "standalone:sdk-session:quick",
			status: "idle" as const,
			statusLabel: "Idle",
			messages: [{ id: "user:quick", role: "user" as const, content: "side discussion", streaming: false }],
		}));
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
			loadSessionHistory,
		});

		const result = await backend.handle({
			operation: "piSession.history",
			input: { projectId: null, chatId: "chat:quick" },
		});

		expect(projectService.getSessionStartTarget).toHaveBeenCalledWith({ projectId: null, chatId: "chat:quick" });
		expect(loadSessionHistory).toHaveBeenCalledWith({
			projectId: null,
			workspacePath: "/tmp/desktop-chats",
			sessionPath: "/tmp/desktop-chats/quick.jsonl",
			env: undefined,
		});
		expect(result).toEqual({
			ok: true,
			data: {
				sessionId: "standalone:sdk-session:quick",
				status: "idle",
				statusLabel: "Idle",
				messages: [{ id: "user:quick", role: "user", content: "side discussion", streaming: false }],
			},
		});
	});

	it("resumes a Pi session from the project service start target and records started metadata", async () => {
		const projectService = createProjectService();
		vi.mocked(projectService.getSessionStartTarget).mockResolvedValueOnce({
			projectId: "project:one",
			chatId: "chat:one",
			workspacePath: "/tmp/one",
			sessionPath: "/tmp/one-session.jsonl",
		});
		const session = createSession();
		const sessionManager = createSessionManager("/tmp/one-session.jsonl");
		const createSessionManagerMock = vi.fn(() => sessionManager);
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
			createSessionManager: createSessionManagerMock,
			createAgentSession: vi.fn(async () => ({ session })),
		});

		const result = await backend.handle({
			operation: "piSession.start",
			input: { projectId: "project:one", chatId: "chat:one", prompt: "Hello" },
		});

		expect(createSessionManagerMock).toHaveBeenCalledWith({
			cwd: "/tmp/one",
			sessionPath: "/tmp/one-session.jsonl",
			env: undefined,
		});
		expect(result).toEqual({
			ok: true,
			data: {
				sessionId: "project:one:sdk-session:one",
				projectId: "project:one",
				chatId: "chat:one",
				workspacePath: "/tmp/one",
				sessionPath: "/tmp/one-session.jsonl",
				status: "running",
				resumed: true,
			},
		});
		expect(projectService.recordSessionStarted).toHaveBeenCalledWith({
			projectId: "project:one",
			chatId: "chat:one",
			sessionId: "project:one:sdk-session:one",
			sessionPath: "/tmp/one-session.jsonl",
			status: "running",
		});
		await backend.dispose();
	});

	it("syncs chat title when a Pi session becomes idle", async () => {
		const projectService = createProjectService();
		const session = createSession([{ type: "agent_end", messages: [] } as AgentSessionEvent]);
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
			createSessionManager: () => createSessionManager(),
			createAgentSession: vi.fn(async () => ({ session })),
		});
		const events: unknown[] = [];
		const unsubscribe = backend.onPiSessionEvent((event) => events.push(event));

		await backend.handle({
			operation: "piSession.start",
			input: { projectId: "project:one", prompt: "Hello" },
		});
		await waitForScheduledPrompt(events);
		unsubscribe();

		expect(projectService.syncSessionChatTitle).toHaveBeenCalledWith({
			sessionId: "project:one:sdk-session:one",
			status: "idle",
			attention: false,
			updatedAt: "2026-05-15T12:00:00.000Z",
		});
	});

	it("syncs chat title when a Pi message ends", async () => {
		const projectService = createProjectService();
		const session = createSession([
			{
				type: "message_end",
				message: {
					role: "assistant",
					content: [{ type: "text", text: "Done" }],
					api: "anthropic-messages",
					provider: "anthropic",
					model: "claude-test",
					usage: {
						input: 1,
						output: 1,
						cacheRead: 0,
						cacheWrite: 0,
						totalTokens: 2,
						cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
					},
					stopReason: "stop",
					timestamp: 3,
				},
			} as AgentSessionEvent,
		]);
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
			createSessionManager: () => createSessionManager(),
			createAgentSession: vi.fn(async () => ({ session })),
		});
		const events: unknown[] = [];
		const unsubscribe = backend.onPiSessionEvent((event) => events.push(event));

		await backend.handle({
			operation: "piSession.start",
			input: { projectId: "project:one", prompt: "Hello" },
		});
		await waitForScheduledPrompt(events);
		unsubscribe();

		expect(projectService.syncSessionChatTitle).toHaveBeenCalledWith({
			sessionId: "project:one:sdk-session:one",
			status: "running",
			attention: false,
			updatedAt: "2026-05-15T12:00:00.000Z",
		});
	});

	it("isolates Pi session event listener failures from later listeners", async () => {
		const projectService = createProjectService();
		const session = createSession();
		const backend = createAppBackend({
			appInfo: { name: "pi-desktop", version: "dev" },
			projectService,
			now: () => "2026-05-15T12:00:00.000Z",
			createSessionManager: () => createSessionManager(),
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
