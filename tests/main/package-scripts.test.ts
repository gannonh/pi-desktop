import packageJson from "../../package.json";

describe("package scripts", () => {
	it("runs Electron Forge through a stable package executable while loading development env", () => {
		expect(packageJson.scripts["dev:desktop"]).toBe("node --env-file-if-exists=.env.development --run=forge:start");
		expect(packageJson.scripts["forge:start"]).toBe("PNPM_CONFIG_NODE_LINKER=hoisted electron-forge start");
		expect(JSON.stringify(packageJson.scripts)).not.toContain("@electron-forge/cli/dist");
	});
});
