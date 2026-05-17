import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SessionInfo } from "@earendil-works/pi-coding-agent";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionManagerMock = vi.hoisted(() => ({
	list: vi.fn(),
}));

vi.mock("@earendil-works/pi-coding-agent", () => ({
	SessionManager: sessionManagerMock,
}));

import {
	createChatFromSessionInfo,
	createPiSessionLister,
	createStandaloneChatFromSessionInfo,
	getChatTitleFromSessionInfo,
} from "../../src/main/sessions/pi-session-index";
import { ChatMetadataSchema, createProjectId, StandaloneChatMetadataSchema } from "../../src/shared/project-state";

const createSessionInfo = (overrides: Partial<SessionInfo> = {}): SessionInfo => ({
	path: "/tmp/pi-sessions/2026_session.jsonl",
	id: "session-1",
	cwd: "/tmp/pi",
	name: undefined,
	parentSessionPath: undefined,
	created: new Date("2026-05-12T09:00:00.000Z"),
	modified: new Date("2026-05-12T10:00:00.000Z"),
	messageCount: 2,
	firstMessage: "Explain the renderer state",
	allMessagesText: "Explain the renderer state\nUse the project store.",
	...overrides,
});

describe("pi session index", () => {
	beforeEach(() => {
		sessionManagerMock.list.mockReset();
	});

	it("lists project sessions across all session directories by matching session cwd", async () => {
		const sessionRoot = await mkdtemp(join(tmpdir(), "pi-session-root-"));
		const encodedDir = join(sessionRoot, "--%2Ftmp%2Fpi--");
		const legacyDir = join(sessionRoot, "--tmp-pi--");
		const outsideDir = join(sessionRoot, "--tmp-outside--");
		await mkdir(encodedDir);
		await mkdir(legacyDir);
		await mkdir(outsideDir);
		const encodedSession = createSessionInfo({
			id: "encoded",
			path: join(encodedDir, "encoded.jsonl"),
			cwd: "/tmp/pi",
			modified: new Date("2026-05-12T10:00:00.000Z"),
		});
		const legacySession = createSessionInfo({
			id: "legacy",
			path: join(legacyDir, "legacy.jsonl"),
			cwd: "/tmp/pi",
			modified: new Date("2026-05-12T11:00:00.000Z"),
		});
		const outsideSession = createSessionInfo({
			id: "outside",
			path: join(outsideDir, "outside.jsonl"),
			cwd: "/tmp/outside",
			modified: new Date("2026-05-12T12:00:00.000Z"),
		});
		const onProgress = vi.fn();
		sessionManagerMock.list.mockImplementation(async (_cwd: string, dir: string) => {
			if (dir === encodedDir) {
				return [encodedSession];
			}
			if (dir === legacyDir) {
				return [legacySession];
			}
			if (dir === outsideDir) {
				return [outsideSession];
			}
			return [];
		});

		const lister = createPiSessionLister({ PI_CODING_AGENT_SESSION_DIR: sessionRoot });

		await expect(lister.listProject("/tmp/pi", onProgress)).resolves.toEqual([legacySession, encodedSession]);
		expect(lister).toHaveProperty("listProject");
		expect(sessionManagerMock.list).toHaveBeenCalledWith("", encodedDir);
		expect(sessionManagerMock.list).toHaveBeenCalledWith("", legacyDir);
		expect(sessionManagerMock.list).toHaveBeenCalledWith("", outsideDir);
		expect(onProgress).toHaveBeenLastCalledWith(3, 3);
	});

	it("uses explicit Pi session names before first message text", () => {
		const session = createSessionInfo({
			name: "  Renderer state plan  ",
			firstMessage: "Explain the renderer state",
		});

		expect(getChatTitleFromSessionInfo(session)).toBe("Renderer state plan");
	});

	it("uses first message text when no explicit name", () => {
		const session = createSessionInfo({ name: "   ", firstMessage: "  Explain the renderer state  " });
		const longSession = createSessionInfo({
			name: undefined,
			firstMessage: "1234567890".repeat(9),
		});

		expect(getChatTitleFromSessionInfo(session)).toBe("Explain the renderer state");
		expect(getChatTitleFromSessionInfo(longSession)).toBe(`${"1234567890".repeat(7)}1234567...`);
		expect(getChatTitleFromSessionInfo(longSession)).toHaveLength(80);
	});

	it("uses an untitled label for sessions without names or messages", () => {
		const session = createSessionInfo({ name: undefined, firstMessage: "   ", messageCount: 0, allMessagesText: "" });

		expect(getChatTitleFromSessionInfo(session)).toBe("Untitled session");
	});

	it("creates project ChatMetadata from SessionInfo", () => {
		const session = createSessionInfo({ name: "Project chat" });

		const chat = createChatFromSessionInfo({ session, status: "running", attention: true });

		expect(ChatMetadataSchema.parse(chat)).toEqual(chat);
		expect(chat).toEqual({
			id: "chat:session:session-1",
			projectId: createProjectId("/tmp/pi"),
			source: "pi-session",
			sessionId: "session-1",
			sessionPath: "/tmp/pi-sessions/2026_session.jsonl",
			cwd: "/tmp/pi",
			title: "Project chat",
			status: "running",
			attention: true,
			createdAt: "2026-05-12T09:00:00.000Z",
			updatedAt: "2026-05-12T10:00:00.000Z",
			lastOpenedAt: null,
		});
	});

	it("creates standalone StandaloneChatMetadata from SessionInfo", () => {
		const session = createSessionInfo({ name: undefined });

		const chat = createStandaloneChatFromSessionInfo({
			session,
			status: "idle",
			attention: false,
			lastOpenedAt: "2026-05-12T10:30:00.000Z",
		});

		expect(StandaloneChatMetadataSchema.parse(chat)).toEqual(chat);
		expect(chat).toEqual({
			id: "chat:session:session-1",
			source: "pi-session",
			sessionId: "session-1",
			sessionPath: "/tmp/pi-sessions/2026_session.jsonl",
			cwd: "/tmp/pi",
			title: "Explain the renderer state",
			status: "idle",
			attention: false,
			createdAt: "2026-05-12T09:00:00.000Z",
			updatedAt: "2026-05-12T10:00:00.000Z",
			lastOpenedAt: "2026-05-12T10:30:00.000Z",
		});
	});
});
