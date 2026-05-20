import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "scripts/uat",
	testMatch: "m06-composer-evidence.spec.ts",
	timeout: 180_000,
	expect: {
		timeout: 20_000,
	},
	workers: 1,
	reporter: "line",
	use: {
		headless: true,
		trace: "retain-on-failure",
	},
});
