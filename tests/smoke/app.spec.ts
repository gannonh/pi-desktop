import { expect, test, _electron as electron } from "@playwright/test";

test("renders the Milestone 0 app shell", async () => {
	const app = await electron.launch({
		args: ["."],
	});

	try {
		const window = await app.firstWindow();

		await expect(window.getByTestId("app-shell")).toBeVisible();
		await expect(window.getByText("pi-desktop").first()).toBeVisible();
		await expect(window.getByRole("heading", { name: "Milestone 0 foundation" })).toBeVisible();
		await expect(window.getByText("Runtime: not connected")).toBeVisible();
	} finally {
		await app.close();
	}
});
