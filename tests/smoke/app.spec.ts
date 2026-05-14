import { expect, test, _electron as electron, type Page } from "@playwright/test";
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

const expectComposerNearBottom = async (window: Page) => {
	const composerBox = await window.getByLabel("Pi composer").boundingBox();
	const viewportHeight = await window.evaluate(() => window.innerHeight);

	expect(composerBox).not.toBeNull();
	expect((composerBox?.y ?? 0) + (composerBox?.height ?? 0)).toBeGreaterThan(viewportHeight - 160);
};

test("renders the Milestone 2 global chat start state", async () => {
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-smoke-"));
	const app = await electron.launch({
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
		await expect(window.getByLabel("New chat without project")).toHaveCount(1);
		await expect(window.getByLabel("Collapse all chats")).toHaveCount(0);
		await expectHeadingTargetToReachFirstAction(window, "Projects", /^(Collapse|Expand) all projects$/);
		await expectHeadingTargetToReachFirstAction(window, "Chats", "Filter chats");
		await expect(window.getByRole("heading", { name: "What should we work on?" })).toBeVisible();
		await expect(window.getByLabel("Pi composer")).toBeVisible();
		await expect(window.getByLabel("Message Pi")).toHaveAttribute(
			"placeholder",
			"Ask Pi anything. @ to use skills or mention files",
		);
		await expect(window.getByText("Work in a project")).toBeVisible();
		await expect(window.getByText("Full access")).toBeVisible();
		await expect(window.getByText("5.5 High")).toBeVisible();
		await expect(window.getByText("Pi runtime unavailable until Milestone 3.")).toBeVisible();
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
	};
	await mkdir(userDataDir, { recursive: true });
	await writeFile(path.join(userDataDir, "project-store.json"), `${JSON.stringify(store, null, 2)}\n`, "utf8");
	const app = await electron.launch({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
		},
	});

	try {
		const window = await app.firstWindow();

		await expect(window.getByRole("heading", { name: "What should we build in pi-desktop?" })).toBeVisible();
		await expect(window.getByTitle(projectPath).getByText("pi-desktop", { exact: true })).toBeVisible();
		await expect(window.getByText("main", { exact: true })).toBeVisible();
	} finally {
		await app.close();
		await rm(userDataDir, { recursive: true, force: true });
		await rm(projectPath, { recursive: true, force: true });
	}
});

test("renders a static continued chat route with the composer anchored to the bottom", async () => {
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
		selectedChatId: "chat:milestone-01",
		chatsByProject: {
			[projectId]: [
				{
					id: "chat:milestone-01",
					projectId,
					title: "Execute milestone 01: project home sidebar refinements",
					status: "idle",
					updatedAt: now,
				},
			],
		},
	};
	await mkdir(userDataDir, { recursive: true });
	await writeFile(path.join(userDataDir, "project-store.json"), `${JSON.stringify(store, null, 2)}\n`, "utf8");
	const app = await electron.launch({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
		},
	});

	try {
		const window = await app.firstWindow();

		await expect(
			window.getByRole("heading", { name: "Execute milestone 01: project home sidebar refinements" }),
		).toBeVisible();
		await expect(window.getByText("Worked for 7m 10s")).toBeVisible();
		await expect(window.getByText("Resolved the new open review threads.")).toBeVisible();
		await expect(window.getByText("land the pr")).toBeVisible();
		await expectComposerNearBottom(window);
	} finally {
		await app.close();
		await rm(userDataDir, { recursive: true, force: true });
		await rm(projectPath, { recursive: true, force: true });
	}
});

test("renders an empty chat route with static metadata and bottom composer", async () => {
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
					title: "Static metadata only",
					status: "idle",
					updatedAt: now,
				},
			],
		},
	};
	await mkdir(userDataDir, { recursive: true });
	await writeFile(path.join(userDataDir, "project-store.json"), `${JSON.stringify(store, null, 2)}\n`, "utf8");
	const app = await electron.launch({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
		},
	});

	try {
		const window = await app.firstWindow();

		await expect(window.getByRole("heading", { name: "Static metadata only" })).toBeVisible();
		await expect(window.getByLabel("Empty chat")).toBeVisible();
		await expectComposerNearBottom(window);
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
	};
	await mkdir(userDataDir, { recursive: true });
	await writeFile(path.join(userDataDir, "project-store.json"), `${JSON.stringify(store, null, 2)}\n`, "utf8");
	const app = await electron.launch({
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
