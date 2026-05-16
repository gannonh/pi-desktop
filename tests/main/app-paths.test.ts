import path from "node:path";
import {
	resolveElectronDevUserDataDir,
	resolvePiAgentDir,
	resolvePiSessionFilesDirForCwd,
	resolvePiSessionFilesRoot,
	resolveProjectStorePath,
} from "../../src/main/app-paths";

describe("app paths", () => {
	it("resolves the Electron dev user data directory on macOS", () => {
		expect(resolveElectronDevUserDataDir("/Users/tester", "darwin")).toBe(
			"/Users/tester/Library/Application Support/pi-desktop",
		);
	});

	it("resolves a pi-desktop workspace store from a user data directory", () => {
		expect(
			resolveProjectStorePath({
				env: { PI_DESKTOP_USER_DATA_DIR: "~/Library/Application Support/pi-desktop" },
				defaultUserDataDir: "/unused",
				homeDir: "/Users/tester",
			}),
		).toBe("/Users/tester/Library/Application Support/pi-desktop/project-store.json");
	});

	it("keeps an explicit pi-desktop workspace store file path", () => {
		expect(
			resolveProjectStorePath({
				env: { PI_DESKTOP_USER_DATA_DIR: "~/Library/Application Support/pi-desktop/project-store.json" },
				defaultUserDataDir: "/unused",
				homeDir: "/Users/tester",
			}),
		).toBe("/Users/tester/Library/Application Support/pi-desktop/project-store.json");
	});

	it("resolves Pi agent config and session files paths from explicit environment defaults", () => {
		const env = {
			PI_CODING_AGENT_DIR: "~/.pi/agent",
			PI_CODING_AGENT_SESSION_DIR: "~/.pi/agent/sessions",
		};

		expect(resolvePiAgentDir(env, "/Users/tester")).toBe("/Users/tester/.pi/agent");
		expect(resolvePiSessionFilesRoot(env, "/Users/tester")).toBe("/Users/tester/.pi/agent/sessions");
		expect(
			resolvePiSessionFilesDirForCwd({
				cwd: path.join("/Users/tester", "dev", "pi-desktop"),
				env,
				homeDir: "/Users/tester",
			}),
		).toBe("/Users/tester/.pi/agent/sessions/--Users-tester-dev-pi-desktop--");
	});
});
