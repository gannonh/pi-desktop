import { createHttpPiDesktopApi } from "../../src/renderer/app-api/http-client";
import type { PiSessionEvent } from "../../src/shared/pi-session";

type MockWebSocketEvent = { data?: unknown };
type MockWebSocketListener = (event: MockWebSocketEvent) => void;

class MockWebSocket {
	static instances: MockWebSocket[] = [];

	readonly url: string;
	readonly close = vi.fn(() => {
		this.dispatch("close", {});
	});

	private readonly listeners = new Map<string, MockWebSocketListener[]>();

	constructor(url: string | URL) {
		this.url = String(url);
		MockWebSocket.instances.push(this);
	}

	addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
		const listeners = this.listeners.get(type) ?? [];
		listeners.push((event) => {
			if (typeof listener === "function") {
				listener(event as Event);
				return;
			}
			listener.handleEvent(event as Event);
		});
		this.listeners.set(type, listeners);
	}

	emitMessage(data: unknown) {
		this.dispatch("message", { data });
	}

	private dispatch(type: string, event: MockWebSocketEvent) {
		for (const listener of this.listeners.get(type) ?? []) {
			listener(event);
		}
	}
}

const installMockWebSocket = () => {
	MockWebSocket.instances = [];
	vi.stubGlobal("WebSocket", MockWebSocket);
};

const sessionEvent: PiSessionEvent = {
	type: "status",
	sessionId: "pi-session:one",
	status: "running",
	label: "Running",
	receivedAt: "2026-05-15T00:00:00.000Z",
};

const sessionEventEnvelope = JSON.stringify({ type: "pi-session:event", event: sessionEvent });

describe("HTTP PiDesktop API client", () => {
	afterEach(() => {
		vi.restoreAllMocks();
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

		const api = createHttpPiDesktopApi({ baseUrl: "http://127.0.0.1:49321/" });

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

	it("opens event sockets at the expected normalized WebSocket events URL", () => {
		installMockWebSocket();
		const api = createHttpPiDesktopApi({ baseUrl: "http://127.0.0.1:49321/" });

		const unsubscribe = api.piSession.onEvent(vi.fn());

		expect(MockWebSocket.instances).toHaveLength(1);
		expect(MockWebSocket.instances[0].url).toBe("ws://127.0.0.1:49321/api/events");
		unsubscribe();
	});

	it("delivers valid event envelopes to listeners", () => {
		installMockWebSocket();
		const api = createHttpPiDesktopApi({ baseUrl: "http://127.0.0.1:49321" });
		const firstListener = vi.fn();
		const secondListener = vi.fn();

		const unsubscribeFirst = api.piSession.onEvent(firstListener);
		const unsubscribeSecond = api.piSession.onEvent(secondListener);
		MockWebSocket.instances[0].emitMessage(sessionEventEnvelope);

		expect(firstListener).toHaveBeenCalledWith(sessionEvent);
		expect(secondListener).toHaveBeenCalledWith(sessionEvent);
		unsubscribeFirst();
		unsubscribeSecond();
	});

	it("does not deliver invalid event messages to listeners", () => {
		installMockWebSocket();
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		const api = createHttpPiDesktopApi({ baseUrl: "http://127.0.0.1:49321" });
		const listener = vi.fn();

		const unsubscribe = api.piSession.onEvent(listener);
		MockWebSocket.instances[0].emitMessage("{");
		MockWebSocket.instances[0].emitMessage(JSON.stringify({ type: "pi-session:event", event: { type: "unknown" } }));

		expect(listener).not.toHaveBeenCalled();
		unsubscribe();
	});

	it("closes the event socket when the last listener unsubscribes", () => {
		installMockWebSocket();
		const api = createHttpPiDesktopApi({ baseUrl: "http://127.0.0.1:49321" });

		const unsubscribeFirst = api.piSession.onEvent(vi.fn());
		const unsubscribeSecond = api.piSession.onEvent(vi.fn());
		const socket = MockWebSocket.instances[0];

		unsubscribeFirst();
		expect(socket.close).not.toHaveBeenCalled();
		unsubscribeSecond();
		expect(socket.close).toHaveBeenCalledTimes(1);
	});

	it("isolates listener exceptions so later listeners still receive events", () => {
		installMockWebSocket();
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const api = createHttpPiDesktopApi({ baseUrl: "http://127.0.0.1:49321" });
		const listenerError = new Error("listener failed");
		const throwingListener = vi.fn(() => {
			throw listenerError;
		});
		const laterListener = vi.fn();

		const unsubscribeThrowing = api.piSession.onEvent(throwingListener);
		const unsubscribeLater = api.piSession.onEvent(laterListener);
		MockWebSocket.instances[0].emitMessage(sessionEventEnvelope);

		expect(throwingListener).toHaveBeenCalledWith(sessionEvent);
		expect(laterListener).toHaveBeenCalledWith(sessionEvent);
		expect(consoleError).toHaveBeenCalledWith("Dev data bridge event listener failed.", listenerError);
		unsubscribeThrowing();
		unsubscribeLater();
	});
});
