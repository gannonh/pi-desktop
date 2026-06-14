import { expect, test, type Page } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { launchElectronApp } from "./electron-launch";
import { createProjectId, DEFAULT_PROJECT_GIT_SETTINGS, type ProjectStore } from "../../src/shared/project-state";

const evidenceDir = process.env.UAT_EVIDENCE_DIR;
if (!evidenceDir) {
	throw new Error("Set UAT_EVIDENCE_DIR to the evidence folder before running this spec.");
}

test.use({ video: "on" });

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

const createTerminalUatStore = (projectPath: string): ProjectStore => {
	const projectId = createProjectId(projectPath);
	const now = "2026-06-14T19:00:00.000Z";
	const chatId = "chat:terminal-uat";
	return {
		projects: [
			{
				id: projectId,
				displayName: "terminal-test",
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
		selectedChatId: chatId,
		chatsByProject: {
			[projectId]: [
				{
					id: chatId,
					projectId,
					source: "draft",
					sessionId: null,
					sessionPath: "/tmp/terminal-uat-session.jsonl",
					cwd: projectPath,
					title: "Terminal UAT chat",
					status: "idle",
					attention: false,
					createdAt: now,
					updatedAt: now,
					lastOpenedAt: now,
				},
			],
		},
		standaloneChats: [],
		sessionUiByPath: {},
	};
};

test.describe("M07D terminal UAT capture", () => {
	test("terminal spawns, runs pwd and echo, and shows project cwd", async () => {
		const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-uat-"));
		const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-uat-project-"));
		const store = createTerminalUatStore(projectPath);
		await writeProjectStore(userDataDir, store);

		const app = await launchElectronApp({
			args: ["."],
			env: {
				...process.env,
				PI_DESKTOP_USER_DATA_DIR: userDataDir,
				PI_DESKTOP_SMOKE_PI_SESSION: "1",
				ELECTRON_DISABLE_SANDBOX: "1",
			},
		});

		try {
			const page = await app.firstWindow();
			await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 20_000 });
			await expect(page.getByRole("button", { name: /^Terminal UAT chat/ }).first()).toBeVisible({
				timeout: 45_000,
			});
			await screenshot(page, "01-session-layout");

			const showWorkspace = page.getByRole("button", { name: "Show workspace" });
			if (await showWorkspace.isVisible()) {
				await showWorkspace.click();
				await page.waitForTimeout(500);
			}
			await screenshot(page, "02-workspace-expanded");

			const terminalTab = page.getByRole("tab", { name: "Terminal" });
			await expect(terminalTab).toBeVisible({ timeout: 10_000 });
			await terminalTab.click();
			await page.waitForTimeout(500);
			await screenshot(page, "03-terminal-tab-active");

			const tryAgain = page.getByRole("button", { name: "Try again" });
			if (await tryAgain.isVisible()) {
				await tryAgain.click();
				await page.waitForTimeout(1000);
			}

			const terminalPanel = page.getByTestId("workspace-panel-terminal");
			await expect(terminalPanel).toBeVisible({ timeout: 10_000 });
			await expect(terminalPanel.getByText(projectPath)).toBeVisible();
			await screenshot(page, "04-terminal-panel-cwd");

			const xtermContainer = page.getByTestId("terminal-panel-xterm");
			await expect(xtermContainer).toBeVisible({ timeout: 15_000 });
			await xtermContainer.click();
			await page.waitForTimeout(1500);
			await screenshot(page, "05-terminal-ready");

			await page.keyboard.type("pwd");
			await page.keyboard.press("Enter");
			await page.waitForTimeout(1500);
			await screenshot(page, "06-after-pwd");

			await page.keyboard.type("echo pi-desktop-terminal");
			await page.keyboard.press("Enter");
			await page.waitForTimeout(1500);
			await screenshot(page, "07-after-echo");

			const terminalText = await page.locator(".xterm").innerText();
			expect(terminalText).toContain(projectPath);
			expect(terminalText).toContain("pi-desktop-terminal");

			await page.getByRole("button", { name: "Terminate" }).click();
			await expect(page.getByTestId("terminal-panel-terminated")).toBeVisible({ timeout: 10_000 });
			await screenshot(page, "08-terminated");
		} finally {
			await app.close();
			await rm(userDataDir, { recursive: true, force: true });
			await rm(projectPath, { recursive: true, force: true });
		}
	});
});
