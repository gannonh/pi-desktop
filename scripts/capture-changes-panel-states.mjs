/**
 * Visual evidence harness for Changes panel before/after polish.
 * Usage: node scripts/capture-changes-panel-states.mjs --phase before|after
 */
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(import.meta.dirname, "..");
const projectName = "Changes panel review";

const parsePhase = () => {
	const index = process.argv.indexOf("--phase");
	const phase = index >= 0 ? process.argv[index + 1] : "before";
	if (phase !== "before" && phase !== "after") {
		throw new Error('Expected --phase before|after');
	}
	return phase;
};

const phase = parsePhase();
const evidenceDir = path.join(repoRoot, ".impeccable/evidence/changes-panel", phase);

const noopLogger = { log: () => {}, error: () => {} };
const noopProcess = {
	env: process.env,
	once: () => undefined,
	exit: (code) => {
		throw new Error(`Unexpected exit ${code ?? ""}`);
	},
};

const writeProjectStore = async (userDataDir, projectPath) => {
	const { createProjectStore } = await import("../src/main/projects/project-store.ts");
	const { createProjectId, DEFAULT_PROJECT_GIT_SETTINGS } = await import("../src/shared/project-state.ts");
	const projectId = createProjectId(projectPath);
	const now = "2026-06-15T12:00:00.000Z";
	await mkdir(userDataDir, { recursive: true });
	await createProjectStore(path.join(userDataDir, "project-store.json")).save({
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
		chatsByProject: { [projectId]: [] },
		standaloneChats: [],
		sessionUiByPath: {},
	});
};

const seedGitRepo = async (projectPath, mode) => {
	await mkdir(projectPath, { recursive: true });
	await execFileAsync("git", ["init", "-b", "main"], { cwd: projectPath });
	await execFileAsync("git", ["config", "user.email", "review@pi-desktop.local"], { cwd: projectPath });
	await execFileAsync("git", ["config", "user.name", "Pi Desktop Review"], { cwd: projectPath });
	await writeFile(path.join(projectPath, "README.md"), "# Review project\n");
	await writeFile(path.join(projectPath, "package.json"), '{ "name": "review" }\n');
	await execFileAsync("git", ["add", "."], { cwd: projectPath });
	await execFileAsync("git", ["commit", "-m", "chore: initial commit"], { cwd: projectPath });

	if (mode === "dirty" || mode === "bulk") {
		await writeFile(path.join(projectPath, "README.md"), "# Review project\n\nUpdated intro.\n");
		await mkdir(path.join(projectPath, "src/renderer"), { recursive: true });
		await mkdir(path.join(projectPath, "src/main"), { recursive: true });
		await mkdir(path.join(projectPath, "docs/specs"), { recursive: true });
		await writeFile(path.join(projectPath, "src/renderer/App.tsx"), "export {};\n");
		await writeFile(path.join(projectPath, "src/main/index.ts"), "export {};\n");
		await writeFile(path.join(projectPath, "docs/specs/new-feature.md"), "# New feature\n");
		await writeFile(path.join(projectPath, "untracked.txt"), "scratch\n");
		if (mode === "bulk") {
			await execFileAsync("git", ["add", "docs/specs/new-feature.md"], { cwd: projectPath });
		}
	}

	if (mode === "clean") {
		await execFileAsync("git", ["checkout", "-b", "feat/refine-ux"], { cwd: projectPath });
		await writeFile(path.join(projectPath, "feature.txt"), "feature branch\n");
		await execFileAsync("git", ["add", "feature.txt"], { cwd: projectPath });
		await execFileAsync("git", ["commit", "-m", "feat: refine ux branch"], { cwd: projectPath });
	}
};

const recreateGitRepo = async (currentPath, mode) => {
	await rm(currentPath, { recursive: true, force: true });
	const nextPath = await mkdtemp(path.join(os.tmpdir(), "pi-changes-review-repo-"));
	await seedGitRepo(nextPath, mode);
	return nextPath;
};

const installSourceControlMock = async (page, scenario) => {
	await page.evaluate((name) => {
		const ok = (data) => ({ ok: true, data });
		const fail = (code, message) => ({ ok: false, error: { code, message } });

		const historyEntries = [
			{
				sha: "9c6f944b".padEnd(40, "0"),
				shortSha: "9c6f944b",
				subject: "chore: skill installer",
				author: "Gannon Hall",
				authorDate: "2026-06-15T08:37:00-07:00",
				refs: ["origin/main", "origin/HEAD", "feat/refine-ux"],
			},
			{
				sha: "b1a2c3d4".padEnd(40, "1"),
				shortSha: "b1a2c3d4",
				subject: "fix(changes): workflow divider polish",
				author: "Gannon Hall",
				authorDate: "2026-06-14T16:12:00-07:00",
				refs: [],
			},
		];

		const scenarios = {
			conflict: {
				getStatus: async () =>
					ok({
						entries: [
							{ path: "README.md", status: "modified", area: "unstaged", conflictKind: "both_modified" },
							{ path: "package.json", status: "modified", area: "unstaged", conflictKind: "both_modified" },
						],
						conflictOperation: "merge",
						branch: "refs/heads/feat/refine-ux",
					}),
			},
			linkedPr: {
				getStatus: async () =>
					ok({
						entries: [],
						conflictOperation: "unknown",
						branch: "refs/heads/feat/refine-ux",
						upstreamStatus: {
							hasUpstream: true,
							upstreamName: "origin/feat/refine-ux",
							ahead: 2,
							behind: 0,
							relation: "ahead",
							isConfigured: true,
						},
					}),
				getPullRequestInfo: async () =>
					ok({
						title: "Refine Changes panel UX",
						url: "https://github.com/gannonh/pi-desktop/pull/42",
						state: "open",
						number: 42,
					}),
			},
			noGit: {
				getStatus: async () => fail("source_control.not_a_git_repo", "Project is not a git repository."),
			},
		};

		const patch = scenarios[name];
		if (!patch) return;

		const current = window.piDesktop.sourceControl;
		window.piDesktop.sourceControl = {
			...current,
			...patch,
			getHistory: async () => ok({ entries: historyEntries, incomingCount: 0, outgoingCount: 2 }),
			getBranchCompare: async () =>
				ok({
					baseRef: "main",
					headRef: "HEAD",
					ahead: 2,
					behind: 0,
					files: [
						{ path: "src/renderer/changes-panel/ChangesPanel.tsx", status: "modified" },
						{ path: "src/renderer/styles.css", status: "modified" },
					],
				}),
			getGhAuthStatus: async () =>
				ok({
					ghAvailable: true,
					authenticated: true,
					account: "gannonh",
					remediation: null,
				}),
			initializeRepository: async () => ok({}),
			abortConflict: async () => ok({}),
		};
	}, scenario);
};

const selectProjectAndOpenChat = async (page) => {
	await page.waitForFunction(async (name) => {
		const state = await window.piDesktop.project.getState();
		return state.ok && state.data.selectedProject?.displayName === name;
	}, projectName);
	const projectRow = page.getByRole("button", { name: new RegExp(projectName) }).first();
	await projectRow.waitFor({ state: "visible", timeout: 60_000 });
	await projectRow.click();
	const newChatInProject = page.getByRole("button", { name: `New chat in ${projectName}` });
	await newChatInProject.first().waitFor({ state: "visible", timeout: 60_000 });
	await newChatInProject.first().click();
	await page.waitForTimeout(1500);
	await page.waitForFunction(
		async () => {
			const state = await window.piDesktop.project.getState();
			return state.ok && state.data.selectedChat !== null;
		},
		null,
		{ timeout: 60_000 },
	);
	const composer = page.locator('textarea[aria-label="Message Pi"]');
	await composer.waitFor({ state: "visible", timeout: 60_000 });
	await composer.fill("Open workspace for source control review");
	await composer.press("Meta+Enter");
	await page.waitForSelector(".app-shell__workspace-layout", { timeout: 60_000 });
	await page.waitForTimeout(2000);
};

const openChangesPanel = async (page) => {
	await page.addStyleTag({ content: "#root > button:last-child { display: none !important; }" });
	await page.waitForFunction(() => window.piDesktop?.app?.getVersion);
	await page.waitForSelector('[data-testid="app-shell"]');
	await selectProjectAndOpenChat(page);
	const workspaceTabs = page.locator('[aria-label="Workspace tabs"]');
	if (!(await workspaceTabs.isVisible().catch(() => false))) {
		const showWorkspace = page.getByRole("button", { name: "Show workspace" });
		await showWorkspace.waitFor({ state: "visible", timeout: 60_000 });
		await showWorkspace.click();
	}
	await workspaceTabs.waitFor({ state: "visible", timeout: 60_000 });
	const changesTab = page.getByRole("tab", { name: "Changes" });
	await changesTab.waitFor({ state: "visible", timeout: 60_000 });
	if ((await changesTab.getAttribute("aria-selected")) !== "true") {
		await changesTab.click();
	}
	await page.waitForSelector('[data-testid="workspace-panel-changes"]', { timeout: 60_000 });
};

const capture = async (page, filename, setup) => {
	if (setup) await setup();
	await page.waitForTimeout(350);
	const panel = page.locator('[data-testid="workspace-panel-changes"]');
	await panel.screenshot({ path: path.join(evidenceDir, filename) });
};

const expandWorkflow = async (page, name) => {
	const trigger = page.getByRole("button", { name, exact: true });
	if ((await trigger.getAttribute("aria-expanded")) !== "true") {
		await trigger.click();
	}
};

const switchProject = async (page, userDataDir, projectPath) => {
	await writeProjectStore(userDataDir, projectPath);
	await page.reload({ waitUntil: "load" });
	await page.waitForTimeout(10_000);
	await openChangesPanel(page);
};

const main = async () => {
	await mkdir(evidenceDir, { recursive: true });
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-changes-review-data-"));
	let projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-changes-review-repo-"));
	const previousUserDataDir = process.env.PI_DESKTOP_USER_DATA_DIR;
	const previousSmoke = process.env.PI_DESKTOP_SMOKE_PI_SESSION;

	process.env.PI_DESKTOP_USER_DATA_DIR = userDataDir;
	process.env.PI_DESKTOP_SMOKE_PI_SESSION = "1";

	let server;
	const browser = await chromium.launch();

	try {
		await seedGitRepo(projectPath, "clean");
		await writeProjectStore(userDataDir, projectPath);
		const { startDevWebServer } = await import("../src/main/dev-server/start-dev-web.ts");
		server = await startDevWebServer({ logger: noopLogger, process: noopProcess });

		const context = await browser.newContext({
			viewport: { width: 1920, height: 2032 },
			deviceScaleFactor: 1,
		});
		const page = await context.newPage();
		await page.goto(server.previewUrl, { waitUntil: "load" });
		await page.waitForTimeout(10_000);
		await openChangesPanel(page);

		await capture(page, "01-clean-collapsed.png");

		await expandWorkflow(page, "Branch compare");
		await expandWorkflow(page, "History");
		await expandWorkflow(page, "Pull request");
		await capture(page, "02-clean-all-expanded.png");

		projectPath = await recreateGitRepo(projectPath, "dirty");
		await switchProject(page, userDataDir, projectPath);
		await capture(page, "03-dirty-files.png");

		projectPath = await recreateGitRepo(projectPath, "bulk");
		await switchProject(page, userDataDir, projectPath);
		await page.locator('[aria-label="Select README.md"]').click();
		await page.locator('[aria-label="Select src/renderer/App.tsx"]').click();
		await capture(page, "04-bulk-selection.png");

		await seedGitRepo(projectPath, "clean");
		await switchProject(page, userDataDir, projectPath);
		await installSourceControlMock(page, "linkedPr");
		await page.getByRole("button", { name: "Refresh source control status" }).click();
		await page.waitForTimeout(500);
		await expandWorkflow(page, "History");
		await capture(page, "05-linked-pr-history.png");

		await installSourceControlMock(page, "conflict");
		await page.getByRole("button", { name: "Refresh source control status" }).click();
		await page.waitForTimeout(500);
		await capture(page, "06-merge-conflict.png");

		const noGitPath = await mkdtemp(path.join(os.tmpdir(), "pi-changes-no-git-"));
		await installSourceControlMock(page, "noGit");
		await switchProject(page, userDataDir, noGitPath);
		await capture(page, "07-no-git.png");

		await context.close();
		console.log(`Captured ${phase} screenshots in ${evidenceDir}`);
	} finally {
		await browser.close();
		await server?.shutdown();
		if (previousUserDataDir === undefined) delete process.env.PI_DESKTOP_USER_DATA_DIR;
		else process.env.PI_DESKTOP_USER_DATA_DIR = previousUserDataDir;
		if (previousSmoke === undefined) delete process.env.PI_DESKTOP_SMOKE_PI_SESSION;
		else process.env.PI_DESKTOP_SMOKE_PI_SESSION = previousSmoke;
		await rm(userDataDir, { recursive: true, force: true });
		await rm(projectPath, { recursive: true, force: true });
	}
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
