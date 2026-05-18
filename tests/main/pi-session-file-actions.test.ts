import { describe, expect, it, vi } from "vitest";

const sessionManagerMock = vi.hoisted(() => ({
	open: vi.fn(),
	forkFrom: vi.fn(),
}));

vi.mock("@earendil-works/pi-coding-agent", () => ({
	SessionManager: sessionManagerMock,
}));

import { branchSession } from "../../src/main/pi-session/pi-session-file-actions";

describe("pi session file actions", () => {
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

		expect(manager.branch).not.toHaveBeenCalled();
		expect(manager.createBranchedSession).toHaveBeenCalledWith("entry-one");
	});
});
