import type { SessionInfo } from "@earendil-works/pi-coding-agent";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionManagerMock = vi.hoisted(() => ({
	list: vi.fn(),
	listAll: vi.fn(),
}));

vi.mock("@earendil-works/pi-coding-agent", () => ({
	SessionManager: sessionManagerMock,
}));

import {
	createChatFromSessionInfo,
	createPiSessionLister,
	createStandaloneChatFromSessionInfo,
	filterStandaloneSessionInfos,
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
		sessionManagerMock.listAll.mockReset();
	});

	it("creates a lister with a project list method that passes through to Pi SessionManager", async () => {
		const session = createSessionInfo();
		const onProgress = vi.fn();
		sessionManagerMock.list.mockResolvedValue([session]);

		const lister = createPiSessionLister({ PI_CODING_AGENT_SESSION_DIR: "/tmp/pi-session-root" });

		await expect(lister.listProject("/tmp/pi", onProgress)).resolves.toEqual([session]);
		expect(lister).toHaveProperty("listProject");
		expect(sessionManagerMock.list).toHaveBeenCalledWith(
			"/tmp/pi",
			"/tmp/pi-session-root/--%2Ftmp%2Fpi--",
			onProgress,
		);
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

	it("filters standalone sessions away from tracked project paths", () => {
		const projectSession = createSessionInfo({ id: "project-session", cwd: "/tmp/pi/../pi" });
		const standaloneSession = createSessionInfo({ id: "standalone-session", cwd: "/tmp/outside" });

		expect(filterStandaloneSessionInfos([projectSession, standaloneSession], new Set(["/tmp/pi"]))).toEqual([
			standaloneSession,
		]);
	});
});
