import type { z } from "zod";
import {
	type AppRpcOperation,
	type AppRpcRequest,
	AppRpcResponseSchemas,
	PiSessionEventEnvelopeSchema,
} from "../../shared/app-transport";
import type { PiSessionEvent } from "../../shared/ipc";
import type { PiDesktopApi } from "../../shared/preload-api";
import { err } from "../../shared/result";
import { writeBrowserClipboardText } from "./browser-clipboard";

type AppRpcResponse<TOperation extends AppRpcOperation> = z.infer<(typeof AppRpcResponseSchemas)[TOperation]>;
type AppRpcInputArgs<TOperation extends AppRpcOperation> =
	Extract<AppRpcRequest, { operation: TOperation }> extends { input: infer TInput } ? [input: TInput] : [];

type PiSessionEventListener = (event: PiSessionEvent) => void;

const RPC_TIMEOUT_MS = 30_000;
const EVENT_SOCKET_RECONNECT_INITIAL_MS = 250;
const EVENT_SOCKET_RECONNECT_MAX_MS = 2_000;

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const toRpcErrorMessage = (error: unknown) => {
	if (error instanceof DOMException && error.name === "AbortError") {
		return `request timed out after ${RPC_TIMEOUT_MS / 1000}s. Keep \`pnpm dev:web\` running; the first project load can be slow while Pi sessions are indexed.`;
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

const resolveBridgeBaseUrl = (baseUrl: string) => {
	const trimmed = baseUrl.trim().replace(/\/+$/, "");
	if (trimmed.length > 0) {
		return trimmed;
	}
	if (typeof window !== "undefined" && window.location.origin !== "null") {
		return window.location.origin;
	}
	return "http://127.0.0.1:5173";
};

export const createHttpPiDesktopApi = ({ baseUrl }: { baseUrl: string }): PiDesktopApi => {
	const normalizedBaseUrl = resolveBridgeBaseUrl(baseUrl);
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
			createStandalone: (input) => callRpc("chat.createStandalone", input),
			select: (input) => callRpc("chat.select", input),
			rename: (input) => callRpc("chat.rename", input),
			selectStandalone: (input) => callRpc("chat.selectStandalone", input),
			fork: (input) => callRpc("chat.fork", input),
			clone: (input) => callRpc("chat.clone", input),
			branch: (input) => callRpc("chat.branch", input),
		},
		piSession: {
			start: (input) => callRpc("piSession.start", input),
			submit: (input) => callRpc("piSession.submit", input),
			abort: (input) => callRpc("piSession.abort", input),
			history: (input) => callRpc("piSession.history", input),
			prepare: (input) => callRpc("piSession.prepare", input),
			attach: (input) => callRpc("piSession.attach", input),
			dispose: (input) => callRpc("piSession.dispose", input),
			getSettings: (input) => callRpc("piSession.getSettings", input),
			getDefaultSettings: (input) => callRpc("piSession.getDefaultSettings", input ?? {}),
			getCommands: (input) => callRpc("piSession.getCommands", input),
			setModel: (input) => callRpc("piSession.setModel", input),
			setThinkingLevel: (input) => callRpc("piSession.setThinkingLevel", input),
			setDefaultModel: (input) => callRpc("piSession.setDefaultModel", input),
			setDefaultThinkingLevel: (input) => callRpc("piSession.setDefaultThinkingLevel", input),
			updateQueuedMessage: (input) => callRpc("piSession.updateQueuedMessage", input),
			removeQueuedMessage: (input) => callRpc("piSession.removeQueuedMessage", input),
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
		workspaceFiles: {
			listDirectory: (input) => callRpc("workspaceFiles.listDirectory", input),
			readFile: (input) => callRpc("workspaceFiles.readFile", input),
			writeFile: (input) => callRpc("workspaceFiles.writeFile", input),
		},
		sourceControl: {
			getStatus: (input) => callRpc("sourceControl.getStatus", input),
			checkIgnored: (input) => callRpc("sourceControl.checkIgnored", input),
			stage: (input) => callRpc("sourceControl.stage", input),
			unstage: (input) => callRpc("sourceControl.unstage", input),
			discard: (input) => callRpc("sourceControl.discard", input),
			bulkStage: (input) => callRpc("sourceControl.bulkStage", input),
			bulkUnstage: (input) => callRpc("sourceControl.bulkUnstage", input),
			bulkDiscard: (input) => callRpc("sourceControl.bulkDiscard", input),
			initializeRepository: (input) => callRpc("sourceControl.initializeRepository", input),
			commit: (input) => callRpc("sourceControl.commit", input),
			getDiff: (input) => callRpc("sourceControl.getDiff", input),
			getUpstreamStatus: (input) => callRpc("sourceControl.getUpstreamStatus", input),
			fetch: (input) => callRpc("sourceControl.fetch", input),
			push: (input) => callRpc("sourceControl.push", input),
			forcePushWithLease: (input) => callRpc("sourceControl.forcePushWithLease", input),
			pull: (input) => callRpc("sourceControl.pull", input),
			sync: (input) => callRpc("sourceControl.sync", input),
			fastForward: (input) => callRpc("sourceControl.fastForward", input),
			publish: (input) => callRpc("sourceControl.publish", input),
			rebaseFromBase: (input) => callRpc("sourceControl.rebaseFromBase", input),
			getBranchCompare: (input) => callRpc("sourceControl.getBranchCompare", input),
			abortConflict: (input) => callRpc("sourceControl.abortConflict", input),
			createPullRequest: (input) => callRpc("sourceControl.createPullRequest", input),
			getPullRequestInfo: (input) => callRpc("sourceControl.getPullRequestInfo", input),
		},
		clipboard: {
			writeText: writeBrowserClipboardText,
		},
	};
};
