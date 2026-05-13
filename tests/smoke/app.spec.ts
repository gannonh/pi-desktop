import { expect, test, _electron as electron } from "@playwright/test";

test("renders the Milestone 1 project shell", async () => {
	const app = await electron.launch({
		args: ["."],
	});

	try {
		const window = await app.firstWindow();

		await expect(window.getByTestId("app-shell")).toBeVisible();
		await expect(window.getByText("pi-desktop").first()).toBeVisible();
		await expect(window.getByText("Projects", { exact: true })).toBeVisible();
		await expect(window.getByLabel("Add project")).toBeVisible();
		await expect(window.getByRole("heading", { name: "What should we work on?" })).toBeVisible();
		await expect(window.getByText("Work in a project")).toBeVisible();
	} finally {
		await app.close();
	}
});
