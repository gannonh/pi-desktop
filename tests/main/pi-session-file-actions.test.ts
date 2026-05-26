import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionManagerMock = vi.hoisted(() => ({
	open: vi.fn(),
	forkFrom: vi.fn(),
}));

vi.mock("@earendil-works/pi-coding-agent", () => ({
	SessionManager: sessionManagerMock,
}));

import {
	branchSession,
	cloneSession,
	forkSession,
	writeSessionName,
} from "../../src/main/pi-session/pi-session-file-actions";

describe("pi session file actions", () => {
	beforeEach(() => {
		sessionManagerMock.open.mockReset();
		sessionManagerMock.forkFrom.mockReset();
	});

	it("writes a session display name through SessionManager", async () => {
		const manager = {
			appendSessionInfo: vi.fn(),
		};
		sessionManagerMock.open.mockReturnValue(manager);

		await writeSessionName("/tmp/source.jsonl", "Renamed session");

		expect(sessionManagerMock.open).toHaveBeenCalledWith("/tmp/source.jsonl");
		expect(manager.appendSessionInfo).toHaveBeenCalledWith("Renamed session");
	});

	it("forks a session into the target workspace session directory", async () => {
		const manager = {
			getSessionFile: vi.fn(() => "/tmp/forked.jsonl"),
		};
		sessionManagerMock.forkFrom.mockReturnValue(manager);

		await expect(
			forkSession("/tmp/source.jsonl", "/tmp/workspace", {
				PI_CODING_AGENT_SESSION_DIR: "/tmp/pi-sessions",
			}),
		).resolves.toBe("/tmp/forked.jsonl");

		expect(sessionManagerMock.forkFrom).toHaveBeenCalledWith(
			"/tmp/source.jsonl",
			"/tmp/workspace",
			"/tmp/pi-sessions/--%2Ftmp%2Fworkspace--",
		);
	});

	it("throws when a fork does not create a persisted session file", async () => {
		sessionManagerMock.forkFrom.mockReturnValue({ getSessionFile: vi.fn(() => undefined) });

		await expect(forkSession("/tmp/source.jsonl", "/tmp/workspace")).rejects.toThrow(
			/Pi session fork did not create a persisted session file/,
		);
	});

	it("clones a session from its current leaf", async () => {
		const manager = {
			getLeafId: vi.fn(() => "leaf-one"),
			createBranchedSession: vi.fn(() => "/tmp/session-clone.jsonl"),
		};
		sessionManagerMock.open.mockReturnValue(manager);

		await expect(
			cloneSession("/tmp/source.jsonl", "/tmp/workspace", {
				PI_CODING_AGENT_SESSION_DIR: "/tmp/pi-sessions",
			}),
		).resolves.toBe("/tmp/session-clone.jsonl");

		expect(sessionManagerMock.open).toHaveBeenCalledWith(
			"/tmp/source.jsonl",
			"/tmp/pi-sessions/--%2Ftmp%2Fworkspace--",
			"/tmp/workspace",
		);
		expect(manager.createBranchedSession).toHaveBeenCalledWith("leaf-one");
	});

	it("throws when cloning a session without a current leaf", async () => {
		sessionManagerMock.open.mockReturnValue({ getLeafId: vi.fn(() => null) });

		await expect(cloneSession("/tmp/source.jsonl", "/tmp/workspace")).rejects.toThrow(
			/Cannot clone a session without entries/,
		);
	});

	it("creates a branched session without moving the source session leaf", async () => {
		const manager = {
			branch: vi.fn(),
			createBranchedSession: vi.fn(() => "/tmp/session-branch.jsonl"),
		};
		sessionManagerMock.open.mockReturnValue(manager);

		await expect(
			branchSession("/tmp/source.jsonl", "/tmp/workspace", "entry-one", {
				PI_CODING_AGENT_SESSION_DIR: "/tmp/pi-sessions",
			}),
		).resolves.toBe("/tmp/session-branch.jsonl");

		expect(sessionManagerMock.open).toHaveBeenCalledWith(
			"/tmp/source.jsonl",
			"/tmp/pi-sessions/--%2Ftmp%2Fworkspace--",
			"/tmp/workspace",
		);
		expect(manager.branch).not.toHaveBeenCalled();
		expect(manager.createBranchedSession).toHaveBeenCalledWith("entry-one");
	});

	it("throws when branching does not create a persisted session file", async () => {
		sessionManagerMock.open.mockReturnValue({ createBranchedSession: vi.fn(() => undefined) });

		await expect(branchSession("/tmp/source.jsonl", "/tmp/workspace", "entry-one")).rejects.toThrow(
			/Pi session branch did not create a persisted session file/,
		);
	});
});
