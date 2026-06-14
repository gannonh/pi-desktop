// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ok } from "../../src/shared/result";
import { TerminalPanel } from "../../src/renderer/terminal/terminal-panel";
import { installTerminalApiMock } from "./terminal-test-api";
import { createXtermMock } from "./terminal-xterm-mock";

vi.mock("../../src/renderer/terminal/xterm-instance", () => ({
	createXtermTerminal: vi.fn(() => createXtermMock()),
}));

const availableProject = {
	id: "project:/tmp/pi-desktop",
	displayName: "pi-desktop",
	path: "/tmp/pi-desktop",
	createdAt: "2026-05-12T09:00:00.000Z",
	updatedAt: "2026-05-12T10:00:00.000Z",
	lastOpenedAt: "2026-05-12T10:00:00.000Z",
	pinned: false,
	availability: { status: "available" as const },
	gitSettings: { defaultBaseRef: "main" },
};

describe("TerminalPanel", () => {
	beforeEach(() => {
		installTerminalApiMock();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("renders no-project state", () => {
		render(<TerminalPanel project={null} />);
		expect(screen.getByTestId("terminal-panel-no-project")).toBeTruthy();
	});

	it("renders unavailable project state", () => {
		render(
			<TerminalPanel
				project={{
					...availableProject,
					availability: { status: "missing", checkedAt: "2026-05-12T10:00:00.000Z" },
				}}
			/>,
		);
		expect(screen.getByTestId("terminal-panel-unavailable-project")).toBeTruthy();
	});

	it("shows project cwd in panel chrome", () => {
		render(<TerminalPanel project={availableProject} />);
		expect(screen.getByText("/tmp/pi-desktop")).toBeTruthy();
		expect(screen.getByTestId("workspace-panel-terminal")).toBeTruthy();
	});

	it("keeps the xterm mount hidden while showing terminated empty state", async () => {
		installTerminalApiMock({
			spawn: vi.fn(async () => ok({ terminalId: "term-1" })),
		});
		render(<TerminalPanel project={availableProject} />);
		await vi.waitFor(() => {
			expect(screen.getByTestId("terminal-panel-xterm")).toBeTruthy();
		});
	});
});
