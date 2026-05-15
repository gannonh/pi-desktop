import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocket, WebSocketServer } from "ws";
import { AppRpcRequestSchema, PiSessionEventEnvelopeSchema } from "../../shared/app-transport";
import { err, type IpcResult } from "../../shared/result";
import type { AppBackend } from "../app-backend";

const allowedOrigin = "http://127.0.0.1:5173";

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

const sendJson = (response: ServerResponse, statusCode: number, body: IpcResult<unknown>) => {
	response.writeHead(statusCode, {
		...corsHeaders,
		"content-type": "application/json",
	});
	response.end(JSON.stringify(body));
};

const readJsonBody = async (request: IncomingMessage): Promise<unknown> => {
	const chunks: Buffer[] = [];
	for await (const chunk of request) {
		chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
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

export const createLocalDevServer = async (options: LocalDevServerOptions): Promise<LocalDevServer> => {
	const httpServer = createServer(async (request, response) => {
		if (request.method === "OPTIONS") {
			response.writeHead(204, corsHeaders);
			response.end();
			return;
		}

		const url = new URL(request.url ?? "/", `http://${options.host}`);
		if (request.method !== "POST" || url.pathname !== "/api/rpc") {
			sendJson(response, 404, err("dev_server.not_found", "Route not found."));
			return;
		}

		let body: unknown;
		try {
			body = await readJsonBody(request);
		} catch {
			sendJson(response, 400, err("dev_server.invalid_json", "Request body must be JSON."));
			return;
		}

		const parsed = AppRpcRequestSchema.safeParse(body);
		if (!parsed.success) {
			sendJson(response, 400, err("dev_server.invalid_request", "Invalid app RPC request."));
			return;
		}

		sendJson(response, 200, await options.backend.handle(parsed.data));
	});

	const webSocketServer = new WebSocketServer({ server: httpServer, path: "/api/events" });
	const unsubscribe = options.backend.onPiSessionEvent((event) => {
		const message = JSON.stringify(PiSessionEventEnvelopeSchema.parse({ type: "pi-session:event", event }));
		for (const client of webSocketServer.clients) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(message);
			}
		}
	});

	await new Promise<void>((resolve) => {
		httpServer.listen(options.port, options.host, resolve);
	});

	const address = httpServer.address() as AddressInfo;
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
