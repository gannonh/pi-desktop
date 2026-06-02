import { expect, test, type Page } from "@playwright/test";
import { launchElectronApp } from "./electron-launch";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createProjectId, type ProjectStore } from "../../src/shared/project-state";

const expectHeadingTargetToReachFirstAction = async (
	window: Page,
	headingName: string,
	firstActionName: string | RegExp,
) => {
	const headingBox = await window.getByRole("button", { name: headingName, exact: true }).boundingBox();
	const firstActionBox = await window.getByLabel(firstActionName).boundingBox();

	expect(headingBox).not.toBeNull();
	expect(firstActionBox).not.toBeNull();
	expect(Math.abs((headingBox?.x ?? 0) + (headingBox?.width ?? 0) - (firstActionBox?.x ?? 0))).toBeLessThanOrEqual(1);
};

const expectComposerNearBottom = async (page: Page) => {
	const composer = page.locator(".composer");
	await expect(composer).toBeVisible();
	await expect
		.poll(async () => {
			const composerBox = await composer.boundingBox();
			const viewportHeight = await page.evaluate(() => window.innerHeight);

			return Boolean(composerBox && composerBox.y + composerBox.height > viewportHeight - 160);
		})
		.toBe(true);
};

const waitForSelectedProject = async (page: Page, displayName: string) => {
	await expect
		.poll(
			async () => {
				const state = await page.evaluate(async () => window.piDesktop.project.getState()).catch(() => null);
				return state?.ok === true ? state.data.selectedProject?.displayName : null;
			},
			{ timeout: 30_000 },
		)
		.toBe(displayName);
};

const expectComposerControlPlacement = async (page: Page) => {
	const inputPanelBox = await page.locator(".composer__input-panel").boundingBox();
	const messageBox = await page.getByLabel("Message Pi").boundingBox();
	const addAttachmentsBox = await page.getByLabel("Add attachments").boundingBox();
	const modelBox = await page.locator(".composer__action-row .composer__control").boundingBox();
	const voiceBox = await page.getByLabel("Voice input").boundingBox();
	const sendBox = await page.getByLabel("Send message").boundingBox();
	const projectBox = await page.getByRole("button", { name: "Work in a project" }).boundingBox();
	const modeBox = await page.locator(".composer__control-row .composer__control").last().boundingBox();

	expect(inputPanelBox).not.toBeNull();
	expect(messageBox).not.toBeNull();
	expect(addAttachmentsBox).not.toBeNull();
	expect(modelBox).not.toBeNull();
	expect(voiceBox).not.toBeNull();
	expect(sendBox).not.toBeNull();
	expect(projectBox).not.toBeNull();
	expect(modeBox).not.toBeNull();

	const actionRowY = addAttachmentsBox?.y ?? 0;
	expect(actionRowY).toBeGreaterThan((messageBox?.y ?? 0) + (messageBox?.height ?? 0) - 2);
	expect(Math.abs(actionRowY - (modelBox?.y ?? 0))).toBeLessThanOrEqual(3);
	expect(Math.abs(actionRowY - (voiceBox?.y ?? 0))).toBeLessThanOrEqual(3);
	expect(Math.abs(actionRowY - (sendBox?.y ?? 0))).toBeLessThanOrEqual(3);
	expect(
		(inputPanelBox?.y ?? 0) + (inputPanelBox?.height ?? 0) - ((sendBox?.y ?? 0) + (sendBox?.height ?? 0)),
	).toBeLessThanOrEqual(8);
	expect(projectBox?.y ?? 0).toBeGreaterThan(actionRowY + (addAttachmentsBox?.height ?? 0));
	expect(Math.abs((projectBox?.y ?? 0) - (modeBox?.y ?? 0))).toBeLessThanOrEqual(2);
};

const expectSelectedComposerVisualTokens = async (page: Page) => {
	await expect(page.locator(".app-shell__main")).toHaveCSS("background-color", "oklch(0.209 0 0)");
	await expect(page.locator(".chat-shell--start")).toHaveCSS("background-color", "oklch(0.209 0 0)");
	await expect(page.locator(".composer__input-panel")).toHaveCSS("background-color", "oklch(0.297 0 0)");
	await expect(page.locator(".composer__input-panel")).toHaveCSS("border-bottom-left-radius", "24px");
	await expect(page.locator(".composer__input-panel")).toHaveCSS("border-bottom-right-radius", "24px");
	await expect(page.locator(".composer__input-panel")).toHaveCSS(
		"box-shadow",
		"rgba(0, 0, 0, 0.3) 0px 14px 22px -14px",
	);
	await expect(page.locator(".composer__control-row")).toHaveCSS("background-color", "oklch(0.248 0 0)");
	await expect(page.locator(".composer__control-row")).toHaveCSS("box-shadow", "none");
	await expect(page.locator(".composer__control-row")).toHaveCSS("padding", "28px 12px 6px");
	await expect(page.getByLabel("Pi composer").getByRole("button", { name: "pi-desktop" })).toHaveCSS(
		"font-size",
		"14px",
	);
	await expect(page.locator(".composer__control-row .composer__control-icon").first()).toHaveCSS("width", "14px");
	await expect(page.locator(".composer__control-row .composer__control-icon").first()).toHaveCSS("height", "14px");
	await expect(page.locator(".chat-shell__suggestion").first()).toHaveCSS("border-top-color", "oklch(0.277 0 0)");

	const inputPanelBox = await page.locator(".composer__input-panel").boundingBox();
	const controlRowBox = await page.locator(".composer__control-row").boundingBox();
	const projectControlBox = await page
		.getByLabel("Pi composer")
		.getByRole("button", { name: "pi-desktop" })
		.boundingBox();
	expect(inputPanelBox).not.toBeNull();
	expect(controlRowBox).not.toBeNull();
	expect(projectControlBox).not.toBeNull();
	expect(inputPanelBox?.height).toBe(96);
	expect((inputPanelBox?.y ?? 0) + (inputPanelBox?.height ?? 0) - (controlRowBox?.y ?? 0)).toBeGreaterThanOrEqual(20);
	expect(
		(projectControlBox?.y ?? 0) - ((inputPanelBox?.y ?? 0) + (inputPanelBox?.height ?? 0)),
	).toBeGreaterThanOrEqual(6);
	expect(
		(controlRowBox?.y ?? 0) +
			(controlRowBox?.height ?? 0) -
			((projectControlBox?.y ?? 0) + (projectControlBox?.height ?? 0)),
	).toBeLessThanOrEqual(8);
};

test("shows M04 project and session management controls", async () => {
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-smoke-"));
	const app = await launchElectronApp({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
		},
	});

	try {
		const window = await app.firstWindow();

		await expect(window.getByLabel("Project navigation")).toBeVisible();
		await expect(window.getByLabel("Add project")).toBeVisible();
		await expect(window.getByLabel("Filter projects")).toBeVisible();
		await expect(window.getByLabel("Filter chats")).toBeVisible();
		await expect(window.getByRole("button", { name: "New quick-start chat" })).toBeVisible();
		await expect(window.getByRole("button", { name: "New quick-start chat" })).toBeEnabled();
		await expect(window.getByText("Projects", { exact: true })).toBeVisible();
		await expect(window.getByText("Chats", { exact: true })).toBeVisible();
	} finally {
		await app.close();
		await rm(userDataDir, { recursive: true, force: true });
	}
});

test("renders the Milestone 2 global chat start state", async () => {
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-smoke-"));
	const app = await launchElectronApp({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
		},
	});

	try {
		const window = await app.firstWindow();

		await expect(window.getByTestId("app-shell")).toBeVisible();
		await expect(window.getByText("New chat", { exact: true })).toBeVisible();
		await expect(window.getByText("Projects", { exact: true })).toBeVisible();
		await expect(window.getByLabel("Add project")).toBeVisible();
		await expect(window.getByText("Chats", { exact: true })).toBeVisible();
		await expect(window.getByLabel("Filter chats")).toHaveCount(1);
		await expect(window.getByRole("button", { name: "New quick-start chat" })).toBeVisible();
		await expect(window.getByRole("button", { name: "New quick-start chat" })).toBeEnabled();
		await expect(window.getByLabel("Collapse all chats")).toHaveCount(0);
		await expectHeadingTargetToReachFirstAction(window, "Projects", /^(Collapse|Expand) all projects$/);
		await expectHeadingTargetToReachFirstAction(window, "Chats", "Filter chats");
		await expect(window.getByRole("heading", { name: "What should we work on?" })).toBeVisible();
		await expect(window.getByLabel("Pi composer")).toBeVisible();
		await expect(window.getByLabel("Message Pi")).toHaveAttribute(
			"placeholder",
			"Ask Pi anything. @ to use skills or mention files",
		);
		await expect(window.getByRole("button", { name: "Work in a project" })).toBeVisible();
		await expect(window.locator(".composer__action-row .composer__control")).toBeVisible();
		await expect(window.locator(".composer__control-row .composer__control")).toHaveCount(2);
		await expect(window.getByText("Full access")).toHaveCount(0);
		await expectComposerControlPlacement(window);
	} finally {
		await app.close();
		await rm(userDataDir, { recursive: true, force: true });
	}
});

test("renders the selected project chat start state", async () => {
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-smoke-"));
	const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-existing-project-"));
	const projectId = createProjectId(projectPath);
	const now = "2026-05-12T12:00:00.000Z";
	const store: ProjectStore = {
		projects: [
			{
				id: projectId,
				displayName: "pi-desktop",
				path: projectPath,
				createdAt: now,
				updatedAt: now,
				lastOpenedAt: now,
				pinned: false,
				availability: { status: "available", checkedAt: now },
			},
		],
		selectedProjectId: projectId,
		selectedChatId: null,
		chatsByProject: {
			[projectId]: [],
		},
		standaloneChats: [],
		sessionUiByPath: {},
	};
	await mkdir(userDataDir, { recursive: true });
	await writeFile(path.join(userDataDir, "project-store.json"), `${JSON.stringify(store, null, 2)}\n`, "utf8");
	const app = await launchElectronApp({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
		},
	});

	try {
		const window = await app.firstWindow();

		await waitForSelectedProject(window, "pi-desktop");
		await expect(window.getByRole("heading", { name: "What should we build in pi-desktop?" })).toBeVisible();
		await expect(window.getByText("feat/M02-chat-shell", { exact: true })).toHaveCount(0);
		await expectSelectedComposerVisualTokens(window);
	} finally {
		await app.close();
		await rm(userDataDir, { recursive: true, force: true });
		await rm(projectPath, { recursive: true, force: true });
	}
});

test("streams a Pi session response in the selected project", async () => {
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-smoke-"));
	const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-existing-project-"));
	const projectId = createProjectId(projectPath);
	const now = "2026-05-12T12:00:00.000Z";
	const store: ProjectStore = {
		projects: [
			{
				id: projectId,
				displayName: "pi-desktop",
				path: projectPath,
				createdAt: now,
				updatedAt: now,
				lastOpenedAt: now,
				pinned: false,
				availability: { status: "available", checkedAt: now },
			},
		],
		selectedProjectId: null,
		selectedChatId: null,
		chatsByProject: {
			[projectId]: [],
		},
		standaloneChats: [],
		sessionUiByPath: {},
	};
	await mkdir(userDataDir, { recursive: true });
	await writeFile(path.join(userDataDir, "project-store.json"), `${JSON.stringify(store, null, 2)}\n`, "utf8");
	const app = await launchElectronApp({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
			PI_DESKTOP_SMOKE_PI_SESSION: "1",
		},
	});

	try {
		const window = await app.firstWindow();

		await window.getByRole("button", { name: "pi-desktop", exact: true }).click();
		await window.getByLabel("Message Pi").fill("What files are here?");
		await window.getByRole("button", { name: "Send message" }).click();

		await expect(window.getByText("What files are here?")).toBeVisible();
		await expect(window.getByText("Pi session streaming is connected.")).toBeVisible();
		await expect(window.getByText("Idle", { exact: true })).toBeVisible();
	} finally {
		await app.close();
		await rm(userDataDir, { recursive: true, force: true });
		await rm(projectPath, { recursive: true, force: true });
	}
});

test("refreshes project recovery UI after a Pi session start finds the folder missing", async () => {
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-smoke-"));
	const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-existing-project-"));
	const projectId = createProjectId(projectPath);
	const now = "2026-05-12T12:00:00.000Z";
	const store: ProjectStore = {
		projects: [
			{
				id: projectId,
				displayName: "pi-desktop",
				path: projectPath,
				createdAt: now,
				updatedAt: now,
				lastOpenedAt: now,
				pinned: false,
				availability: { status: "available", checkedAt: now },
			},
		],
		selectedProjectId: projectId,
		selectedChatId: null,
		chatsByProject: {
			[projectId]: [],
		},
		standaloneChats: [],
		sessionUiByPath: {},
	};
	await mkdir(userDataDir, { recursive: true });
	await writeFile(path.join(userDataDir, "project-store.json"), `${JSON.stringify(store, null, 2)}\n`, "utf8");
	const app = await launchElectronApp({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
			PI_DESKTOP_SMOKE_PI_SESSION: "1",
		},
	});

	try {
		const window = await app.firstWindow();

		await waitForSelectedProject(window, "pi-desktop");
		await expect(window.getByRole("heading", { name: "What should we build in pi-desktop?" })).toBeVisible();
		await rm(projectPath, { recursive: true, force: true });
		await window.getByLabel("Message Pi").fill("What files are here?");
		await window.getByRole("button", { name: "Send message" }).click();

		await expect(window.getByRole("heading", { name: "pi-desktop is unavailable" })).toBeVisible();
		await expect(window.getByRole("button", { name: "Locate folder" })).toBeVisible();
	} finally {
		await app.close();
		await rm(userDataDir, { recursive: true, force: true });
		await rm(projectPath, { recursive: true, force: true });
	}
});

test("renders resumed session history with markdown in the session layout", async () => {
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-smoke-"));
	const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-existing-project-"));
	const projectId = createProjectId(projectPath);
	const now = "2026-05-12T12:00:00.000Z";
	const store: ProjectStore = {
		projects: [
			{
				id: projectId,
				displayName: "pi-desktop",
				path: projectPath,
				createdAt: now,
				updatedAt: now,
				lastOpenedAt: now,
				pinned: false,
				availability: { status: "available", checkedAt: now },
			},
		],
		selectedProjectId: projectId,
		selectedChatId: "chat:smoke-history",
		chatsByProject: {
			[projectId]: [
				{
					id: "chat:smoke-history",
					projectId,
					source: "draft",
					sessionId: null,
					sessionPath: "/tmp/smoke-session.jsonl",
					cwd: projectPath,
					title: "Smoke history chat",
					status: "idle",
					attention: false,
					createdAt: now,
					updatedAt: now,
					lastOpenedAt: null,
				},
			],
		},
		standaloneChats: [],
		sessionUiByPath: {},
	};
	await mkdir(userDataDir, { recursive: true });
	await writeFile(path.join(userDataDir, "project-store.json"), `${JSON.stringify(store, null, 2)}\n`, "utf8");
	const app = await launchElectronApp({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
			PI_DESKTOP_SMOKE_PI_SESSION: "1",
		},
	});

	try {
		const window = await app.firstWindow();

		await expect(window.getByTestId("app-shell")).toBeVisible();
		await expect(window.getByRole("button", { name: /^Smoke history chat/ }).first()).toBeVisible({
			timeout: 15_000,
		});
		await expect(window.getByText("What files are here?")).toBeVisible({ timeout: 20_000 });
		await expect(window.locator("#app-shell-title")).toHaveText("Smoke history chat");
		await expect(window.getByRole("heading", { name: "Project overview" })).toBeVisible({ timeout: 15_000 });
		await expect(window.getByText("Pi session streaming is connected.")).toBeVisible();
		await expectComposerNearBottom(window);
	} finally {
		await app.close();
		await rm(userDataDir, { recursive: true, force: true });
		await rm(projectPath, { recursive: true, force: true });
	}
});

test("renders an empty selected chat as a centered start state before streaming", async () => {
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-smoke-"));
	const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-existing-project-"));
	const projectId = createProjectId(projectPath);
	const now = "2026-05-12T12:00:00.000Z";
	const store: ProjectStore = {
		projects: [
			{
				id: projectId,
				displayName: "pi-desktop",
				path: projectPath,
				createdAt: now,
				updatedAt: now,
				lastOpenedAt: now,
				pinned: false,
				availability: { status: "available", checkedAt: now },
			},
		],
		selectedProjectId: projectId,
		selectedChatId: "chat:no-fixture",
		chatsByProject: {
			[projectId]: [
				{
					id: "chat:no-fixture",
					projectId,
					source: "draft",
					sessionId: null,
					sessionPath: null,
					cwd: projectPath,
					title: "Static metadata only",
					status: "idle",
					attention: false,
					createdAt: now,
					updatedAt: now,
					lastOpenedAt: null,
				},
			],
		},
		standaloneChats: [],
		sessionUiByPath: {},
	};
	await mkdir(userDataDir, { recursive: true });
	await writeFile(path.join(userDataDir, "project-store.json"), `${JSON.stringify(store, null, 2)}\n`, "utf8");
	const app = await launchElectronApp({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
			PI_DESKTOP_SMOKE_PI_SESSION: "1",
		},
	});

	try {
		const window = await app.firstWindow();

		await waitForSelectedProject(window, "pi-desktop");
		await expect(window.getByRole("heading", { name: "What should we build in pi-desktop?" })).toBeVisible();
		await expect(window.getByLabel("Empty chat")).toHaveCount(0);
		await expectSelectedComposerVisualTokens(window);
		await window.getByLabel("Message Pi").fill("Summarize this chat");
		await window.getByRole("button", { name: "Send message" }).click();

		await expect(window.getByRole("heading", { name: "Static metadata only" })).toBeVisible();
		await expect(window.getByText("Summarize this chat")).toBeVisible();
		await expect(window.getByText("Pi session streaming is connected.")).toBeVisible();
		await expect(window.getByText("Idle", { exact: true })).toBeVisible();
		await expect(window.getByLabel("Pi composer")).toBeVisible();
	} finally {
		await app.close();
		await rm(userDataDir, { recursive: true, force: true });
		await rm(projectPath, { recursive: true, force: true });
	}
});

test("selects a missing project from the sidebar so recovery actions are reachable", async () => {
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-smoke-"));
	const availableProjectPath = await mkdtemp(path.join(os.tmpdir(), "pi-existing-project-"));
	const missingProjectPath = path.join(userDataDir, "missing-project");
	const availableProjectId = createProjectId(availableProjectPath);
	const missingProjectId = createProjectId(missingProjectPath);
	const now = "2026-05-12T12:00:00.000Z";
	const store: ProjectStore = {
		projects: [
			{
				id: availableProjectId,
				displayName: "Available project",
				path: availableProjectPath,
				createdAt: now,
				updatedAt: now,
				lastOpenedAt: now,
				pinned: false,
				availability: { status: "available", checkedAt: now },
			},
			{
				id: missingProjectId,
				displayName: "Missing project",
				path: missingProjectPath,
				createdAt: now,
				updatedAt: now,
				lastOpenedAt: "2026-05-12T11:00:00.000Z",
				pinned: false,
				availability: { status: "missing", checkedAt: now },
			},
		],
		selectedProjectId: availableProjectId,
		selectedChatId: null,
		chatsByProject: {
			[availableProjectId]: [],
			[missingProjectId]: [],
		},
		standaloneChats: [],
		sessionUiByPath: {},
	};
	await mkdir(userDataDir, { recursive: true });
	await writeFile(path.join(userDataDir, "project-store.json"), `${JSON.stringify(store, null, 2)}\n`, "utf8");
	const app = await launchElectronApp({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
		},
	});

	try {
		const window = await app.firstWindow();

		await window.getByRole("button", { name: "Missing project", exact: true }).click();

		await expect(window.getByRole("heading", { name: "Missing project is unavailable" })).toBeVisible();
		await expect(window.getByRole("button", { name: "Locate folder" })).toBeVisible();
	} finally {
		await app.close();
		await rm(userDataDir, { recursive: true, force: true });
		await rm(availableProjectPath, { recursive: true, force: true });
	}
});
