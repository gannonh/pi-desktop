import { createHttpPiDesktopApi } from "../../src/renderer/app-api/http-client";

describe("HTTP PiDesktop API client", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("calls typed RPC operations and parses successful responses", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				json: async () => ({ ok: true, data: { name: "pi-desktop", version: "dev" } }),
			})),
		);

		const api = createHttpPiDesktopApi({ baseUrl: "http://127.0.0.1:49321" });

		await expect(api.app.getVersion()).resolves.toEqual({
			ok: true,
			data: { name: "pi-desktop", version: "dev" },
		});
		expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:49321/api/rpc", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ operation: "app.getVersion" }),
		});
	});

	it("turns network failure into a visible structured error", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("connection refused");
			}),
		);

		const api = createHttpPiDesktopApi({ baseUrl: "http://127.0.0.1:49321" });

		await expect(api.project.getState()).resolves.toEqual({
			ok: false,
			error: {
				code: "dev_bridge.unavailable",
				message: "Dev data bridge unavailable: connection refused",
			},
		});
	});
});
