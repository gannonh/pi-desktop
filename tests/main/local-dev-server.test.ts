import { createServer as createNetServer } from "node:net";
import WebSocket from "ws";
import type { AppBackend } from "../../src/main/app-backend";
import { createLocalDevServer } from "../../src/main/dev-server/local-dev-server";
import type { PiSessionEvent } from "../../src/shared/pi-session";
import { err, ok } from "../../src/shared/result";

const createBackend = () => {
	const listeners = new Set<(event: PiSessionEvent) => void>();
	const backend: AppBackend = {
		handle: vi.fn(async (request) => {
			if (request.operation === "app.getVersion") {
				return ok({ name: "pi-desktop dev server", version: "dev" });
			}
			return err("test.unhandled", request.operation);
		}),
		onPiSessionEvent: vi.fn((listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}),
		dispose: vi.fn(async () => undefined),
	};
	return {
		backend,
		emitPiSessionEvent(event: PiSessionEvent) {
			for (const listener of [...listeners]) {
				listener(event);
			}
		},
		listenerCount() {
			return listeners.size;
		},
	};
};

const sessionEvent: PiSessionEvent = {
	type: "status",
	sessionId: "pi-session:one",
	status: "running",
	label: "Running",
	receivedAt: "2026-05-15T00:00:00.000Z",
};

const getUnusedPort = async () => {
	const server = createNetServer();
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	const address = server.address();
	await new Promise<void>((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
	if (address === null || typeof address === "string") {
		throw new Error("Test server did not bind to a TCP port.");
	}
	return address.port;
};

describe("local dev server", () => {
	it("serves typed RPC responses over HTTP", async () => {
		const { backend } = createBackend();
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
		const { backend } = createBackend();
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

	it("returns a structured request failure when the backend rejects", async () => {
		const { backend } = createBackend();
		backend.handle = vi.fn(async () => {
			throw new Error("backend failed");
		});
		const server = await createLocalDevServer({ backend, host: "127.0.0.1", port: 0 });

		try {
			const response = await fetch(`${server.url}/api/rpc`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ operation: "app.getVersion" }),
			});

			expect(response.status).toBe(500);
			expect(await response.json()).toEqual({
				ok: false,
				error: {
					code: "dev_server.request_failed",
					message: "Request failed.",
				},
			});
		} finally {
			await server.close();
		}
	});

	it("returns a structured request failure when the backend result cannot be serialized", async () => {
		const { backend } = createBackend();
		backend.handle = vi.fn(
			async () => ({ ok: true, data: { value: 1n } }) as unknown as Awaited<ReturnType<AppBackend["handle"]>>,
		);
		const server = await createLocalDevServer({ backend, host: "127.0.0.1", port: 0 });

		try {
			const response = await fetch(`${server.url}/api/rpc`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ operation: "app.getVersion" }),
			});

			expect(response.status).toBe(500);
			expect(await response.json()).toEqual({
				ok: false,
				error: {
					code: "dev_server.request_failed",
					message: "Request failed.",
				},
			});
		} finally {
			await server.close();
		}
	});

	it("rejects HTTP requests with unexpected origins", async () => {
		const { backend } = createBackend();
		const server = await createLocalDevServer({ backend, host: "127.0.0.1", port: 0 });

		try {
			const response = await fetch(`${server.url}/api/rpc`, {
				method: "POST",
				headers: { "content-type": "application/json", origin: "http://example.test" },
				body: JSON.stringify({ operation: "app.getVersion" }),
			});

			expect(response.status).toBe(403);
			expect(await response.json()).toEqual({
				ok: false,
				error: {
					code: "dev_server.forbidden_origin",
					message: "Origin is not allowed.",
				},
			});
			expect(backend.handle).not.toHaveBeenCalled();
		} finally {
			await server.close();
		}
	});

	it("rejects oversized JSON request bodies", async () => {
		const { backend } = createBackend();
		const server = await createLocalDevServer({ backend, host: "127.0.0.1", port: 0 });

		try {
			const response = await fetch(`${server.url}/api/rpc`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ operation: "app.getVersion", padding: "x".repeat(1024 * 1024) }),
			});

			expect(response.status).toBe(413);
			expect(await response.json()).toEqual({
				ok: false,
				error: {
					code: "dev_server.body_too_large",
					message: "Request body is too large.",
				},
			});
		} finally {
			await server.close();
		}
	});

	it("opens websocket clients and sends Pi session event envelopes", async () => {
		const fixture = createBackend();
		const server = await createLocalDevServer({ backend: fixture.backend, host: "127.0.0.1", port: 0 });
		let closed = false;

		try {
			const socket = new WebSocket(server.wsUrl);
			await new Promise<void>((resolve) => socket.once("open", resolve));

			const message = new Promise<unknown>((resolve) => {
				socket.once("message", (data) => resolve(JSON.parse(data.toString())));
			});
			fixture.emitPiSessionEvent(sessionEvent);

			expect(fixture.backend.onPiSessionEvent).toHaveBeenCalled();
			expect(await message).toEqual({ type: "pi-session:event", event: sessionEvent });

			socket.close();
			await new Promise<void>((resolve) => socket.once("close", resolve));
			await server.close();
			closed = true;
			expect(fixture.listenerCount()).toBe(0);
		} finally {
			if (!closed) {
				await server.close();
			}
		}
	});

	it("rejects websocket clients with unexpected origins", async () => {
		const { backend } = createBackend();
		const server = await createLocalDevServer({ backend, host: "127.0.0.1", port: 0 });

		try {
			const socket = new WebSocket(server.wsUrl, { headers: { Origin: "http://example.test" } });
			const statusCode = await new Promise<number>((resolve, reject) => {
				socket.once("unexpected-response", (_request, response) => resolve(response.statusCode ?? 0));
				socket.once("open", () => reject(new Error("unexpected websocket open")));
				socket.once("error", reject);
			});

			expect(statusCode).toBe(403);
		} finally {
			await server.close();
		}
	});

	it("rejects when the requested listen address is already in use", async () => {
		const { backend } = createBackend();
		const firstServer = await createLocalDevServer({ backend, host: "127.0.0.1", port: 0 });
		const port = Number(new URL(firstServer.url).port);

		try {
			await expect(
				createLocalDevServer({ backend: createBackend().backend, host: "127.0.0.1", port }),
			).rejects.toThrow();
		} finally {
			await firstServer.close();
		}
	});

	it("closes the HTTP server when Pi session event setup fails after listen succeeds", async () => {
		const port = await getUnusedPort();
		const { backend } = createBackend();
		backend.onPiSessionEvent = vi.fn(() => {
			throw new Error("Pi session event setup failed.");
		});

		await expect(createLocalDevServer({ backend, host: "127.0.0.1", port })).rejects.toThrow(
			"Pi session event setup failed.",
		);

		const nextServer = await createLocalDevServer({ backend: createBackend().backend, host: "127.0.0.1", port });
		try {
			expect(Number(new URL(nextServer.url).port)).toBe(port);
		} finally {
			await nextServer.close();
		}
	});
});
