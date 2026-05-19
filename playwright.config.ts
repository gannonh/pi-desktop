import { defineConfig } from "@playwright/test";

const smokeHeaded = process.env.PI_DESKTOP_SMOKE_HEADED === "1" || process.env.PWDEBUG === "1";

export default defineConfig({
	testDir: "tests/smoke",
	timeout: 120_000,
	expect: {
		timeout: 10_000,
	},
	workers: 1,
	reporter: "line",
	use: {
		trace: "retain-on-failure",
		headless: !smokeHeaded,
	},
});
