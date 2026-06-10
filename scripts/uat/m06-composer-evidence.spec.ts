import { expect, test, type Page } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { launchElectronApp } from "../../tests/smoke/electron-launch";
import { createProjectId, DEFAULT_PROJECT_GIT_SETTINGS, type ProjectStore } from "../../src/shared/project-state";

const evidenceDir = process.env.UAT_EVIDENCE_DIR;
if (!evidenceDir) {
	throw new Error("Set UAT_EVIDENCE_DIR to the evidence folder before running this spec.");
}

const screenshot = async (page: Page, name: string) => {
	await page.screenshot({
		path: path.join(evidenceDir, "screenshots", `${name}.png`),
		fullPage: true,
	});
};

const writeProjectStore = async (userDataDir: string, store: ProjectStore) => {
	await mkdir(userDataDir, { recursive: true });
	await writeFile(path.join(userDataDir, "project-store.json"), `${JSON.stringify(store, null, 2)}\n`, "utf8");
};

const launchWithStore = async (userDataDir: string, store?: ProjectStore) => {
	if (store) {
		await writeProjectStore(userDataDir, store);
	}
	return launchElectronApp({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
			PI_DESKTOP_SMOKE_PI_SESSION: "1",
			PI_DESKTOP_SMOKE_STREAM_DELAY_MS: process.env.PI_DESKTOP_SMOKE_STREAM_DELAY_MS ?? "8000",
		},
	});
};

test.describe("M06 composer UAT capture", () => {
	test.describe.configure({ mode: "serial" });

	test("01 global start blocked without project", async () => {
		const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-uat-"));
		const app = await launchWithStore(userDataDir);

		try {
			const page = await app.firstWindow();
			await expect(page.getByRole("heading", { name: "What should we work on?" })).toBeVisible();
			await expect(page.getByRole("button", { name: "Work in a project" })).toBeVisible();
			await expect(page.getByLabel("Send message")).toBeDisabled();
			await screenshot(page, "01-global-start-blocked");
		} finally {
			await app.close();
			await rm(userDataDir, { recursive: true, force: true });
		}
	});

	test("02 project start shows Pi model and thinking controls", async () => {
		const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-uat-"));
		const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-uat-project-"));
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
					gitSettings: DEFAULT_PROJECT_GIT_SETTINGS,
				},
			],
			selectedProjectId: projectId,
			selectedChatId: null,
			chatsByProject: { [projectId]: [] },
			standaloneChats: [],
			sessionUiByPath: {},
		};
		const app = await launchWithStore(userDataDir, store);

		try {
			const page = await app.firstWindow();
			await expect(page.getByRole("heading", { name: "What should we build in pi-desktop?" })).toBeVisible();
			await expect(page.locator(".composer__action-row .composer__control")).toBeVisible({ timeout: 15_000 });
			await expect(page.getByLabel("Pi composer").getByRole("button", { name: "pi-desktop" })).toBeVisible();
			await expect(page.locator(".composer__control-row .composer__control")).toHaveCount(2);
			await screenshot(page, "02-project-start-controls");
		} finally {
			await app.close();
			await rm(userDataDir, { recursive: true, force: true });
			await rm(projectPath, { recursive: true, force: true });
		}
	});

	test("03 first live message uses session layout", async () => {
		const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-uat-"));
		const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-uat-project-"));
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
					gitSettings: DEFAULT_PROJECT_GIT_SETTINGS,
				},
			],
			selectedProjectId: projectId,
			selectedChatId: null,
			chatsByProject: { [projectId]: [] },
			standaloneChats: [],
			sessionUiByPath: {},
		};
		const app = await launchWithStore(userDataDir, store);

		try {
			const page = await app.firstWindow();
			await page.getByLabel("Message Pi").fill("First message layout check");
			await page.getByLabel("Send message").click();
			await expect(page.locator(".chat-shell--session")).toBeVisible({ timeout: 15_000 });
			await expect(page.getByText("First message layout check")).toBeVisible();
			await screenshot(page, "03-session-layout-after-first-send");
		} finally {
			await app.close();
			await rm(userDataDir, { recursive: true, force: true });
			await rm(projectPath, { recursive: true, force: true });
		}
	});

	test("04 steer and follow-up queue rows while running", async () => {
		const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-uat-"));
		const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-uat-project-"));
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
					gitSettings: DEFAULT_PROJECT_GIT_SETTINGS,
				},
			],
			selectedProjectId: projectId,
			selectedChatId: null,
			chatsByProject: { [projectId]: [] },
			standaloneChats: [],
			sessionUiByPath: {},
		};
		const app = await launchWithStore(userDataDir, store);

		try {
			const page = await app.firstWindow();
			await page.getByLabel("Message Pi").fill("Start streaming for queue proof");
			await page.getByLabel("Send message").click();
			await expect(page.getByLabel("Abort run")).toBeVisible({ timeout: 10_000 });
			await page.getByLabel("Message Pi").fill("Steer while running");
			await page.getByLabel("Send message").click();
			await expect(page.locator(".composer__queue-row")).toHaveCount(1, { timeout: 10_000 });
			await expect(page.getByText(/steering queued|queued/i)).toBeVisible();
			await screenshot(page, "04-steer-queue-row");

			await page.getByLabel("Message Pi").fill("Follow up after steer");
			await page.getByLabel("Message Pi").press("Alt+Enter");
			await expect(page.locator(".composer__queue-row")).toHaveCount(2, { timeout: 10_000 });
			await screenshot(page, "05-follow-up-queue-rows");
		} finally {
			await app.close();
			await rm(userDataDir, { recursive: true, force: true });
			await rm(projectPath, { recursive: true, force: true });
		}
	});

	test("05 resumed idle chat keeps bottom session composer", async () => {
		const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-uat-"));
		const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-uat-project-"));
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
					gitSettings: DEFAULT_PROJECT_GIT_SETTINGS,
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
		const app = await launchWithStore(userDataDir, store);

		try {
			const page = await app.firstWindow();
			await expect(page.getByText("What files are here?")).toBeVisible({ timeout: 20_000 });
			await expect(page.locator(".chat-shell--session")).toBeVisible();
			await expect(page.getByLabel("Pi composer")).toBeVisible();
			await screenshot(page, "06-resumed-session-bottom-composer");
		} finally {
			await app.close();
			await rm(userDataDir, { recursive: true, force: true });
			await rm(projectPath, { recursive: true, force: true });
		}
	});
});
