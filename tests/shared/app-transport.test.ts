import {
	AppRpcRequestSchema,
	AppRpcResponseSchemas,
	PiSessionEventEnvelopeSchema,
	type AppRpcOperation,
} from "../../src/shared/app-transport";

describe("app transport contract", () => {
	it("validates a project selection RPC request so transports cannot pass loose input", () => {
		const parsed = AppRpcRequestSchema.parse({
			operation: "project.select",
			input: { projectId: "project:/tmp/pi-desktop" },
		});

		expect(parsed).toEqual({
			operation: "project.select",
			input: { projectId: "project:/tmp/pi-desktop" },
		});
	});

	it("accepts M04 chat management RPC operations", () => {
		expect(
			AppRpcRequestSchema.parse({
				operation: "chat.rename",
				input: { projectId: "project:/tmp/pi", chatId: "chat:1", title: "New name" },
			}),
		).toEqual({
			operation: "chat.rename",
			input: { projectId: "project:/tmp/pi", chatId: "chat:1", title: "New name" },
		});
		expect(
			AppRpcRequestSchema.parse({
				operation: "chat.selectStandalone",
				input: { chatId: "chat:standalone" },
			}),
		).toEqual({
			operation: "chat.selectStandalone",
			input: { chatId: "chat:standalone" },
		});
		expect(
			AppRpcRequestSchema.parse({
				operation: "chat.fork",
				input: { projectId: "project:/tmp/pi", chatId: "chat:1" },
			}),
		).toEqual({
			operation: "chat.fork",
			input: { projectId: "project:/tmp/pi", chatId: "chat:1" },
		});
		expect(
			AppRpcRequestSchema.parse({
				operation: "chat.clone",
				input: { projectId: "project:/tmp/pi", chatId: "chat:1" },
			}),
		).toEqual({
			operation: "chat.clone",
			input: { projectId: "project:/tmp/pi", chatId: "chat:1" },
		});
		expect(
			AppRpcRequestSchema.parse({
				operation: "chat.branch",
				input: { projectId: "project:/tmp/pi", chatId: "chat:1", entryId: "abcd1234" },
			}),
		).toEqual({
			operation: "chat.branch",
			input: { projectId: "project:/tmp/pi", chatId: "chat:1", entryId: "abcd1234" },
		});
	});

	it("rejects a prompt submission without a non-empty prompt", () => {
		const parsed = AppRpcRequestSchema.safeParse({
			operation: "piSession.submit",
			input: { sessionId: "session:one", prompt: "" },
		});

		expect(parsed.success).toBe(false);
	});

	it("parses the response schema for each declared operation", () => {
		const declaredOperations = AppRpcRequestSchema.options.map(
			(option) => option.shape.operation.value as AppRpcOperation,
		);
		const responseOperations = Object.keys(AppRpcResponseSchemas) as AppRpcOperation[];

		expect(responseOperations.toSorted()).toEqual(declaredOperations.toSorted());
		expect(responseOperations).toContain("app.getVersion");
		expect(responseOperations).toContain("project.getState");
		expect(responseOperations).toContain("piSession.start");

		for (const operation of declaredOperations) {
			AppRpcResponseSchemas[operation].parse({
				ok: false,
				error: { code: "transport.test", message: "Representative failure" },
			});
		}
	});

	it("wraps Pi session events for websocket delivery", () => {
		const parsed = PiSessionEventEnvelopeSchema.parse({
			type: "pi-session:event",
			event: {
				type: "status",
				sessionId: "session:one",
				status: "running",
				label: "Running",
				receivedAt: "2026-05-15T12:00:00.000Z",
			},
		});

		expect(parsed.event.sessionId).toBe("session:one");
	});
});
