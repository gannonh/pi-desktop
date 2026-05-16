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
import { createProjectId, type ProjectStore } from "../../src/shared/project-state";

const devWebUrl = "http://127.0.0.1:5173/";
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
			},
		],
		selectedProjectId: projectId,
		selectedChatId: null,
		chatsByProject: {
			[projectId]: [],
		},
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
	const previousUserDataDir = process.env.PI_DESKTOP_USER_DATA_DIR;
	const previousSmokeSession = process.env.PI_DESKTOP_SMOKE_PI_SESSION;
	const previousAppServerUrl = process.env.VITE_PI_DESKTOP_APP_SERVER_URL;
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-dev-web-smoke-"));
	const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-dev-web-project-"));
	let server: DevWebServerHandle | undefined;

	try {
		await writeProjectStore(userDataDir, projectPath);
		process.env.PI_DESKTOP_USER_DATA_DIR = userDataDir;
		process.env.PI_DESKTOP_SMOKE_PI_SESSION = "1";
		delete process.env.VITE_PI_DESKTOP_APP_SERVER_URL;

		server = await startDevWebServer({ logger: noopLogger, process: noopProcess });

		await page.goto(devWebUrl);
		await hideAgentationOverlay(page);

		await expect(page.getByTestId("app-shell")).toBeVisible();
		await expect(page.getByTitle(projectPath).getByText(projectName, { exact: true })).toBeVisible();
		await expect(page.getByRole("heading", { name: `What should we build in ${projectName}?` })).toBeVisible();

		await clickButton(page, `New chat in ${projectName}`);
		const selectedChatRow = page.locator("button.project-sidebar__chat-row--selected", { hasText: "New chat" });
		await expect(selectedChatRow).toBeVisible();

		await page.locator("button.project-sidebar__project-row", { hasText: projectName }).click();
		await expect(page.locator("button.project-sidebar__chat-row--selected")).toHaveCount(0);
		await page.locator("button.project-sidebar__chat-row", { hasText: "New chat" }).click();
		await expect(selectedChatRow).toBeVisible();

		await page.getByLabel("Message Pi").fill("Confirm web bridge streaming");
		await clickButton(page, "Send message");

		await expect(page.getByText("Confirm web bridge streaming")).toBeVisible();
		await expect(page.getByText("Pi session streaming is connected.")).toBeVisible();
		await expect(page.getByText("Idle")).toBeVisible();
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
		if (previousAppServerUrl === undefined) {
			delete process.env.VITE_PI_DESKTOP_APP_SERVER_URL;
		} else {
			process.env.VITE_PI_DESKTOP_APP_SERVER_URL = previousAppServerUrl;
		}
		await rm(userDataDir, { recursive: true, force: true });
		await rm(projectPath, { recursive: true, force: true });
	}
});
