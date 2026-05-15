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

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const bridgeUnavailable = (message: string) => err("dev_bridge.unavailable", `Dev data bridge unavailable: ${message}`);

const parseEventMessage = (data: MessageEvent["data"]) => {
	if (typeof data !== "string") {
		throw new Error("Event message must be a JSON string.");
	}
	return PiSessionEventEnvelopeSchema.parse(JSON.parse(data));
};

export const createHttpPiDesktopApi = ({ baseUrl }: { baseUrl: string }): PiDesktopApi => {
	const rpcUrl = `${baseUrl}/api/rpc`;
	const eventsUrl = `${baseUrl.replace(/^http/, "ws")}/api/events`;
	const eventListeners = new Set<PiSessionEventListener>();
	let eventsSocket: WebSocket | null = null;

	const callRpc = async <TOperation extends AppRpcOperation>(
		operation: TOperation,
		...inputArgs: AppRpcInputArgs<TOperation>
	): Promise<AppRpcResponse<TOperation>> => {
		const requestBody = inputArgs.length === 0 ? { operation } : { operation, input: inputArgs[0] };
		try {
			const response = await fetch(rpcUrl, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(requestBody),
			});
			return AppRpcResponseSchemas[operation].parse(await response.json()) as AppRpcResponse<TOperation>;
		} catch (error) {
			return bridgeUnavailable(toErrorMessage(error)) as AppRpcResponse<TOperation>;
		}
	};

	const closeEventsSocket = () => {
		if (!eventsSocket) {
			return;
		}
		eventsSocket.close();
		eventsSocket = null;
	};

	const openEventsSocket = () => {
		if (eventsSocket || eventListeners.size === 0) {
			return;
		}

		const socket = new WebSocket(eventsUrl);
		eventsSocket = socket;
		socket.addEventListener("message", (message) => {
			try {
				const envelope = parseEventMessage(message.data);
				for (const listener of [...eventListeners]) {
					listener(envelope.event);
				}
			} catch (error) {
				console.error("Dev data bridge event parse failed.", error);
			}
		});
		socket.addEventListener("close", () => {
			if (eventsSocket === socket) {
				eventsSocket = null;
			}
		});
		socket.addEventListener("error", (error) => {
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
