import {
	AppRpcResponseSchemas,
	PiSessionEventEnvelopeSchema,
	type AppRpcOperation,
	type AppRpcRequest,
} from "../../shared/app-transport";
import type { PiSessionEvent } from "../../shared/ipc";
import type { PiDesktopApi } from "../../shared/preload-api";
import { err } from "../../shared/result";
import type { z } from "zod";

type AppRpcResponse<TOperation extends AppRpcOperation> = z.infer<(typeof AppRpcResponseSchemas)[TOperation]>;
type AppRpcInputArgs<TOperation extends AppRpcOperation> =
	Extract<AppRpcRequest, { operation: TOperation }> extends { input: infer TInput } ? [input: TInput] : [];

type PiSessionEventListener = (event: PiSessionEvent) => void;

const RPC_TIMEOUT_MS = 10_000;
const EVENT_SOCKET_RECONNECT_INITIAL_MS = 250;
const EVENT_SOCKET_RECONNECT_MAX_MS = 2_000;

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const toRpcErrorMessage = (error: unknown) => {
	if (error instanceof DOMException && error.name === "AbortError") {
		return "request timed out";
	}
	return toErrorMessage(error);
};

const bridgeUnavailable = (message: string) => err("dev_bridge.unavailable", `Dev data bridge unavailable: ${message}`);

const parseEventMessage = (data: MessageEvent["data"]) => {
	if (typeof data !== "string") {
		throw new Error("Event message must be a JSON string.");
	}
	return PiSessionEventEnvelopeSchema.parse(JSON.parse(data));
};

export const createHttpPiDesktopApi = ({ baseUrl }: { baseUrl: string }): PiDesktopApi => {
	const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
	const rpcUrl = `${normalizedBaseUrl}/api/rpc`;
	const eventsUrl = `${normalizedBaseUrl.replace(/^http/, "ws")}/api/events`;
	const eventListeners = new Set<PiSessionEventListener>();
	let eventsSocket: WebSocket | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let reconnectAttempt = 0;

	const callRpc = async <TOperation extends AppRpcOperation>(
		operation: TOperation,
		...inputArgs: AppRpcInputArgs<TOperation>
	): Promise<AppRpcResponse<TOperation>> => {
		const requestBody = inputArgs.length === 0 ? { operation } : { operation, input: inputArgs[0] };
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
		try {
			const response = await fetch(rpcUrl, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(requestBody),
				signal: controller.signal,
			});
			return AppRpcResponseSchemas[operation].parse(await response.json()) as AppRpcResponse<TOperation>;
		} catch (error) {
			return bridgeUnavailable(toRpcErrorMessage(error)) as AppRpcResponse<TOperation>;
		} finally {
			clearTimeout(timeoutId);
		}
	};

	const clearReconnectTimer = () => {
		if (reconnectTimer === null) {
			return;
		}
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	};

	const closeEventsSocket = () => {
		clearReconnectTimer();
		if (!eventsSocket) {
			return;
		}
		eventsSocket.close();
		eventsSocket = null;
	};

	const scheduleEventsSocketReconnect = () => {
		if (reconnectTimer !== null || eventListeners.size === 0) {
			return;
		}

		const delayMs = Math.min(
			EVENT_SOCKET_RECONNECT_INITIAL_MS * 2 ** reconnectAttempt,
			EVENT_SOCKET_RECONNECT_MAX_MS,
		);
		reconnectAttempt += 1;
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			openEventsSocket();
		}, delayMs);
	};

	const openEventsSocket = () => {
		if (eventsSocket || eventListeners.size === 0) {
			return;
		}

		clearReconnectTimer();
		const socket = new WebSocket(eventsUrl);
		eventsSocket = socket;
		socket.addEventListener("message", (message) => {
			let envelope: ReturnType<typeof parseEventMessage>;
			try {
				envelope = parseEventMessage(message.data);
			} catch (error) {
				console.error("Dev data bridge event parse failed.", error);
				return;
			}

			reconnectAttempt = 0;

			for (const listener of [...eventListeners]) {
				try {
					listener(envelope.event);
				} catch (error) {
					console.error("Dev data bridge event listener failed.", error);
				}
			}
		});
		socket.addEventListener("close", () => {
			if (eventsSocket === socket) {
				eventsSocket = null;
			}
			if (eventListeners.size > 0) {
				console.warn("Dev data bridge event socket closed; reconnecting.");
				scheduleEventsSocketReconnect();
			}
		});
		socket.addEventListener("error", (error) => {
			if (eventsSocket !== socket || eventListeners.size === 0) {
				return;
			}
			console.error("Dev data bridge event socket failed.", error);
		});
	};

	return {
		app: {
			getVersion: () => callRpc("app.getVersion"),
		},
		project: {
			getState: () => callRpc("project.getState"),
			createFromScratch: () => callRpc("project.createFromScratch"),
			addExistingFolder: () => callRpc("project.addExistingFolder"),
			select: (input) => callRpc("project.select", input),
			rename: (input) => callRpc("project.rename", input),
			remove: (input) => callRpc("project.remove", input),
			openInFinder: (input) => callRpc("project.openInFinder", input),
			locateFolder: (input) => callRpc("project.locateFolder", input),
			setPinned: (input) => callRpc("project.setPinned", input),
			checkAvailability: (input) => callRpc("project.checkAvailability", input),
		},
		chat: {
			create: (input) => callRpc("chat.create", input),
			select: (input) => callRpc("chat.select", input),
		},
		piSession: {
			start: (input) => callRpc("piSession.start", input),
			submit: (input) => callRpc("piSession.submit", input),
			abort: (input) => callRpc("piSession.abort", input),
			dispose: (input) => callRpc("piSession.dispose", input),
			onEvent: (listener) => {
				eventListeners.add(listener);
				openEventsSocket();
				return () => {
					eventListeners.delete(listener);
					if (eventListeners.size === 0) {
						closeEventsSocket();
					}
				};
			},
		},
	};
};
