// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "../../src/renderer/components/app-shell";
import { createDefaultRightPanelState } from "../../src/renderer/right-panel/right-panel-state";
import { RightPanelProvider } from "../../src/renderer/right-panel/right-panel-context";
import { createInitialSessionState } from "../../src/renderer/session/session-state";
import { createIdleTranscriptHydration } from "../../src/renderer/session/transcript-hydration";
import { ShellLayoutProvider } from "../../src/renderer/shell/shell-layout-context";
import {
	DEFAULT_PROJECT_GIT_SETTINGS,
	type ChatMetadata,
	type ProjectStateView,
	type ProjectWithChats,
} from "../../src/shared/project-state";
import { createComposerHost, previewComposerSettings } from "./composer-fixtures";

const now = "2026-06-11T00:00:00.000Z";
const projectId = "project:/tmp/pi-desktop";
const chatId = "chat:one";

const chat: ChatMetadata = {
	id: chatId,
	projectId,
	source: "pi-session",
	sessionId: "session:one",
	sessionPath: "/tmp/pi-session.jsonl",
	cwd: "/tmp/pi-desktop",
	title: "Git parity",
	status: "idle",
	attention: false,
	createdAt: now,
	updatedAt: now,
	lastOpenedAt: now,
};

const project: ProjectWithChats = {
	id: projectId,
	displayName: "pi-desktop",
	path: "/tmp/pi-desktop",
	createdAt: now,
	updatedAt: now,
	lastOpenedAt: now,
	pinned: false,
	availability: { status: "available" },
	gitSettings: DEFAULT_PROJECT_GIT_SETTINGS,
	chats: [chat],
};

const state: ProjectStateView = {
	projects: [project],
	standaloneChats: [],
	selectedProjectId: projectId,
	selectedChatId: chatId,
	selectedProject: project,
	selectedChat: chat,
};

function renderCollapsedAppShell() {
	render(
		<ShellLayoutProvider>
			<RightPanelProvider initialState={{ ...createDefaultRightPanelState(), collapsed: true }}>
				<AppShell
					state={state}
					session={createInitialSessionState()}
					transcriptHydration={createIdleTranscriptHydration()}
					transcriptScope={{ projectId, chatId }}
					onProjectState={vi.fn()}
					composerHost={createComposerHost()}
					defaultComposerSettings={previewComposerSettings}
					onAbortSession={vi.fn()}
				/>
			</RightPanelProvider>
		</ShellLayoutProvider>,
	);
}

describe("AppShell right panel collapse", () => {
	it("fully removes the workspace aside when the right panel is collapsed", () => {
		renderCollapsedAppShell();

		expect(screen.queryByLabelText("Workspace")).toBeNull();
		expect(screen.getByRole("button", { name: "Show workspace" })).toBeTruthy();
	});
});
