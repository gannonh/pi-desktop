import { expect, type Page } from "@playwright/test";

const SMOKE_POLL_TIMEOUT_MS = 45_000;

export const waitForAppShell = async (page: Page) => {
	await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: SMOKE_POLL_TIMEOUT_MS });
};

export const waitForDevBridge = async (page: Page) => {
	await expect
		.poll(
			async () => {
				const result = await page.evaluate(() => window.piDesktop.app.getVersion()).catch(() => null);
				return result?.ok === true;
			},
			{ timeout: SMOKE_POLL_TIMEOUT_MS },
		)
		.toBe(true);
};

export const waitForSelectedProject = async (page: Page, displayName: string) => {
	await expect
		.poll(
			async () => {
				const state = await page.evaluate(async () => window.piDesktop.project.getState()).catch(() => null);
				return state?.ok === true ? state.data.selectedProject?.displayName : null;
			},
			{ timeout: SMOKE_POLL_TIMEOUT_MS },
		)
		.toBe(displayName);
};

export const waitForProjectStartHeading = async (page: Page, projectName: string) => {
	await expect(page.getByRole("heading", { name: `What should we build in ${projectName}?` })).toBeVisible({
		timeout: SMOKE_POLL_TIMEOUT_MS,
	});
};
