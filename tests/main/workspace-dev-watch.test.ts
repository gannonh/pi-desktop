import path from "node:path";
import { describe, expect, it } from "vitest";
import { shouldSuppressDevReloadForPath } from "../../vite/workspace-dev-watch";

describe("shouldSuppressDevReloadForPath", () => {
	const root = path.join("/Volumes", "dev", "pi-desktop");

	it("suppresses docs and markdown workspace saves", () => {
		expect(shouldSuppressDevReloadForPath(path.join(root, "docs/adr/0003.md"), root)).toBe(true);
		expect(shouldSuppressDevReloadForPath(path.join(root, "DESIGN.md"), root)).toBe(true);
		expect(shouldSuppressDevReloadForPath(path.join(root, ".agents/context/PRODUCT.md"), root)).toBe(true);
	});

	it("allows source edits to keep HMR", () => {
		expect(shouldSuppressDevReloadForPath(path.join(root, "src/renderer/App.tsx"), root)).toBe(false);
	});
});
