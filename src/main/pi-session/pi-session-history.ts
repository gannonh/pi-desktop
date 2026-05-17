import {
	SessionManager,
	type SessionEntry,
	type SessionManager as PiSessionManager,
} from "@earendil-works/pi-coding-agent";
import type { PiSessionHistoryMessage, PiSessionHistoryPayload, PiSessionMessageRole } from "../../shared/pi-session";
import { resolvePiSessionFilesDirForCwd } from "../app-paths";
import { createDesktopSessionId } from "./pi-session-runtime";

type HistorySessionManager = Pick<PiSessionManager, "getBranch" | "getSessionId">;

export type LoadPiSessionHistoryInput = {
	projectId: string | null;
	workspacePath: string;
	sessionPath: string;
	env?: NodeJS.ProcessEnv;
	openSession?: (options: {
		sessionPath: string;
		workspacePath: string;
		env?: NodeJS.ProcessEnv;
	}) => HistorySessionManager;
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object";

const textFromContent = (content: unknown): string => {
	if (typeof content === "string") {
		return content;
	}

	if (!Array.isArray(content)) {
		return "";
	}

	return content
		.map((part) => {
			if (isRecord(part) && part.type === "text" && typeof part.text === "string") {
				return part.text;
			}
			return "";
		})
		.join("");
};

const roleFor = (role: unknown): PiSessionMessageRole => {
	if (role === "assistant" || role === "tool" || role === "system") {
		return role;
	}
	if (role === "toolResult") {
		return "tool";
	}
	return "user";
};

const contentForMessage = (message: unknown): string => {
	if (!isRecord(message)) {
		return "";
	}

	if (message.role === "bashExecution") {
		return [message.command, message.output]
			.filter((value) => typeof value === "string" && value.length > 0)
			.join("\n");
	}

	return "content" in message ? textFromContent(message.content) : "";
};

const messageFromEntry = (entry: SessionEntry): PiSessionHistoryMessage | null => {
	if (entry.type === "message") {
		const content = contentForMessage(entry.message).trim();
		if (!content) {
			return null;
		}

		return {
			id: `${entry.message.role}:${entry.id}`,
			role: roleFor(entry.message.role),
			content,
			streaming: false,
		};
	}

	if (entry.type === "compaction") {
		return {
			id: `compaction:${entry.id}`,
			role: "system",
			content: entry.summary,
			streaming: false,
		};
	}

	if (entry.type === "branch_summary") {
		return {
			id: `branch-summary:${entry.id}`,
			role: "system",
			content: entry.summary,
			streaming: false,
		};
	}

	if (entry.type === "custom_message" && entry.display) {
		const content = textFromContent(entry.content).trim();
		if (!content) {
			return null;
		}

		return {
			id: `custom:${entry.id}`,
			role: "system",
			content,
			streaming: false,
		};
	}

	return null;
};

export const loadPiSessionHistory = ({
	projectId,
	workspacePath,
	sessionPath,
	env,
	openSession = ({ sessionPath: path, workspacePath: cwd, env: nextEnv }) =>
		SessionManager.open(path, resolvePiSessionFilesDirForCwd({ cwd, env: nextEnv }), cwd),
}: LoadPiSessionHistoryInput): PiSessionHistoryPayload => {
	const manager = openSession({ sessionPath, workspacePath, env });
	const messages = manager.getBranch().flatMap((entry) => {
		const message = messageFromEntry(entry);
		return message ? [message] : [];
	});

	return {
		sessionId: createDesktopSessionId(projectId, manager.getSessionId()),
		status: "idle",
		statusLabel: "Idle",
		messages,
	};
};
