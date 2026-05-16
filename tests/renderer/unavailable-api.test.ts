import { createUnavailablePiDesktopApi } from "../../src/renderer/app-api/unavailable-api";

describe("unavailable PiDesktop API", () => {
	it("returns startup-visible errors when no transport is installed", async () => {
		const api = createUnavailablePiDesktopApi("No app transport configured.");

		await expect(api.app.getVersion()).resolves.toEqual({
			ok: false,
			error: {
				code: "app_transport.unavailable",
				message: "No app transport configured.",
			},
		});
		await expect(api.project.getState()).resolves.toEqual({
			ok: false,
			error: {
				code: "app_transport.unavailable",
				message: "No app transport configured.",
			},
		});
		expect(api.piSession.onEvent(vi.fn())()).toBeUndefined();
	});
});
