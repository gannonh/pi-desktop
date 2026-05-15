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
