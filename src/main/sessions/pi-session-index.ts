import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import type { SessionInfo } from "@earendil-works/pi-coding-agent";
import { createProjectId } from "../../shared/project-state";
import type { ChatMetadata, ChatStatus, StandaloneChatMetadata } from "../../shared/project-state";
import { resolvePiSessionFilesDirForCwd, resolvePiSessionFilesRoot } from "../app-paths";

const maxChatTitleLength = 80;
const ellipsis = "...";

export type PiSessionListProgress = (loaded: number, total: number) => void;

export type PiSessionLister = {
	listProject: (cwd: string, onProgress?: PiSessionListProgress) => Promise<SessionInfo[]>;
	listAll: (onProgress?: PiSessionListProgress) => Promise<SessionInfo[]>;
};

type CreateChatFromSessionInfoInput = {
	session: SessionInfo;
	projectId?: string;
	status: ChatStatus;
	attention: boolean;
	lastOpenedAt?: string | null;
};

type CreateStandaloneChatFromSessionInfoInput = Omit<CreateChatFromSessionInfoInput, "projectId">;

const isNotFoundError = (error: unknown): boolean =>
	typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";

const countSessionFiles = async (dir: string): Promise<number> => {
	try {
		const entries = await readdir(dir);
		return entries.filter((entry) => entry.endsWith(".jsonl")).length;
	} catch {
		return 0;
	}
};

const readSessionDirs = async (root: string): Promise<string[]> => {
	try {
		const entries = await readdir(root, { withFileTypes: true });
		return entries.filter((entry) => entry.isDirectory()).map((entry) => join(root, entry.name));
	} catch (error) {
		if (isNotFoundError(error)) {
			return [];
		}
		throw error;
	}
};

const listAllSessionsFromRoot = async (root: string, onProgress?: PiSessionListProgress): Promise<SessionInfo[]> => {
	const dirs = await readSessionDirs(root);
	const totals = await Promise.all(dirs.map((dir) => countSessionFiles(dir)));
	const total = totals.reduce((sum, count) => sum + count, 0);
	let loadedOffset = 0;
	const sessions: SessionInfo[] = [];

	for (const [index, dir] of dirs.entries()) {
		const dirTotal = totals[index] ?? 0;
		const dirSessions = await SessionManager.list("", dir, (loaded) => {
			onProgress?.(loadedOffset + loaded, total);
		});
		sessions.push(...dirSessions);
		loadedOffset += dirTotal;
	}

	sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime());
	return sessions;
};

export const createPiSessionLister = (env?: NodeJS.ProcessEnv): PiSessionLister => ({
	listProject: (cwd, onProgress) => SessionManager.list(cwd, resolvePiSessionFilesDirForCwd({ cwd, env }), onProgress),
	listAll: (onProgress) => listAllSessionsFromRoot(resolvePiSessionFilesRoot(env), onProgress),
});

export const getChatTitleFromSessionInfo = (session: SessionInfo): string => {
	const name = session.name?.trim();
	if (name) {
		return name;
	}

	const firstMessage = session.firstMessage.trim();
	if (firstMessage) {
		return firstMessage.length > maxChatTitleLength
			? `${firstMessage.slice(0, maxChatTitleLength - ellipsis.length)}${ellipsis}`
			: firstMessage;
	}

	return "Untitled session";
};

export const createChatFromSessionInfo = ({
	session,
	projectId = createProjectId(session.cwd),
	status,
	attention,
	lastOpenedAt = null,
}: CreateChatFromSessionInfoInput): ChatMetadata => ({
	id: `chat:session:${session.id}`,
	projectId,
	source: "pi-session",
	sessionId: session.id,
	sessionPath: session.path,
	cwd: session.cwd,
	title: getChatTitleFromSessionInfo(session),
	status,
	attention,
	createdAt: session.created.toISOString(),
	updatedAt: session.modified.toISOString(),
	lastOpenedAt,
});

export const createStandaloneChatFromSessionInfo = ({
	session,
	status,
	attention,
	lastOpenedAt = null,
}: CreateStandaloneChatFromSessionInfoInput): StandaloneChatMetadata => ({
	id: `chat:session:${session.id}`,
	source: "pi-session",
	sessionId: session.id,
	sessionPath: session.path,
	cwd: session.cwd,
	title: getChatTitleFromSessionInfo(session),
	status,
	attention,
	createdAt: session.created.toISOString(),
	updatedAt: session.modified.toISOString(),
	lastOpenedAt,
});

export const filterStandaloneSessionInfos = (
	sessions: readonly SessionInfo[],
	trackedProjectPaths: ReadonlySet<string>,
): SessionInfo[] => {
	const trackedProjectCwds = new Set([...trackedProjectPaths].map((projectPath) => resolve(projectPath)));

	return sessions.filter((session) => !trackedProjectCwds.has(resolve(session.cwd)));
};
