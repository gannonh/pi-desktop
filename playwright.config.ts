import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "tests/smoke",
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	workers: 1,
	reporter: "line",
	use: {
		trace: "retain-on-failure",
	},
});
