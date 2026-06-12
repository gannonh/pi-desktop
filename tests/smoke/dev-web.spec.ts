import { expect, test, type Page } from "@playwright/test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	startDevWebServer,
	type DevWebServerHandle,
	type StartDevWebServerDeps,
} from "../../src/main/dev-server/start-dev-web";
import { createProjectStore } from "../../src/main/projects/project-store";
import { createProjectId, DEFAULT_PROJECT_GIT_SETTINGS, type ProjectStore } from "../../src/shared/project-state";
import { waitForAppShell, waitForDevBridge, waitForProjectStartHeading, waitForSelectedProject } from "./smoke-helpers";

const projectName = "Smoke bridge project";

const noopLogger = {
	log: () => {},
	error: () => {},
};

const noopProcess: NonNullable<StartDevWebServerDeps["process"]> = {
	env: process.env,
	once: () => undefined,
	exit: (code?: number) => {
		throw new Error(`Unexpected dev web process exit${code === undefined ? "" : ` ${code}`}.`);
	},
};

const writeProjectStore = async (userDataDir: string, projectPath: string) => {
	const projectId = createProjectId(projectPath);
	const now = "2026-05-12T12:00:00.000Z";
	const store: ProjectStore = {
		projects: [
			{
				id: projectId,
				displayName: projectName,
				path: projectPath,
				createdAt: now,
				updatedAt: now,
				lastOpenedAt: now,
				pinned: false,
				availability: { status: "available", checkedAt: now },
				gitSettings: DEFAULT_PROJECT_GIT_SETTINGS,
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
	await createProjectStore(path.join(userDataDir, "project-store.json")).save(store);
};

const hideAgentationOverlay = async (page: Page) => {
	await page.addStyleTag({ content: "#root > button:last-child { display: none !important; }" });
};

const clickButton = async (page: Page, name: string) => {
	await page.getByRole("button", { name, exact: true }).click();
};

test("dev web preview uses the real app data bridge for projects, chats, and Pi session streaming", async ({
	page,
}) => {
	test.setTimeout(120_000);

	const previousUserDataDir = process.env.PI_DESKTOP_USER_DATA_DIR;
	const previousSmokeSession = process.env.PI_DESKTOP_SMOKE_PI_SESSION;
	const previousSmokeStreamDelay = process.env.PI_DESKTOP_SMOKE_STREAM_DELAY_MS;
	const previousAppServerUrl = process.env.VITE_PI_DESKTOP_APP_SERVER_URL;
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-dev-web-smoke-"));
	const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-dev-web-project-"));
	let server: DevWebServerHandle | undefined;

	try {
		await writeProjectStore(userDataDir, projectPath);
		process.env.PI_DESKTOP_USER_DATA_DIR = userDataDir;
		process.env.PI_DESKTOP_SMOKE_PI_SESSION = "1";
		process.env.PI_DESKTOP_SMOKE_STREAM_DELAY_MS = "1000";
		delete process.env.VITE_PI_DESKTOP_APP_SERVER_URL;

		server = await startDevWebServer({ logger: noopLogger, process: noopProcess });

		await page.goto(server.previewUrl, { waitUntil: "load" });
		await hideAgentationOverlay(page);
		await waitForDevBridge(page);
		await waitForAppShell(page);

		await expect(page.getByRole("button", { name: "New quick-start chat" })).toBeVisible();
		await expect(page.getByRole("button", { name: "New quick-start chat" })).toBeEnabled();
		await waitForSelectedProject(page, projectName);
		await waitForProjectStartHeading(page, projectName);
		await page.evaluate(() => {
			window.piDesktop.piSession.onEvent(() => {});
		});
		await page.waitForTimeout(500);

		await clickButton(page, `New chat in ${projectName}`);
		const selectedChatRow = page.locator("button.project-sidebar__chat-row--selected", { hasText: "New chat" });
		await expect(selectedChatRow).toBeVisible();

		await page.getByLabel("Message Pi").fill("Confirm web bridge streaming");
		await expect(page.getByLabel("Message Pi")).toHaveValue("Confirm web bridge streaming");
		await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
		await clickButton(page, "Send message");

		await expect(page.getByText("Confirm web bridge streaming")).toBeVisible({ timeout: 30_000 });
		await expect(page.getByText("Pi session streaming is connected.")).toBeVisible({ timeout: 30_000 });
		await expect(page.getByText("Idle", { exact: true })).toBeVisible({ timeout: 30_000 });
		await expect(page.getByRole("button", { name: "Show workspace" })).toBeVisible();
		await expect(page.getByLabel("Workspace tabs")).toBeHidden();
		await page.getByRole("button", { name: "Show workspace" }).click();
		await expect(page.getByLabel("Workspace tabs")).toBeVisible();
		await expect(page.getByRole("tab", { name: "Changes" })).toBeVisible();
		await expect(page.getByTestId("workspace-panel-changes")).toBeVisible();
		await expect(page.getByRole("complementary", { name: "Workspace panel" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Add panel" })).toBeVisible();

		await page.getByRole("tab", { name: "Terminal" }).click();
		await expect(page.getByTestId("workspace-panel-terminal")).toBeVisible();
		await expect(page.getByTestId("workspace-panel-changes")).toHaveCount(0);

		await page.getByRole("button", { name: "Add panel" }).click();
		for (const label of ["Changes", "Terminal", "Browser", "File", "Canvas"]) {
			await expect(page.getByRole("menuitem", { name: label })).toBeVisible();
		}
		await page.keyboard.press("Escape");

		await page.setViewportSize({ width: 800, height: 900 });
		await expect(page.locator(".app-shell__workspace-layout--stacked")).toBeVisible();
		await page.getByRole("button", { name: "Hide workspace" }).click();
		await expect(page.getByTestId("workspace-panel-body")).toHaveCount(0);
		await page.getByRole("button", { name: "Show workspace" }).click();
		await expect(page.getByTestId("workspace-panel-body")).toBeVisible();
	} finally {
		await server?.shutdown();
		if (previousUserDataDir === undefined) {
			delete process.env.PI_DESKTOP_USER_DATA_DIR;
		} else {
			process.env.PI_DESKTOP_USER_DATA_DIR = previousUserDataDir;
		}
		if (previousSmokeSession === undefined) {
			delete process.env.PI_DESKTOP_SMOKE_PI_SESSION;
		} else {
			process.env.PI_DESKTOP_SMOKE_PI_SESSION = previousSmokeSession;
		}
		if (previousSmokeStreamDelay === undefined) {
			delete process.env.PI_DESKTOP_SMOKE_STREAM_DELAY_MS;
		} else {
			process.env.PI_DESKTOP_SMOKE_STREAM_DELAY_MS = previousSmokeStreamDelay;
		}
		if (previousAppServerUrl === undefined) {
			delete process.env.VITE_PI_DESKTOP_APP_SERVER_URL;
		} else {
			process.env.VITE_PI_DESKTOP_APP_SERVER_URL = previousAppServerUrl;
		}
		await rm(userDataDir, { recursive: true, force: true });
		await rm(projectPath, { recursive: true, force: true });
	}
});
