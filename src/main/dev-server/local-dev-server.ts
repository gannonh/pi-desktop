import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocket, WebSocketServer } from "ws";
import { AppRpcRequestSchema, PiSessionEventEnvelopeSchema } from "../../shared/app-transport";
import { err, type IpcResult } from "../../shared/result";
import type { AppBackend } from "../app-backend";

const allowedOrigin = "http://127.0.0.1:5173";
const maxJsonBodyBytes = 1024 * 1024;

export type LocalDevServerOptions = {
	backend: AppBackend;
	host: string;
	port: number;
};

export type LocalDevServer = {
	url: string;
	wsUrl: string;
	close: () => Promise<void>;
};

const corsHeaders = {
	"access-control-allow-origin": allowedOrigin,
	"access-control-allow-methods": "POST, OPTIONS",
	"access-control-allow-headers": "content-type",
};

class BodyTooLargeError extends Error {}

const sendJson = (response: ServerResponse, statusCode: number, body: IpcResult<unknown>) => {
	response.writeHead(statusCode, {
		...corsHeaders,
		"content-type": "application/json",
	});
	response.end(JSON.stringify(body));
};

const isAllowedOrigin = (origin: string | undefined) =>
	origin === undefined || origin === "" || origin === allowedOrigin;

const rejectOrigin = (response: ServerResponse) => {
	sendJson(response, 403, err("dev_server.forbidden_origin", "Origin is not allowed."));
};

const readJsonBody = async (request: IncomingMessage): Promise<unknown> => {
	const chunks: Buffer[] = [];
	let byteLength = 0;
	for await (const chunk of request) {
		const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
		byteLength += buffer.byteLength;
		if (byteLength > maxJsonBodyBytes) {
			throw new BodyTooLargeError("Request body is too large.");
		}
		chunks.push(buffer);
	}
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const closeHttpServer = (server: ReturnType<typeof createServer>) =>
	new Promise<void>((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});

const closeWebSocketServer = (server: WebSocketServer) =>
	new Promise<void>((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});

const listen = (server: ReturnType<typeof createServer>, port: number, host: string) =>
	new Promise<void>((resolve, reject) => {
		const cleanup = () => {
			server.off("error", onError);
		};
		const onError = (error: Error) => {
			cleanup();
			reject(error);
		};
		server.once("error", onError);
		server.listen(port, host, () => {
			cleanup();
			resolve();
		});
	});

const handleHttpRequest = async (
	request: IncomingMessage,
	response: ServerResponse,
	backend: AppBackend,
	host: string,
) => {
	if (!isAllowedOrigin(request.headers.origin)) {
		rejectOrigin(response);
		return;
	}

	if (request.method === "OPTIONS") {
		response.writeHead(204, corsHeaders);
		response.end();
		return;
	}

	const url = new URL(request.url ?? "/", `http://${host}`);
	if (request.method !== "POST" || url.pathname !== "/api/rpc") {
		sendJson(response, 404, err("dev_server.not_found", "Route not found."));
		return;
	}

	let body: unknown;
	try {
		body = await readJsonBody(request);
	} catch (error) {
		if (error instanceof BodyTooLargeError) {
			sendJson(response, 413, err("dev_server.body_too_large", "Request body is too large."));
			return;
		}
		sendJson(response, 400, err("dev_server.invalid_json", "Request body must be JSON."));
		return;
	}

	const parsed = AppRpcRequestSchema.safeParse(body);
	if (!parsed.success) {
		sendJson(response, 400, err("dev_server.invalid_request", "Invalid app RPC request."));
		return;
	}

	sendJson(response, 200, await backend.handle(parsed.data));
};

export const createLocalDevServer = async (options: LocalDevServerOptions): Promise<LocalDevServer> => {
	const httpServer = createServer((request, response) => {
		handleHttpRequest(request, response, options.backend, options.host).catch((error) => {
			console.error("Local dev server request failed.", error);
			if (response.headersSent) {
				response.destroy(error instanceof Error ? error : undefined);
				return;
			}
			sendJson(response, 500, err("dev_server.request_failed", "Request failed."));
		});
	});

	const webSocketServer = new WebSocketServer({ noServer: true });
	httpServer.on("upgrade", (request, socket, head) => {
		const url = new URL(request.url ?? "/", `http://${options.host}`);
		if (url.pathname !== "/api/events") {
			socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
			socket.destroy();
			return;
		}

		if (!isAllowedOrigin(request.headers.origin)) {
			socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
			socket.destroy();
			return;
		}

		webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
			webSocketServer.emit("connection", webSocket, request);
		});
	});

	await listen(httpServer, options.port, options.host);

	const address = httpServer.address();
	if (address === null || typeof address === "string" || !Number.isInteger((address as AddressInfo).port)) {
		await closeWebSocketServer(webSocketServer);
		await closeHttpServer(httpServer);
		throw new Error("Dev server did not bind to a TCP address.");
	}

	const unsubscribe = options.backend.onPiSessionEvent((event) => {
		const message = JSON.stringify(PiSessionEventEnvelopeSchema.parse({ type: "pi-session:event", event }));
		for (const client of webSocketServer.clients) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(message);
			}
		}
	});

	const url = `http://${options.host}:${address.port}`;

	return {
		url,
		wsUrl: `ws://${options.host}:${address.port}/api/events`,
		async close() {
			unsubscribe();
			for (const client of webSocketServer.clients) {
				client.close();
			}
			await closeWebSocketServer(webSocketServer);
			await closeHttpServer(httpServer);
		},
	};
};
