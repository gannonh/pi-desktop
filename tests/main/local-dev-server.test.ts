import WebSocket from "ws";
import type { AppBackend } from "../../src/main/app-backend";
import { createLocalDevServer } from "../../src/main/dev-server/local-dev-server";
import { err, ok } from "../../src/shared/result";

const createBackend = (): AppBackend => {
	const listeners = new Set<(event: never) => void>();
	return {
		handle: vi.fn(async (request) => {
			if (request.operation === "app.getVersion") {
				return ok({ name: "pi-desktop dev server", version: "dev" });
			}
			return err("test.unhandled", request.operation);
		}),
		onPiSessionEvent: vi.fn((listener) => {
			listeners.add(listener as (event: never) => void);
			return () => listeners.delete(listener as (event: never) => void);
		}),
		dispose: vi.fn(async () => undefined),
	};
};

describe("local dev server", () => {
	it("serves typed RPC responses over HTTP", async () => {
		const backend = createBackend();
		const server = await createLocalDevServer({ backend, host: "127.0.0.1", port: 0 });

		try {
			const response = await fetch(`${server.url}/api/rpc`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ operation: "app.getVersion" }),
			});

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({
				ok: true,
				data: { name: "pi-desktop dev server", version: "dev" },
			});
		} finally {
			await server.close();
		}
	});

	it("returns a structured validation error for invalid RPC input", async () => {
		const backend = createBackend();
		const server = await createLocalDevServer({ backend, host: "127.0.0.1", port: 0 });

		try {
			const response = await fetch(`${server.url}/api/rpc`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ operation: "project.select", input: {} }),
			});

			expect(response.status).toBe(400);
			expect(await response.json()).toEqual({
				ok: false,
				error: {
					code: "dev_server.invalid_request",
					message: "Invalid app RPC request.",
				},
			});
		} finally {
			await server.close();
		}
	});

	it("opens websocket clients for Pi session events", async () => {
		const backend = createBackend();
		const server = await createLocalDevServer({ backend, host: "127.0.0.1", port: 0 });

		try {
			const socket = new WebSocket(server.wsUrl);
			await new Promise<void>((resolve) => socket.once("open", resolve));

			expect(backend.onPiSessionEvent).toHaveBeenCalled();
			socket.close();
		} finally {
			await server.close();
		}
	});
});
