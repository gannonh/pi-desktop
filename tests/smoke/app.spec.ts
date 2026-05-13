import { expect, test, _electron as electron, type Page } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const expectHeadingTargetToReachFirstAction = async (window: Page, headingName: string, firstActionName: string) => {
	const headingBox = await window.getByRole("button", { name: headingName, exact: true }).boundingBox();
	const firstActionBox = await window.getByLabel(firstActionName).boundingBox();

	expect(headingBox).not.toBeNull();
	expect(firstActionBox).not.toBeNull();
	expect(Math.abs((headingBox?.x ?? 0) + (headingBox?.width ?? 0) - (firstActionBox?.x ?? 0))).toBeLessThanOrEqual(1);
};

test("renders the Milestone 1 project shell", async () => {
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
		await expectHeadingTargetToReachFirstAction(window, "Projects", "Collapse all projects");
		await expectHeadingTargetToReachFirstAction(window, "Chats", "Filter chats");
		await expect(window.getByRole("heading", { name: "What should we work on?" })).toBeVisible();
		await expect(window.getByText("Work in a project")).toBeVisible();
	} finally {
		await app.close();
		await rm(userDataDir, { recursive: true, force: true });
	}
});
