import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import type { SessionInfo } from "@earendil-works/pi-coding-agent";
import { createProjectId } from "../../shared/project-state";
import type { ChatMetadata, ChatStatus, StandaloneChatMetadata } from "../../shared/project-state";
import { resolvePiSessionFilesRoot } from "../app-paths";

const maxChatTitleLength = 80;
const ellipsis = "...";

export type PiSessionListProgress = (loaded: number, total: number) => void;

export type PiSessionLister = {
	listProject: (cwd: string, onProgress?: PiSessionListProgress) => Promise<SessionInfo[]>;
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

const normalizeCwd = (cwd: string): string => resolve(cwd);

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

const listSessionsMatchingCwd = async (
	root: string,
	cwd: string,
	onProgress?: PiSessionListProgress,
): Promise<SessionInfo[]> => {
	const dirs = await readSessionDirs(root);
	const targetCwd = normalizeCwd(cwd);
	const sessions: SessionInfo[] = [];
	let loadedDirs = 0;

	for (const dir of dirs) {
		const dirSessions = await SessionManager.list("", dir);
		loadedDirs += 1;
		onProgress?.(loadedDirs, dirs.length);
		sessions.push(...dirSessions.filter((session) => normalizeCwd(session.cwd) === targetCwd));
	}

	sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime());
	return sessions;
};

export const createPiSessionLister = (env?: NodeJS.ProcessEnv): PiSessionLister => ({
	listProject: (cwd, onProgress) => listSessionsMatchingCwd(resolvePiSessionFilesRoot(env), cwd, onProgress),
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
