import type { ProjectStateViewResult, SourceControlGetStatusResult } from "../shared/ipc";
import type { PiSessionEvent, PiSessionSettingsPayload } from "../shared/pi-session";
import type { PiDesktopApi } from "../shared/preload-api";
import {
	type ChatMetadata,
	createProjectId,
	createProjectStateView,
	DEFAULT_PROJECT_GIT_SETTINGS,
	getNextNewProjectName,
	type ProjectRecord,
	type ProjectStore,
	type StandaloneChatMetadata,
} from "../shared/project-state";
import { writeBrowserClipboardText } from "./app-api/browser-clipboard";

const now = new Date().toISOString();

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60_000).toISOString();
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();

const project = (path: string, overrides: Partial<ProjectRecord> = {}): ProjectRecord => ({
	id: createProjectId(path),
	displayName: path.split("/").filter(Boolean).at(-1) ?? path,
	path,
	createdAt: now,
	updatedAt: now,
	lastOpenedAt: now,
	pinned: false,
	availability: { status: "available", checkedAt: now },
	gitSettings: DEFAULT_PROJECT_GIT_SETTINGS,
	...overrides,
});

const projectPathFromId = (projectId: string) => projectId.replace(/^project:/, "");

const chat = (
	projectId: string,
	id: string,
	title: string,
	updatedAt: string,
	status: ChatMetadata["status"] = "idle",
): ChatMetadata => ({
	id,
	projectId,
	source: "draft",
	sessionId: null,
	sessionPath: null,
	cwd: projectPathFromId(projectId),
	title,
	status,
	attention: false,
	createdAt: updatedAt,
	updatedAt,
	lastOpenedAt: null,
});

const standaloneChat = (
	id: string,
	title: string,
	updatedAt: string,
	status: StandaloneChatMetadata["status"] = "idle",
): StandaloneChatMetadata => ({
	id,
	source: "draft",
	sessionId: null,
	sessionPath: null,
	cwd: previewDesktopChatsPath,
	title,
	status,
	attention: false,
	createdAt: updatedAt,
	updatedAt,
	lastOpenedAt: null,
});

const previewRoot = "/tmp/pi-desktop-preview";
const previewDesktopChatsPath = `${previewRoot}/desktop-chats`;
const previewDocumentsDir = `${previewRoot}/Documents`;
const previewSessionReceivedAtBase = Date.parse("2026-05-12T18:00:00.000Z");

const previewSessionReceivedAt = (streamIndex: number, eventIndex: number) =>
	new Date(previewSessionReceivedAtBase + streamIndex * 1_000 + eventIndex).toISOString();

const previewComposerSettings: PiSessionSettingsPayload = {
	modelLabel: "5.5 High",
	modelProvider: "openai",
	modelId: "gpt-5.5",
	thinkingLevel: "high",
	availableModels: [{ provider: "openai", id: "gpt-5.5", label: "5.5 High" }],
	availableThinkingLevels: ["off", "low", "medium", "high"],
};

const piDesktop = project(`${previewRoot}/pi-desktop`, {
	displayName: "pi-desktop",
	pinned: true,
	lastOpenedAt: "2026-05-12T17:30:00.000Z",
});
const agentis = project(`${previewRoot}/agentis`, {
	displayName: "agentis",
	lastOpenedAt: "2026-05-12T16:45:00.000Z",
});
const missing = project(`${previewDocumentsDir}/New project`, {
	displayName: "New project",
	availability: { status: "missing", checkedAt: now },
	lastOpenedAt: "2026-05-12T15:30:00.000Z",
});

const store: ProjectStore = {
	projects: [piDesktop, agentis, missing],
	selectedProjectId: null,
	selectedChatId: null,
	chatsByProject: {
		[piDesktop.id]: [
			{
				...chat(piDesktop.id, "chat:resumed-preview", "Resumed session preview", hoursAgo(15)),
				source: "pi-session",
				sessionId: "preview-session:resumed",
				sessionPath: "/tmp/pi-desktop-preview/resumed-session.jsonl",
			},
			chat(piDesktop.id, "chat:project-home", "Plan project home milestone", hoursAgo(18)),
			chat(piDesktop.id, "chat:subagent", "Subagent-driven-development planning notes", minutesAgo(18 * 60 + 5)),
			chat(piDesktop.id, "chat:license", "Add MIT license", minutesAgo(18 * 60 + 15)),
			chat(piDesktop.id, "chat:foundation", "Execute milestone 0 foundation", hoursAgo(22)),
			chat(piDesktop.id, "chat:foundation-review", "Review foundation acceptance evidence", daysAgo(3)),
		],
		[agentis.id]: [
			chat(agentis.id, "chat:phase-s009", "Execute phase S009", minutesAgo(22), "running"),
			chat(agentis.id, "chat:kata-phase", "Plan kata phase", hoursAgo(2)),
			chat(agentis.id, "chat:pr-comments", "Address PR comments", hoursAgo(17)),
			chat(agentis.id, "chat:phase-s008", "Execute phase S008", hoursAgo(18)),
			chat(agentis.id, "chat:pr-comments-followup", "Address PR comments", hoursAgo(20)),
			chat(agentis.id, "chat:phase-s007", "Execute phase S007", daysAgo(2)),
		],
		[missing.id]: [chat(missing.id, "chat:missing-plan", "Draft first task", hoursAgo(16))],
	},
	standaloneChats: [],
	sessionUiByPath: {},
};

const standaloneChats = [
	standaloneChat("chat:standalone-nextjs", "Would NextJS be good for this app?", minutesAgo(51)),
];

const view = () => createProjectStateView({ ...store, standaloneChats });
const ok = () => Promise.resolve({ ok: true as const, data: view() });
type PreviewProjectLookup =
	| {
			ok: true;
			project: ProjectRecord;
			projectIndex: number;
	  }
	| Extract<ProjectStateViewResult, { ok: false }>;
const projectNotFound = (): Extract<ProjectStateViewResult, { ok: false }> => ({
	ok: false,
	error: {
		code: "preview.project_not_found",
		message: "Project not found in preview data.",
	},
});

const sourceControlUnavailable = (): Extract<SourceControlGetStatusResult, { ok: false }> => ({
	ok: false,
	error: {
		code: "source_control.unavailable",
		message: "Source control is unavailable in web preview.",
	},
});

const chatNotFound = (): Extract<ProjectStateViewResult, { ok: false }> => ({
	ok: false,
	error: {
		code: "preview.chat_not_found",
		message: "Chat not found in preview data.",
	},
});

const findProject = (projectId: string): PreviewProjectLookup => {
	const projectIndex = store.projects.findIndex((candidate) => candidate.id === projectId);
	if (projectIndex === -1) {
		return projectNotFound();
	}
	return { ok: true as const, project: store.projects[projectIndex], projectIndex };
};

const nextExistingFolderPath = () => {
	const base = `${previewRoot}/pi-mono`;
	if (!store.projects.some((candidate) => candidate.path === base)) {
		return base;
	}

	let suffix = 2;
	while (store.projects.some((candidate) => candidate.path === `${base}-${suffix}`)) {
		suffix += 1;
	}
	return `${base}-${suffix}`;
};

const addProject = (projectPath: string) => {
	const nextProject = project(projectPath, {
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		lastOpenedAt: new Date().toISOString(),
	});
	store.projects = [...store.projects, nextProject];
	store.chatsByProject[nextProject.id] = [];
	store.selectedProjectId = nextProject.id;
	store.selectedChatId = null;
};

type PreviewFileNode =
	| { kind: "file"; content: string }
	| { kind: "directory"; children: Record<string, PreviewFileNode> };

const createPreviewFileTree = (): PreviewFileNode => ({
	kind: "directory",
	children: {
		"AGENTS.md": {
			kind: "file",
			content: ["# Agent Context", "", "Preview file workspace for pi-desktop."].join("\n"),
		},
		"README.md": {
			kind: "file",
			content: ["# pi-desktop", "", "Local graphical command center for Pi coding-agent work."].join("\n"),
		},
		docs: {
			kind: "directory",
			children: {
				"roadmap.md": {
					kind: "file",
					content: ["# Roadmap", "", "M07B file explorer and viewer."].join("\n"),
				},
			},
		},
	},
});

const previewFileTrees = new Map<string, PreviewFileNode>();

const getPreviewFileTree = (projectId: string): PreviewFileNode => {
	const existing = previewFileTrees.get(projectId);
	if (existing) {
		return existing;
	}
	const created = createPreviewFileTree();
	previewFileTrees.set(projectId, created);
	return created;
};

const resolvePreviewNode = (root: PreviewFileNode, relativePath: string): PreviewFileNode | null => {
	if (relativePath.length === 0) {
		return root.kind === "directory" ? root : null;
	}

	let current: PreviewFileNode = root;
	for (const segment of relativePath.split("/")) {
		if (current.kind !== "directory") {
			return null;
		}
		const next = current.children[segment];
		if (!next) {
			return null;
		}
		current = next;
	}

	return current;
};

const toPreviewDirectoryEntries = (relativePath: string, node: PreviewFileNode) => {
	if (node.kind !== "directory") {
		return [];
	}

	return Object.entries(node.children)
		.map(([name, child]) => ({
			name,
			relativePath: relativePath.length === 0 ? name : `${relativePath}/${name}`,
			kind: child.kind === "directory" ? ("directory" as const) : ("file" as const),
		}))
		.sort((left, right) => {
			if (left.kind !== right.kind) {
				return left.kind === "directory" ? -1 : 1;
			}
			return left.name.localeCompare(right.name);
		});
};

export const installDevPreviewApi = () => {
	if ("piDesktop" in window) {
		return;
	}

	const sessionListeners = new Set<(event: PiSessionEvent) => void>();
	const pendingPreviewStreams = new Map<string, ReturnType<typeof setTimeout>>();
	let previewStreamIndex = 0;
	const emitSessionEvent = (event: PiSessionEvent) => {
		for (const listener of sessionListeners) {
			listener(event);
		}
	};
	const clearPendingPreviewStream = (sessionId: string) => {
		const timeout = pendingPreviewStreams.get(sessionId);
		if (timeout) {
			globalThis.clearTimeout(timeout);
			pendingPreviewStreams.delete(sessionId);
		}
	};
	const emitPreviewStream = (sessionId: string, prompt: string) => {
		const streamIndex = previewStreamIndex;
		previewStreamIndex += 1;
		let eventIndex = 0;
		const receivedAt = () => previewSessionReceivedAt(streamIndex, eventIndex++);
		const userMessageId = `${sessionId}:preview:${streamIndex}:user`;
		const assistantMessageId = `${sessionId}:preview:${streamIndex}:assistant`;
		emitSessionEvent({ type: "status", sessionId, status: "running", label: "Running", receivedAt: receivedAt() });
		emitSessionEvent({
			type: "message_start",
			sessionId,
			messageId: userMessageId,
			role: "user",
			content: prompt,
			receivedAt: receivedAt(),
		});
		emitSessionEvent({
			type: "message_start",
			sessionId,
			messageId: assistantMessageId,
			role: "assistant",
			content: "",
			receivedAt: receivedAt(),
		});
		const bashCallId = `${sessionId}:preview:${streamIndex}:bash`;
		const failedCallId = `${sessionId}:preview:${streamIndex}:read`;
		emitSessionEvent({
			type: "tool_execution_start",
			sessionId,
			toolCallId: bashCallId,
			toolName: "bash",
			args: { command: "ls -la" },
			receivedAt: receivedAt(),
		});
		emitSessionEvent({
			type: "tool_execution_update",
			sessionId,
			toolCallId: bashCallId,
			toolName: "bash",
			args: { command: "ls -la" },
			partialResult: {
				content: [{ type: "text", text: "README.md\n" }],
				details: {},
			},
			receivedAt: receivedAt(),
		});
		emitSessionEvent({
			type: "tool_execution_start",
			sessionId,
			toolCallId: failedCallId,
			toolName: "read",
			args: { path: "missing.txt" },
			receivedAt: receivedAt(),
		});
		for (const delta of ["I can see this project. ", "Pi session streaming is connected."]) {
			emitSessionEvent({
				type: "assistant_delta",
				sessionId,
				messageId: assistantMessageId,
				delta,
				receivedAt: receivedAt(),
			});
		}
		emitSessionEvent({
			type: "tool_execution_end",
			sessionId,
			toolCallId: bashCallId,
			toolName: "bash",
			result: {
				content: [{ type: "text", text: "README.md\nsrc\n" }],
				details: {},
			},
			isError: false,
			receivedAt: receivedAt(),
		});
		emitSessionEvent({
			type: "tool_execution_end",
			sessionId,
			toolCallId: failedCallId,
			toolName: "read",
			result: {
				content: [{ type: "text", text: "ENOENT: missing.txt" }],
				details: {},
			},
			isError: true,
			receivedAt: receivedAt(),
		});
		emitSessionEvent({
			type: "message_end",
			sessionId,
			messageId: assistantMessageId,
			role: "assistant",
			content: "I can see this project. Pi session streaming is connected.",
			receivedAt: receivedAt(),
		});
		emitSessionEvent({ type: "status", sessionId, status: "idle", label: "Idle", receivedAt: receivedAt() });
	};
	const schedulePreviewStream = (sessionId: string, prompt: string) => {
		clearPendingPreviewStream(sessionId);
		const timeout = globalThis.setTimeout(() => {
			pendingPreviewStreams.delete(sessionId);
			emitPreviewStream(sessionId, prompt);
		}, 0);
		pendingPreviewStreams.set(sessionId, timeout);
	};
	const duplicateChat = ({ projectId, chatId }: { projectId: string; chatId: string }, titleSuffix: string) => {
		const result = findProject(projectId);
		if (!result.ok) {
			return result;
		}
		const chats = store.chatsByProject[projectId] ?? [];
		const sourceChat = chats.find((candidate) => candidate.id === chatId);
		if (!sourceChat) {
			return chatNotFound();
		}
		const timestamp = new Date().toISOString();
		const nextChat = {
			...sourceChat,
			id: `chat:preview:${chats.length + 1}`,
			title: `${sourceChat.title}${titleSuffix}`,
			createdAt: timestamp,
			updatedAt: timestamp,
			lastOpenedAt: timestamp,
		};
		store.chatsByProject[projectId] = [...chats, nextChat];
		store.selectedProjectId = projectId;
		store.selectedChatId = nextChat.id;
		return ok();
	};

	const api: PiDesktopApi = {
		app: {
			getVersion: async () => ({ ok: true, data: { name: "pi-desktop web preview", version: "dev" } }),
			openExternal: async (input) => {
				window.open(input.url, "_blank", "noopener,noreferrer");
				return { ok: true, data: { opened: true as const } };
			},
		},
		project: {
			getState: ok,
			createFromScratch: async () => {
				const occupiedNames = store.projects
					.filter((candidate) => candidate.path.startsWith(`${previewDocumentsDir}/`))
					.map((candidate) => candidate.displayName);
				addProject(`${previewDocumentsDir}/${getNextNewProjectName(occupiedNames)}`);
				return ok();
			},
			addExistingFolder: async () => {
				addProject(nextExistingFolderPath());
				return ok();
			},
			select: async ({ projectId }) => {
				const result = findProject(projectId);
				if (!result.ok) {
					return result;
				}
				const { project, projectIndex } = result;
				store.projects[projectIndex] = { ...project, lastOpenedAt: new Date().toISOString() };
				store.selectedProjectId = projectId;
				store.selectedChatId = null;
				return ok();
			},
			rename: async ({ projectId, displayName }) => {
				const result = findProject(projectId);
				if (!result.ok) {
					return result;
				}
				const { project, projectIndex } = result;
				store.projects[projectIndex] = { ...project, displayName, updatedAt: new Date().toISOString() };
				return ok();
			},
			remove: async ({ projectId }) => {
				store.projects = store.projects.filter((candidate) => candidate.id !== projectId);
				delete store.chatsByProject[projectId];
				if (store.selectedProjectId === projectId) {
					store.selectedProjectId = null;
					store.selectedChatId = null;
				}
				return ok();
			},
			openInFinder: ok,
			locateFolder: async ({ projectId }) => {
				const result = findProject(projectId);
				if (!result.ok) {
					return result;
				}
				const { project: currentProject, projectIndex } = result;
				const recoveredPath = `${previewRoot}/recovered/${currentProject.displayName}`;
				const recoveredId = createProjectId(recoveredPath);
				const recoveredProject = {
					...currentProject,
					id: recoveredId,
					path: recoveredPath,
					availability: { status: "available" as const, checkedAt: new Date().toISOString() },
				};
				store.projects[projectIndex] = recoveredProject;
				store.chatsByProject[recoveredId] = (store.chatsByProject[projectId] ?? []).map((entry) => ({
					...entry,
					projectId: recoveredId,
					cwd: recoveredPath,
				}));
				delete store.chatsByProject[projectId];
				store.selectedProjectId = recoveredId;
				store.selectedChatId = null;
				return ok();
			},
			setPinned: async ({ projectId, pinned }) => {
				const result = findProject(projectId);
				if (!result.ok) {
					return result;
				}
				const { project, projectIndex } = result;
				store.projects[projectIndex] = { ...project, pinned, updatedAt: new Date().toISOString() };
				return ok();
			},
			getGitSettings: async ({ projectId }) => {
				const result = findProject(projectId);
				if (!result.ok) {
					return result;
				}
				return { ok: true as const, data: result.project.gitSettings };
			},
			setGitSettings: async ({ projectId, defaultBaseRef }) => {
				const result = findProject(projectId);
				if (!result.ok) {
					return result;
				}
				const { project, projectIndex } = result;
				store.projects[projectIndex] = {
					...project,
					gitSettings: { defaultBaseRef },
					updatedAt: new Date().toISOString(),
				};
				return ok();
			},
			checkAvailability: ok,
		},
		chat: {
			create: async ({ projectId }) => {
				const result = findProject(projectId);
				if (!result.ok) {
					return result;
				}
				const chats = store.chatsByProject[projectId] ?? [];
				const nextChat = chat(projectId, `chat:preview:${chats.length + 1}`, "New chat", new Date().toISOString());
				store.chatsByProject[projectId] = [...chats, nextChat];
				store.selectedProjectId = projectId;
				store.selectedChatId = nextChat.id;
				return ok();
			},
			createStandalone: async () => {
				const updatedAt = new Date().toISOString();
				const nextChat = standaloneChat(`chat:quick-start:${updatedAt}`, "New chat", updatedAt);
				standaloneChats.unshift(nextChat);
				store.selectedProjectId = null;
				store.selectedChatId = nextChat.id;
				return ok();
			},
			select: async ({ projectId, chatId }) => {
				const result = findProject(projectId);
				if (!result.ok) {
					return result;
				}
				store.selectedProjectId = projectId;
				store.selectedChatId = chatId;
				return ok();
			},
			rename: async ({ projectId, chatId, title }) => {
				if (projectId === null) {
					const chatIndex = standaloneChats.findIndex((candidate) => candidate.id === chatId);
					if (chatIndex === -1) {
						return chatNotFound();
					}
					standaloneChats[chatIndex] = {
						...standaloneChats[chatIndex],
						title,
						updatedAt: new Date().toISOString(),
					};
					return ok();
				}
				const result = findProject(projectId);
				if (!result.ok) {
					return result;
				}
				const chats = store.chatsByProject[projectId] ?? [];
				const chatIndex = chats.findIndex((candidate) => candidate.id === chatId);
				if (chatIndex === -1) {
					return chatNotFound();
				}
				store.chatsByProject[projectId] = chats.map((candidate, index) =>
					index === chatIndex ? { ...candidate, title, updatedAt: new Date().toISOString() } : candidate,
				);
				return ok();
			},
			selectStandalone: async ({ chatId }) => {
				store.selectedProjectId = null;
				store.selectedChatId = chatId;
				return ok();
			},
			fork: async (input) => duplicateChat(input, " fork"),
			clone: async (input) => duplicateChat(input, " copy"),
			branch: async (input) => duplicateChat(input, " branch"),
		},
		piSession: {
			start: async ({ projectId, chatId, prompt, images: _images }) => {
				if (projectId === null) {
					const chat = standaloneChats.find((candidate) => candidate.id === chatId);
					if (!chat) {
						return chatNotFound();
					}
					const sessionId = "standalone:preview-session";
					schedulePreviewStream(sessionId, prompt);
					return {
						ok: true,
						data: {
							sessionId,
							projectId,
							chatId: chat.id,
							workspacePath: chat.cwd,
							sessionPath: null,
							status: "running",
							resumed: false,
						},
					};
				}
				const result = findProject(projectId);
				if (!result.ok) {
					return result;
				}
				const sessionId = `${projectId}:preview-session`;
				schedulePreviewStream(sessionId, prompt);
				return {
					ok: true,
					data: {
						sessionId,
						projectId,
						chatId: chatId ?? null,
						workspacePath: result.project.path,
						sessionPath: null,
						status: "running",
						resumed: false,
					},
				};
			},
			submit: async ({ sessionId, prompt, images: _images }) => {
				schedulePreviewStream(sessionId, prompt);
				return { ok: true, data: { sessionId, status: "running" } };
			},
			abort: async ({ sessionId }) => {
				clearPendingPreviewStream(sessionId);
				const streamIndex = previewStreamIndex;
				previewStreamIndex += 1;
				emitSessionEvent({
					type: "status",
					sessionId,
					status: "aborting",
					label: "Aborting",
					receivedAt: previewSessionReceivedAt(streamIndex, 0),
				});
				emitSessionEvent({
					type: "status",
					sessionId,
					status: "idle",
					label: "Idle",
					receivedAt: previewSessionReceivedAt(streamIndex, 1),
				});
				return { ok: true, data: { sessionId, status: "idle" } };
			},
			history: async ({ projectId, chatId }) => {
				const sessionId = `${projectId ?? "standalone"}:${chatId}:preview-history`;
				return {
					ok: true,
					data: {
						sessionId,
						status: "idle",
						statusLabel: "Idle",
						messages: [
							{
								id: "user:preview-1",
								role: "user",
								content: "Summarize this workspace.",
								streaming: false,
							},
							{
								id: "assistant:preview-1",
								role: "assistant",
								content: "# Workspace summary\n\nPreview history is loaded with markdown rendering.",
								streaming: false,
							},
						],
					},
				};
			},
			prepare: async ({ projectId, chatId }) => ({
				ok: true,
				data: {
					sessionId: `${projectId ?? "standalone"}:${chatId ?? "preview"}:prepared`,
					projectId,
					chatId,
					workspacePath: "/tmp/pi-desktop-preview",
					sessionPath: null,
					status: "idle" as const,
					resumed: false,
				},
			}),
			attach: async ({ projectId, chatId, expectedSessionId }) => ({
				ok: true,
				data: {
					sessionId: expectedSessionId,
					projectId,
					chatId,
					workspacePath: "/tmp/pi-desktop-preview",
					sessionPath: null,
					status: "idle" as const,
					resumed: true,
				},
			}),
			dispose: async ({ sessionId }) => {
				clearPendingPreviewStream(sessionId);
				return {
					ok: true,
					data: {
						sessionId,
						status: "idle",
					},
				};
			},
			getSettings: async () => ({
				ok: true,
				data: previewComposerSettings,
			}),
			getDefaultSettings: async () => ({
				ok: true,
				data: previewComposerSettings,
			}),
			getCommands: async ({ sessionId }) => ({
				ok: true,
				data: {
					sessionId,
					commands: [],
				},
			}),
			setModel: async () => ({
				ok: true,
				data: previewComposerSettings,
			}),
			setThinkingLevel: async () => ({
				ok: true,
				data: previewComposerSettings,
			}),
			setDefaultModel: async () => ({
				ok: true,
				data: previewComposerSettings,
			}),
			setDefaultThinkingLevel: async () => ({
				ok: true,
				data: previewComposerSettings,
			}),
			updateQueuedMessage: async ({ sessionId }) => ({
				ok: true,
				data: { sessionId, messages: [] },
			}),
			removeQueuedMessage: async ({ sessionId }) => ({
				ok: true,
				data: { sessionId, messages: [] },
			}),
			onEvent: (listener) => {
				sessionListeners.add(listener);
				return () => {
					sessionListeners.delete(listener);
				};
			},
		},
		clipboard: {
			writeText: writeBrowserClipboardText,
		},
		sourceControl: {
			getStatus: async () => sourceControlUnavailable(),
			checkIgnored: async () => sourceControlUnavailable(),
			stage: async () => sourceControlUnavailable(),
			unstage: async () => sourceControlUnavailable(),
			discard: async () => sourceControlUnavailable(),
			bulkStage: async () => sourceControlUnavailable(),
			bulkUnstage: async () => sourceControlUnavailable(),
			bulkDiscard: async () => sourceControlUnavailable(),
			initializeRepository: async () => sourceControlUnavailable(),
			commit: async () => sourceControlUnavailable(),
			getDiff: async () => sourceControlUnavailable(),
			getUpstreamStatus: async () => sourceControlUnavailable(),
			fetch: async () => sourceControlUnavailable(),
			push: async () => sourceControlUnavailable(),
			forcePushWithLease: async () => sourceControlUnavailable(),
			pull: async () => sourceControlUnavailable(),
			sync: async () => sourceControlUnavailable(),
			fastForward: async () => sourceControlUnavailable(),
			publish: async () => sourceControlUnavailable(),
			rebaseFromBase: async () => sourceControlUnavailable(),
			getBranchCompare: async () => sourceControlUnavailable(),
			getHistory: async () => sourceControlUnavailable(),
			getCommitFiles: async () => sourceControlUnavailable(),
			abortConflict: async () => sourceControlUnavailable(),
			createPullRequest: async () => sourceControlUnavailable(),
			getPullRequestInfo: async () => sourceControlUnavailable(),
			getGhAuthStatus: async () => sourceControlUnavailable(),
			generateCommitMessage: async () => sourceControlUnavailable(),
			generatePullRequestFields: async () => sourceControlUnavailable(),
			cancelGeneration: async () => sourceControlUnavailable(),
		},
		workspaceFiles: {
			listDirectory: async ({ projectId, relativePath }) => {
				const lookup = findProject(projectId);
				if (!lookup.ok) {
					return lookup;
				}
				const node = resolvePreviewNode(getPreviewFileTree(projectId), relativePath);
				if (!node || node.kind !== "directory") {
					return {
						ok: false,
						error: { code: "workspace_files.path_invalid", message: "Path is not a directory." },
					};
				}
				return { ok: true, data: { entries: toPreviewDirectoryEntries(relativePath, node) } };
			},
			readFile: async ({ projectId, relativePath }) => {
				const lookup = findProject(projectId);
				if (!lookup.ok) {
					return lookup;
				}
				const node = resolvePreviewNode(getPreviewFileTree(projectId), relativePath);
				if (!node) {
					return { ok: true, data: { kind: "not_found" } };
				}
				if (node.kind === "directory") {
					return { ok: true, data: { kind: "unsupported" } };
				}
				return {
					ok: true,
					data: {
						kind: "text",
						content: node.content,
						size: new TextEncoder().encode(node.content).length,
					},
				};
			},
			writeFile: async ({ projectId, relativePath, content }) => {
				const lookup = findProject(projectId);
				if (!lookup.ok) {
					return lookup;
				}
				const segments = relativePath.split("/");
				const fileName = segments.pop();
				if (!fileName) {
					return { ok: false, error: { code: "workspace_files.path_invalid", message: "Invalid file path." } };
				}
				const parentPath = segments.join("/");
				const parent = resolvePreviewNode(getPreviewFileTree(projectId), parentPath);
				if (!parent || parent.kind !== "directory") {
					return {
						ok: false,
						error: { code: "workspace_files.path_invalid", message: "Parent folder was not found." },
					};
				}
				parent.children[fileName] = { kind: "file", content };
				return {
					ok: true,
					data: {
						relativePath,
						size: new TextEncoder().encode(content).length,
					},
				};
			},
		},
	};

	Object.defineProperty(window, "piDesktop", {
		configurable: true,
		value: api,
	});
};
