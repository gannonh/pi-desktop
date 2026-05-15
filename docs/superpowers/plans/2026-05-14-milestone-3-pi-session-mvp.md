# Milestone 3 Pi Session MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run a selected project chat through a real Pi SDK-backed session with streamed assistant output, visible runtime status, abort, retry indicators, and clear startup/auth/model errors.

**Architecture:** Keep Pi runtime ownership in Electron main under `src/main/pi-session/`, expose a narrow typed preload API, and keep renderer state as plain serializable session events. Main resolves the selected project workspace from the project service, creates the Pi SDK session with `cwd`, subscribes to Pi events, normalizes them into renderer-safe events, and pushes updates over one IPC event channel.

**Tech Stack:** Electron, Vite, React 19, TypeScript, Zod, Vitest, Playwright, `@earendil-works/pi-coding-agent` SDK.

---

## Assumptions

- Use `@earendil-works/pi-coding-agent@0.74.0`, matching `/Volumes/EVO/repos/pi-mono/packages/coding-agent/package.json` on May 14, 2026.
- Milestone 3 starts a new Pi session for the selected project and keeps it active in memory for the running app. Sidebar-backed session lists, resume, rename, and durable desktop session metadata land in Milestone 4.
- Pi owns provider auth, model selection, automatic retries, tool behavior, and session persistence. `pi-desktop` displays those failures and events.
- Retry support for this milestone means surfacing Pi `auto_retry_start` and `auto_retry_end` events and letting abort cancel an in-progress retry through `session.abort()`.

## Success Criteria

- A selected available project enables the composer.
- Submitting text starts a Pi SDK session with the selected project path as `cwd`.
- User and assistant messages appear in the chat surface, and assistant text streams incrementally.
- Runtime status changes show `Starting`, `Running`, `Retrying`, `Aborting`, `Idle`, and `Failed` states.
- Abort cancels an active run and returns the UI to a usable state.
- Pi startup, auth, model, and prompt errors appear in the main chat surface without exposing secrets.
- `pnpm check` passes.

## File Structure

- Modify `package.json` and `pnpm-lock.yaml`: add the Pi SDK dependency.
- Create `src/shared/pi-session.ts`: typed and Zod-validated session inputs, results, events, snapshots, and renderer status names.
- Modify `src/shared/ipc.ts`: add Pi session channels and result schemas.
- Modify `src/shared/preload-api.ts`: expose start, submit, abort, dispose, and event subscription methods.
- Modify `src/preload/index.ts`: implement validated invoke calls and event subscription cleanup.
- Modify `src/main/projects/project-service.ts`: add a project workspace resolver that refreshes availability before session start.
- Create `src/main/pi-session/pi-session-runtime.ts`: Pi SDK session lifecycle, prompt execution, event normalization, abort, dispose, and runtime error events.
- Create `src/main/pi-session/pi-session-event-normalizer.ts`: pure helpers for converting Pi events and messages into renderer-safe events.
- Modify `src/main/index.ts`: instantiate the runtime and register session IPC handlers.
- Create `tests/shared/pi-session.test.ts`: contract tests for strict schemas and channel names.
- Modify `tests/shared/ipc.test.ts`: include session channels in the stable channel assertion.
- Modify `tests/main/project-service.test.ts`: cover project workspace resolution for available, missing, unavailable, and unknown projects.
- Create `tests/main/pi-session-event-normalizer.test.ts`: cover assistant deltas, final assistant messages, user messages, errors, and retry events.
- Create `tests/main/pi-session-runtime.test.ts`: cover start, prompt submission, abort, and startup failure with a fake SDK session.
- Create `src/renderer/session/session-state.ts`: pure reducer for normalized session events.
- Create `tests/renderer/session-state.test.ts`: reducer tests for streaming, abort, retry, and errors.
- Modify `src/renderer/chat/chat-view-model.ts`: make selected available project composers runtime-ready.
- Modify `src/renderer/components/composer.tsx`: accept submit, abort, running state, and status props.
- Modify `src/renderer/components/chat-shell.tsx`: render live session transcript when available.
- Create `src/renderer/components/live-session-transcript.tsx`: render user messages, assistant messages, streaming indicator, retry/error status, and abort state.
- Modify `src/renderer/App.tsx`: subscribe to session events, own session reducer state, and pass submit/abort callbacks.
- Modify `src/renderer/dev-preview-api.ts`: provide a deterministic fake session stream for web preview and smoke tests.
- Modify `tests/renderer/chat-view-model.test.ts`, `tests/renderer/composer-state.test.ts`, and `tests/smoke/app.spec.ts`: update runtime-ready expectations and add session MVP coverage.
- Modify `src/renderer/styles.css`: add live transcript, status, and abort button styles.

## Task 1: Add Pi SDK Dependency And Shared Session Contracts

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/shared/pi-session.ts`
- Create: `tests/shared/pi-session.test.ts`
- Modify: `tests/shared/ipc.test.ts`

- [ ] **Step 1: Add the Pi SDK dependency**

Run:

```bash
pnpm add @earendil-works/pi-coding-agent@0.74.0
```

Expected: `package.json` includes `"@earendil-works/pi-coding-agent": "0.74.0"` under `dependencies`, and `pnpm-lock.yaml` updates.

- [ ] **Step 2: Write the failing shared contract tests**

Create `tests/shared/pi-session.test.ts` with this content:

```ts
import { describe, expect, it } from "vitest";
import {
	PiSessionAbortInputSchema,
	PiSessionEventSchema,
	PiSessionStartInputSchema,
	PiSessionStartResultSchema,
	PiSessionSubmitInputSchema,
} from "../../src/shared/pi-session";

describe("Pi session contracts", () => {
	it("validates start, submit, and abort inputs strictly", () => {
		expect(
			PiSessionStartInputSchema.parse({
				projectId: "project:/tmp/pi-desktop",
				prompt: "What files are here?",
			}),
		).toEqual({
			projectId: "project:/tmp/pi-desktop",
			prompt: "What files are here?",
		});

		expect(
			PiSessionSubmitInputSchema.parse({
				sessionId: "pi-session:one",
				prompt: "Continue",
			}),
		).toEqual({
			sessionId: "pi-session:one",
			prompt: "Continue",
		});

		expect(PiSessionAbortInputSchema.parse({ sessionId: "pi-session:one" })).toEqual({
			sessionId: "pi-session:one",
		});

		expect(() =>
			PiSessionStartInputSchema.parse({
				projectId: "project:/tmp/pi-desktop",
				prompt: "What files are here?",
				workspacePath: "/tmp/pi-desktop",
			}),
		).toThrow();
	});

	it("validates session start results", () => {
		const result = PiSessionStartResultSchema.parse({
			ok: true,
			data: {
				sessionId: "pi-session:one",
				projectId: "project:/tmp/pi-desktop",
				workspacePath: "/tmp/pi-desktop",
				status: "running",
			},
		});

		expect(result.ok).toBe(true);
	});

	it("validates renderer-safe streaming events", () => {
		expect(
			PiSessionEventSchema.parse({
				type: "assistant_delta",
				sessionId: "pi-session:one",
				messageId: "assistant:1",
				delta: "Hello",
				receivedAt: "2026-05-14T12:00:00.000Z",
			}),
		).toEqual({
			type: "assistant_delta",
			sessionId: "pi-session:one",
			messageId: "assistant:1",
			delta: "Hello",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});

		expect(() =>
			PiSessionEventSchema.parse({
				type: "runtime_error",
				sessionId: "pi-session:one",
				message: "",
				receivedAt: "2026-05-14T12:00:00.000Z",
			}),
		).toThrow();
	});
});
```

- [ ] **Step 3: Run the shared contract tests to verify they fail**

Run:

```bash
pnpm test -- tests/shared/pi-session.test.ts
```

Expected: FAIL because `src/shared/pi-session.ts` does not exist.

- [ ] **Step 4: Add shared session contracts**

Create `src/shared/pi-session.ts` with this content:

```ts
import { z } from "zod";
import { createResultSchema, type IpcResult } from "./result";

export const PiSessionStatusSchema = z.enum(["idle", "starting", "running", "retrying", "aborting", "failed"]);

export const PiSessionStartInputSchema = z.strictObject({
	projectId: z.string().min(1),
	prompt: z.string().trim().min(1),
});

export const PiSessionSubmitInputSchema = z.strictObject({
	sessionId: z.string().min(1),
	prompt: z.string().trim().min(1),
});

export const PiSessionAbortInputSchema = z.strictObject({
	sessionId: z.string().min(1),
});

export const PiSessionDisposeInputSchema = z.strictObject({
	sessionId: z.string().min(1),
});

export const PiSessionStartPayloadSchema = z.strictObject({
	sessionId: z.string().min(1),
	projectId: z.string().min(1),
	workspacePath: z.string().min(1),
	status: PiSessionStatusSchema,
});

export const PiSessionActionPayloadSchema = z.strictObject({
	sessionId: z.string().min(1),
	status: PiSessionStatusSchema,
});

export const PiSessionMessageRoleSchema = z.enum(["user", "assistant", "tool", "system"]);

export const PiSessionEventSchema = z.discriminatedUnion("type", [
	z.strictObject({
		type: z.literal("status"),
		sessionId: z.string().min(1),
		status: PiSessionStatusSchema,
		label: z.string().min(1),
		receivedAt: z.string().datetime(),
	}),
	z.strictObject({
		type: z.literal("message_start"),
		sessionId: z.string().min(1),
		messageId: z.string().min(1),
		role: PiSessionMessageRoleSchema,
		content: z.string(),
		receivedAt: z.string().datetime(),
	}),
	z.strictObject({
		type: z.literal("assistant_delta"),
		sessionId: z.string().min(1),
		messageId: z.string().min(1),
		delta: z.string(),
		receivedAt: z.string().datetime(),
	}),
	z.strictObject({
		type: z.literal("message_end"),
		sessionId: z.string().min(1),
		messageId: z.string().min(1),
		role: PiSessionMessageRoleSchema,
		content: z.string(),
		receivedAt: z.string().datetime(),
	}),
	z.strictObject({
		type: z.literal("runtime_error"),
		sessionId: z.string().min(1).optional(),
		code: z.string().min(1),
		message: z.string().min(1),
		receivedAt: z.string().datetime(),
	}),
	z.strictObject({
		type: z.literal("retry"),
		sessionId: z.string().min(1),
		attempt: z.number().int().positive(),
		maxAttempts: z.number().int().positive().optional(),
		delayMs: z.number().int().nonnegative().optional(),
		message: z.string().min(1),
		receivedAt: z.string().datetime(),
	}),
]);

export const PiSessionStartResultSchema = createResultSchema(PiSessionStartPayloadSchema);
export const PiSessionActionResultSchema = createResultSchema(PiSessionActionPayloadSchema);

export type PiSessionStatus = z.infer<typeof PiSessionStatusSchema>;
export type PiSessionStartInput = z.infer<typeof PiSessionStartInputSchema>;
export type PiSessionSubmitInput = z.infer<typeof PiSessionSubmitInputSchema>;
export type PiSessionAbortInput = z.infer<typeof PiSessionAbortInputSchema>;
export type PiSessionDisposeInput = z.infer<typeof PiSessionDisposeInputSchema>;
export type PiSessionStartPayload = z.infer<typeof PiSessionStartPayloadSchema>;
export type PiSessionActionPayload = z.infer<typeof PiSessionActionPayloadSchema>;
export type PiSessionEvent = z.infer<typeof PiSessionEventSchema>;
export type PiSessionStartResult = IpcResult<PiSessionStartPayload>;
export type PiSessionActionResult = IpcResult<PiSessionActionPayload>;
```

- [ ] **Step 5: Run the shared contract tests to verify they pass**

Run:

```bash
pnpm test -- tests/shared/pi-session.test.ts
```

Expected: PASS.

- [ ] **Step 6: Update IPC channel test expectation**

Modify the stable channel assertion in `tests/shared/ipc.test.ts` after the chat channels:

```ts
expect(IpcChannels).toEqual({
	appGetVersion: "app:getVersion",
	projectGetState: "project:getState",
	projectCreateFromScratch: "project:createFromScratch",
	projectAddExistingFolder: "project:addExistingFolder",
	projectSelect: "project:select",
	projectRename: "project:rename",
	projectRemove: "project:remove",
	projectOpenInFinder: "project:openInFinder",
	projectLocateFolder: "project:locateFolder",
	projectSetPinned: "project:setPinned",
	projectCheckAvailability: "project:checkAvailability",
	chatCreate: "chat:create",
	chatSelect: "chat:select",
	piSessionStart: "pi-session:start",
	piSessionSubmit: "pi-session:submit",
	piSessionAbort: "pi-session:abort",
	piSessionDispose: "pi-session:dispose",
	piSessionEvent: "pi-session:event",
});
```

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/shared/pi-session.ts tests/shared/pi-session.test.ts tests/shared/ipc.test.ts
git commit -m "feat: add pi session contracts"
```

## Task 2: Resolve Available Project Workspaces For Sessions

**Files:**
- Modify: `src/main/projects/project-service.ts`
- Modify: `tests/main/project-service.test.ts`

- [ ] **Step 1: Write failing project workspace tests**

Append these tests inside `describe("project service", () => { ... })` in `tests/main/project-service.test.ts`:

```ts
it("resolves an available project workspace before starting a session", async () => {
	const projectPath = await mkdtemp(join(tmpdir(), "pi-session-workspace-"));
	const project = createProject(projectPath);
	const { service } = await createService({
		initialStore: {
			...createEmptyProjectStore(),
			projects: [project],
			selectedProjectId: project.id,
		},
		now: () => secondNow,
	});

	await expect(service.getSessionWorkspace({ projectId: project.id })).resolves.toEqual({
		projectId: project.id,
		displayName: basename(projectPath),
		path: projectPath,
	});
});

it("rejects a missing project workspace before starting a session", async () => {
	const projectPath = await mkdtemp(join(tmpdir(), "pi-session-missing-"));
	const project = createProject(projectPath);
	const { service } = await createService({
		initialStore: {
			...createEmptyProjectStore(),
			projects: [project],
			selectedProjectId: project.id,
		},
		now: () => secondNow,
	});
	await rm(projectPath, { recursive: true });

	await expect(service.getSessionWorkspace({ projectId: project.id })).rejects.toThrow(
		"Project folder is missing. Locate the folder before starting a Pi session.",
	);
});

it("rejects an unavailable project workspace before starting a session", async () => {
	const project = createProject("/tmp/pi-denied", {
		availability: { status: "unavailable", checkedAt: firstNow, reason: "Permission denied" },
	});
	const { service } = await createService({
		initialStore: {
			...createEmptyProjectStore(),
			projects: [project],
			selectedProjectId: project.id,
		},
	});

	await expect(service.getSessionWorkspace({ projectId: project.id })).rejects.toThrow("Permission denied");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test -- tests/main/project-service.test.ts
```

Expected: FAIL with `Property 'getSessionWorkspace' does not exist`.

- [ ] **Step 3: Add the service method and type**

Modify `src/main/projects/project-service.ts`.

Add this type near `ProjectServiceDeps`:

```ts
export type SessionWorkspace = {
	projectId: string;
	displayName: string;
	path: string;
};
```

Add this method to `ProjectService`:

```ts
getSessionWorkspace: (input: ProjectIdInput) => Promise<SessionWorkspace>;
```

Add this implementation near `checkAvailability`:

```ts
async getSessionWorkspace(input) {
	return runSerialized(async () => {
		const store = await deps.store.load();
		const projectIndex = findProjectIndex(store, input.projectId);
		await refreshProjectAvailabilityAtIndex(store, projectIndex, deps.now());
		const project = store.projects[projectIndex];

		if (project.availability.status === "missing") {
			await deps.store.save(store);
			throw new Error("Project folder is missing. Locate the folder before starting a Pi session.");
		}

		if (project.availability.status === "unavailable") {
			await deps.store.save(store);
			throw new Error(project.availability.reason);
		}

		return {
			projectId: project.id,
			displayName: project.displayName,
			path: project.path,
		};
	});
},
```

- [ ] **Step 4: Run project service tests**

Run:

```bash
pnpm test -- tests/main/project-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/projects/project-service.ts tests/main/project-service.test.ts
git commit -m "feat: resolve pi session workspaces"
```

## Task 3: Normalize Pi Events For Renderer State

**Files:**
- Create: `src/main/pi-session/pi-session-event-normalizer.ts`
- Create: `tests/main/pi-session-event-normalizer.test.ts`

- [ ] **Step 1: Write failing normalizer tests**

Create `tests/main/pi-session-event-normalizer.test.ts` with this content:

```ts
import { describe, expect, it } from "vitest";
import {
	createRuntimeErrorEvent,
	normalizePiSessionEvent,
} from "../../src/main/pi-session/pi-session-event-normalizer";

const receivedAt = "2026-05-14T12:00:00.000Z";
const now = () => receivedAt;

describe("pi session event normalizer", () => {
	it("normalizes user message start events", () => {
		expect(
			normalizePiSessionEvent({
				sessionId: "pi-session:one",
				event: {
					type: "message_start",
					message: {
						role: "user",
						content: [{ type: "text", text: "Hello Pi" }],
						timestamp: 1,
					},
				},
				now,
			}),
		).toEqual([
			{
				type: "message_start",
				sessionId: "pi-session:one",
				messageId: "user:1",
				role: "user",
				content: "Hello Pi",
				receivedAt,
			},
		]);
	});

	it("normalizes assistant text deltas", () => {
		expect(
			normalizePiSessionEvent({
				sessionId: "pi-session:one",
				event: {
					type: "message_update",
					message: {
						role: "assistant",
						content: [{ type: "text", text: "Hel" }],
						timestamp: 2,
					},
					assistantMessageEvent: {
						type: "text_delta",
						delta: "lo",
					},
				},
				now,
			}),
		).toEqual([
			{
				type: "assistant_delta",
				sessionId: "pi-session:one",
				messageId: "assistant:2",
				delta: "lo",
				receivedAt,
			},
		]);
	});

	it("normalizes retry events into visible status and retry updates", () => {
		expect(
			normalizePiSessionEvent({
				sessionId: "pi-session:one",
				event: {
					type: "auto_retry_start",
					attempt: 1,
					maxAttempts: 3,
					delayMs: 500,
					errorMessage: "rate limit",
				},
				now,
			}),
		).toEqual([
			{
				type: "status",
				sessionId: "pi-session:one",
				status: "retrying",
				label: "Retrying",
				receivedAt,
			},
			{
				type: "retry",
				sessionId: "pi-session:one",
				attempt: 1,
				maxAttempts: 3,
				delayMs: 500,
				message: "rate limit",
				receivedAt,
			},
		]);
	});

	it("creates runtime error events without stack traces", () => {
		expect(createRuntimeErrorEvent({ sessionId: "pi-session:one", code: "pi.auth_failed", error: new Error("No API key"), now })).toEqual({
			type: "runtime_error",
			sessionId: "pi-session:one",
			code: "pi.auth_failed",
			message: "No API key",
			receivedAt,
		});
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test -- tests/main/pi-session-event-normalizer.test.ts
```

Expected: FAIL because the normalizer file does not exist.

- [ ] **Step 3: Add the normalizer**

Create `src/main/pi-session/pi-session-event-normalizer.ts` with this content:

```ts
import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import type { PiSessionEvent } from "../../shared/pi-session";

type NormalizeInput = {
	sessionId: string;
	event: AgentSessionEvent;
	now: () => string;
};

type RuntimeErrorInput = {
	sessionId?: string;
	code: string;
	error: unknown;
	now: () => string;
};

const textFromContent = (content: unknown): string => {
	if (typeof content === "string") {
		return content;
	}

	if (!Array.isArray(content)) {
		return "";
	}

	return content
		.map((part) => {
			if (part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part) {
				return typeof part.text === "string" ? part.text : "";
			}
			return "";
		})
		.join("");
};

const messageIdFor = (message: { role?: string; timestamp?: unknown }, fallbackIndex = 0): string => {
	const timestamp = typeof message.timestamp === "number" || typeof message.timestamp === "string" ? message.timestamp : fallbackIndex;
	return `${message.role ?? "message"}:${timestamp}`;
};

const roleFor = (role: unknown): PiSessionEvent extends infer Event ? Extract<Event, { type: "message_start" }>["role"] : never => {
	if (role === "assistant" || role === "tool" || role === "system") {
		return role;
	}
	return "user";
};

export const createRuntimeErrorEvent = ({ sessionId, code, error, now }: RuntimeErrorInput): PiSessionEvent => ({
	type: "runtime_error",
	sessionId,
	code,
	message: error instanceof Error ? error.message : String(error),
	receivedAt: now(),
});

export const normalizePiSessionEvent = ({ sessionId, event, now }: NormalizeInput): PiSessionEvent[] => {
	const receivedAt = now();

	if (event.type === "agent_start") {
		return [{ type: "status", sessionId, status: "running", label: "Running", receivedAt }];
	}

	if (event.type === "agent_end") {
		return [{ type: "status", sessionId, status: "idle", label: "Idle", receivedAt }];
	}

	if (event.type === "message_start") {
		return [
			{
				type: "message_start",
				sessionId,
				messageId: messageIdFor(event.message),
				role: roleFor(event.message.role),
				content: textFromContent(event.message.content),
				receivedAt,
			},
		];
	}

	if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
		return [
			{
				type: "assistant_delta",
				sessionId,
				messageId: messageIdFor(event.message),
				delta: event.assistantMessageEvent.delta,
				receivedAt,
			},
		];
	}

	if (event.type === "message_end") {
		return [
			{
				type: "message_end",
				sessionId,
				messageId: messageIdFor(event.message),
				role: roleFor(event.message.role),
				content: textFromContent(event.message.content),
				receivedAt,
			},
		];
	}

	if (event.type === "auto_retry_start") {
		return [
			{ type: "status", sessionId, status: "retrying", label: "Retrying", receivedAt },
			{
				type: "retry",
				sessionId,
				attempt: event.attempt,
				maxAttempts: event.maxAttempts,
				delayMs: event.delayMs,
				message: event.errorMessage,
				receivedAt,
			},
		];
	}

	if (event.type === "auto_retry_end") {
		return [
			{
				type: "status",
				sessionId,
				status: event.success ? "running" : "failed",
				label: event.success ? "Running" : "Failed",
				receivedAt,
			},
		];
	}

	return [];
};
```

- [ ] **Step 4: Run normalizer tests**

Run:

```bash
pnpm test -- tests/main/pi-session-event-normalizer.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/pi-session/pi-session-event-normalizer.ts tests/main/pi-session-event-normalizer.test.ts
git commit -m "feat: normalize pi session events"
```

## Task 4: Add Main-Process Pi Session Runtime

**Files:**
- Create: `src/main/pi-session/pi-session-runtime.ts`
- Create: `tests/main/pi-session-runtime.test.ts`

- [ ] **Step 1: Write failing runtime tests**

Create `tests/main/pi-session-runtime.test.ts` with this content:

```ts
import { describe, expect, it, vi } from "vitest";
import { createPiSessionRuntime, type PiSdkSession } from "../../src/main/pi-session/pi-session-runtime";
import type { PiSessionEvent } from "../../src/shared/pi-session";

const now = () => "2026-05-14T12:00:00.000Z";

const createFakeSession = () => {
	let listener: ((event: any) => void) | undefined;
	const session: PiSdkSession = {
		sessionId: "sdk-session:one",
		subscribe: vi.fn((nextListener) => {
			listener = nextListener;
			return () => {
				listener = undefined;
			};
		}),
		bindExtensions: vi.fn(async () => undefined),
		prompt: vi.fn(async (prompt: string) => {
			listener?.({
				type: "message_start",
				message: { role: "user", content: [{ type: "text", text: prompt }], timestamp: 1 },
			});
			listener?.({
				type: "message_update",
				message: { role: "assistant", content: [{ type: "text", text: "Hi" }], timestamp: 2 },
				assistantMessageEvent: { type: "text_delta", delta: "Hi" },
			});
			listener?.({
				type: "agent_end",
				messages: [],
			});
		}),
		abort: vi.fn(async () => undefined),
		dispose: vi.fn(() => undefined),
	};

	return { session };
};

describe("createPiSessionRuntime", () => {
	it("starts a session and streams normalized events", async () => {
		const events: PiSessionEvent[] = [];
		const { session } = createFakeSession();
		const runtime = createPiSessionRuntime({
			now,
			emit: (event) => events.push(event),
			createAgentSession: vi.fn(async () => ({ session })),
		});

		const result = await runtime.start({
			projectId: "project:/tmp/pi-desktop",
			workspacePath: "/tmp/pi-desktop",
			prompt: "Hello",
		});

		expect(result.status).toBe("running");
		await runtime.whenIdle(result.sessionId);
		expect(session.bindExtensions).toHaveBeenCalledWith({});
		expect(session.prompt).toHaveBeenCalledWith("Hello");
		expect(events.map((event) => event.type)).toEqual([
			"status",
			"message_start",
			"assistant_delta",
			"status",
		]);
	});

	it("aborts an active session", async () => {
		const events: PiSessionEvent[] = [];
		const { session } = createFakeSession();
		const runtime = createPiSessionRuntime({
			now,
			emit: (event) => events.push(event),
			createAgentSession: vi.fn(async () => ({ session })),
		});

		const result = await runtime.start({
			projectId: "project:/tmp/pi-desktop",
			workspacePath: "/tmp/pi-desktop",
			prompt: "Hello",
		});
		await runtime.abort({ sessionId: result.sessionId });

		expect(session.abort).toHaveBeenCalled();
		expect(events).toContainEqual({
			type: "status",
			sessionId: result.sessionId,
			status: "aborting",
			label: "Aborting",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});
	});

	it("emits startup errors clearly", async () => {
		const events: PiSessionEvent[] = [];
		const runtime = createPiSessionRuntime({
			now,
			emit: (event) => events.push(event),
			createAgentSession: vi.fn(async () => {
				throw new Error("No API key found for provider");
			}),
		});

		await expect(
			runtime.start({
				projectId: "project:/tmp/pi-desktop",
				workspacePath: "/tmp/pi-desktop",
				prompt: "Hello",
			}),
		).rejects.toThrow("No API key found for provider");

		expect(events[0]).toEqual({
			type: "runtime_error",
			code: "pi.session_start_failed",
			message: "No API key found for provider",
			receivedAt: "2026-05-14T12:00:00.000Z",
		});
	});
});
```

- [ ] **Step 2: Run runtime tests to verify they fail**

Run:

```bash
pnpm test -- tests/main/pi-session-runtime.test.ts
```

Expected: FAIL because `pi-session-runtime.ts` does not exist.

- [ ] **Step 3: Add the runtime**

Create `src/main/pi-session/pi-session-runtime.ts` with this content:

```ts
import { createAgentSession as createPiAgentSession } from "@earendil-works/pi-coding-agent";
import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import type {
	PiSessionAbortInput,
	PiSessionActionPayload,
	PiSessionDisposeInput,
	PiSessionEvent,
	PiSessionStartPayload,
	PiSessionStatus,
	PiSessionSubmitInput,
} from "../../shared/pi-session";
import { createRuntimeErrorEvent, normalizePiSessionEvent } from "./pi-session-event-normalizer";

export type PiSdkSession = {
	sessionId: string;
	subscribe: (listener: (event: AgentSessionEvent) => void) => () => void;
	bindExtensions: (bindings: Record<string, never>) => Promise<void>;
	prompt: (prompt: string) => Promise<void>;
	abort: () => Promise<void>;
	dispose: () => void;
};

type CreateAgentSessionResult = {
	session: PiSdkSession;
};

type RuntimeStartInput = {
	projectId: string;
	workspacePath: string;
	prompt: string;
};

type RuntimeDeps = {
	now: () => string;
	emit: (event: PiSessionEvent) => void;
	createAgentSession?: (options: { cwd: string }) => Promise<CreateAgentSessionResult>;
};

type RuntimeEntry = {
	session: PiSdkSession;
	status: PiSessionStatus;
	unsubscribe: () => void;
	idle: Promise<void>;
};

const createDesktopSessionId = (projectId: string, piSessionId: string): string => `${projectId}:${piSessionId}`;

export const createPiSessionRuntime = (deps: RuntimeDeps) => {
	const createAgentSession = deps.createAgentSession ?? createPiAgentSession;
	const sessions = new Map<string, RuntimeEntry>();

	const emitStatus = (sessionId: string, status: PiSessionStatus, label: string) => {
		deps.emit({ type: "status", sessionId, status, label, receivedAt: deps.now() });
	};

	const getEntry = (sessionId: string): RuntimeEntry => {
		const entry = sessions.get(sessionId);
		if (!entry) {
			throw new Error("Pi session not found.");
		}
		return entry;
	};

	const runPrompt = (sessionId: string, prompt: string): Promise<void> => {
		const entry = getEntry(sessionId);
		entry.status = "running";
		emitStatus(sessionId, "running", "Running");

		return entry.session.prompt(prompt).catch((error) => {
			entry.status = "failed";
			deps.emit(createRuntimeErrorEvent({ sessionId, code: "pi.prompt_failed", error, now: deps.now }));
			emitStatus(sessionId, "failed", "Failed");
		});
	};

	return {
		async start(input: RuntimeStartInput): Promise<PiSessionStartPayload> {
			let created: CreateAgentSessionResult;
			try {
				created = await createAgentSession({ cwd: input.workspacePath });
				await created.session.bindExtensions({});
			} catch (error) {
				deps.emit(createRuntimeErrorEvent({ code: "pi.session_start_failed", error, now: deps.now }));
				throw error;
			}

			const sessionId = createDesktopSessionId(input.projectId, created.session.sessionId);
			const unsubscribe = created.session.subscribe((event) => {
				for (const normalized of normalizePiSessionEvent({ sessionId, event, now: deps.now })) {
					deps.emit(normalized);
				}
			});
			const entry: RuntimeEntry = {
				session: created.session,
				status: "running",
				unsubscribe,
				idle: Promise.resolve(),
			};
			sessions.set(sessionId, entry);
			entry.idle = runPrompt(sessionId, input.prompt);

			return {
				sessionId,
				projectId: input.projectId,
				workspacePath: input.workspacePath,
				status: "running",
			};
		},

		async submit(input: PiSessionSubmitInput): Promise<PiSessionActionPayload> {
			const entry = getEntry(input.sessionId);
			entry.idle = runPrompt(input.sessionId, input.prompt);
			return { sessionId: input.sessionId, status: entry.status };
		},

		async abort(input: PiSessionAbortInput): Promise<PiSessionActionPayload> {
			const entry = getEntry(input.sessionId);
			entry.status = "aborting";
			emitStatus(input.sessionId, "aborting", "Aborting");
			await entry.session.abort();
			entry.status = "idle";
			emitStatus(input.sessionId, "idle", "Idle");
			return { sessionId: input.sessionId, status: "idle" };
		},

		async dispose(input: PiSessionDisposeInput): Promise<PiSessionActionPayload> {
			const entry = getEntry(input.sessionId);
			entry.unsubscribe();
			entry.session.dispose();
			sessions.delete(input.sessionId);
			return { sessionId: input.sessionId, status: "idle" };
		},

		async whenIdle(sessionId: string): Promise<void> {
			await getEntry(sessionId).idle;
		},
	};
};
```

- [ ] **Step 4: Run runtime tests**

Run:

```bash
pnpm test -- tests/main/pi-session-runtime.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/pi-session/pi-session-runtime.ts tests/main/pi-session-runtime.test.ts
git commit -m "feat: add pi session runtime"
```

## Task 5: Expose Session IPC And Preload API

**Files:**
- Modify: `src/shared/ipc.ts`
- Modify: `src/shared/preload-api.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`
- Modify: `tests/shared/ipc.test.ts`

- [ ] **Step 1: Write failing IPC/preload type changes**

Modify imports in `src/shared/ipc.ts`:

```ts
import {
	PiSessionAbortInputSchema,
	PiSessionActionResultSchema,
	PiSessionDisposeInputSchema,
	PiSessionEventSchema,
	PiSessionStartInputSchema,
	PiSessionStartResultSchema,
	PiSessionSubmitInputSchema,
	type PiSessionAbortInput,
	type PiSessionActionResult,
	type PiSessionDisposeInput,
	type PiSessionEvent,
	type PiSessionStartInput,
	type PiSessionStartResult,
	type PiSessionSubmitInput,
} from "./pi-session";
```

Add these channel constants:

```ts
piSessionStart: "pi-session:start",
piSessionSubmit: "pi-session:submit",
piSessionAbort: "pi-session:abort",
piSessionDispose: "pi-session:dispose",
piSessionEvent: "pi-session:event",
```

Export these schemas and types from `src/shared/ipc.ts`:

```ts
export {
	PiSessionAbortInputSchema,
	PiSessionActionResultSchema,
	PiSessionDisposeInputSchema,
	PiSessionEventSchema,
	PiSessionStartInputSchema,
	PiSessionStartResultSchema,
	PiSessionSubmitInputSchema,
};

export type {
	PiSessionAbortInput,
	PiSessionActionResult,
	PiSessionDisposeInput,
	PiSessionEvent,
	PiSessionStartInput,
	PiSessionStartResult,
	PiSessionSubmitInput,
};
```

- [ ] **Step 2: Run IPC tests to verify they fail**

Run:

```bash
pnpm test -- tests/shared/ipc.test.ts
```

Expected: FAIL until `IpcChannels` includes all session channels and the exported schemas resolve.

- [ ] **Step 3: Add preload API types**

Modify `src/shared/preload-api.ts` imports to include:

```ts
	PiSessionAbortInput,
	PiSessionActionResult,
	PiSessionDisposeInput,
	PiSessionEvent,
	PiSessionStartInput,
	PiSessionStartResult,
	PiSessionSubmitInput,
```

Add this property to `PiDesktopApi`:

```ts
	piSession: {
		start: (input: PiSessionStartInput) => Promise<PiSessionStartResult>;
		submit: (input: PiSessionSubmitInput) => Promise<PiSessionActionResult>;
		abort: (input: PiSessionAbortInput) => Promise<PiSessionActionResult>;
		dispose: (input: PiSessionDisposeInput) => Promise<PiSessionActionResult>;
		onEvent: (listener: (event: PiSessionEvent) => void) => () => void;
	};
```

- [ ] **Step 4: Implement preload invoke and event parsing**

Modify `src/preload/index.ts` imports:

```ts
import {
	AppVersionResultSchema,
	IpcChannels,
	PiSessionActionResultSchema,
	PiSessionEventSchema,
	PiSessionStartResultSchema,
	ProjectStateViewResultSchema,
} from "../shared/ipc";
```

Add this block to the `api` object:

```ts
	piSession: {
		start: async (input) => safeInvokeParse(IpcChannels.piSessionStart, PiSessionStartResultSchema, input),
		submit: async (input) => safeInvokeParse(IpcChannels.piSessionSubmit, PiSessionActionResultSchema, input),
		abort: async (input) => safeInvokeParse(IpcChannels.piSessionAbort, PiSessionActionResultSchema, input),
		dispose: async (input) => safeInvokeParse(IpcChannels.piSessionDispose, PiSessionActionResultSchema, input),
		onEvent: (listener) => {
			const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => {
				const parsed = PiSessionEventSchema.safeParse(payload);
				if (parsed.success) {
					listener(parsed.data);
				}
			};
			ipcRenderer.on(IpcChannels.piSessionEvent, handler);
			return () => ipcRenderer.removeListener(IpcChannels.piSessionEvent, handler);
		},
	},
```

- [ ] **Step 5: Register main IPC handlers**

Modify `src/main/index.ts`.

Add imports:

```ts
import {
	PiSessionAbortInputSchema,
	PiSessionDisposeInputSchema,
	PiSessionStartInputSchema,
	PiSessionSubmitInputSchema,
} from "../shared/pi-session";
import { createPiSessionRuntime } from "./pi-session/pi-session-runtime";
```

Change `registerIpcHandlers` signature:

```ts
const registerIpcHandlers = (projectService: ProjectService, mainWindow: BrowserWindow) => {
	const piSessionRuntime = createPiSessionRuntime({
		now: () => new Date().toISOString(),
		emit: (event) => {
			if (!mainWindow.isDestroyed()) {
				mainWindow.webContents.send(IpcChannels.piSessionEvent, event);
			}
		},
	});
```

Add handlers inside `registerIpcHandlers`:

```ts
	ipcMain.handle(IpcChannels.piSessionStart, (_event, input) =>
		handleProjectOperation(async () => {
			const parsed = PiSessionStartInputSchema.parse(input);
			const workspace = await projectService.getSessionWorkspace({ projectId: parsed.projectId });
			return piSessionRuntime.start({
				projectId: workspace.projectId,
				workspacePath: workspace.path,
				prompt: parsed.prompt,
			});
		}),
	);
	ipcMain.handle(IpcChannels.piSessionSubmit, (_event, input) =>
		handleProjectOperation(() => piSessionRuntime.submit(PiSessionSubmitInputSchema.parse(input))),
	);
	ipcMain.handle(IpcChannels.piSessionAbort, (_event, input) =>
		handleProjectOperation(() => piSessionRuntime.abort(PiSessionAbortInputSchema.parse(input))),
	);
	ipcMain.handle(IpcChannels.piSessionDispose, (_event, input) =>
		handleProjectOperation(() => piSessionRuntime.dispose(PiSessionDisposeInputSchema.parse(input))),
	);
```

Change startup so `createWindow()` returns the window:

```ts
const createWindow = () => {
	const mainWindow = new BrowserWindow({
```

Add `return mainWindow;` at the end of `createWindow()` after `loadURL` or `loadFile` is started. Then update app startup:

```ts
	const mainWindow = createWindow();
	registerIpcHandlers(projectService, mainWindow);
```

- [ ] **Step 6: Run IPC and typecheck**

Run:

```bash
pnpm test -- tests/shared/ipc.test.ts
pnpm typecheck
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/shared/ipc.ts src/shared/preload-api.ts src/preload/index.ts src/main/index.ts tests/shared/ipc.test.ts
git commit -m "feat: expose pi session ipc"
```

## Task 6: Add Renderer Session State And Runtime-Ready Chat Route

**Files:**
- Create: `src/renderer/session/session-state.ts`
- Create: `tests/renderer/session-state.test.ts`
- Modify: `src/renderer/chat/chat-view-model.ts`
- Modify: `tests/renderer/chat-view-model.test.ts`
- Modify: `src/renderer/chat/composer-state.ts`
- Modify: `tests/renderer/composer-state.test.ts`

- [ ] **Step 1: Write failing reducer tests**

Create `tests/renderer/session-state.test.ts` with this content:

```ts
import { describe, expect, it } from "vitest";
import { createInitialSessionState, reduceSessionEvent } from "../../src/renderer/session/session-state";

const receivedAt = "2026-05-14T12:00:00.000Z";

describe("session state reducer", () => {
	it("adds user messages and streams assistant deltas", () => {
		let state = createInitialSessionState();
		state = reduceSessionEvent(state, {
			type: "message_start",
			sessionId: "pi-session:one",
			messageId: "user:1",
			role: "user",
			content: "Hello",
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "message_start",
			sessionId: "pi-session:one",
			messageId: "assistant:2",
			role: "assistant",
			content: "",
			receivedAt,
		});
		state = reduceSessionEvent(state, {
			type: "assistant_delta",
			sessionId: "pi-session:one",
			messageId: "assistant:2",
			delta: "Hi",
			receivedAt,
		});

		expect(state.messages).toEqual([
			{ id: "user:1", role: "user", content: "Hello", streaming: false },
			{ id: "assistant:2", role: "assistant", content: "Hi", streaming: true },
		]);
	});

	it("records runtime errors and failed status", () => {
		const state = reduceSessionEvent(createInitialSessionState(), {
			type: "runtime_error",
			sessionId: "pi-session:one",
			code: "pi.prompt_failed",
			message: "No API key",
			receivedAt,
		});

		expect(state.status).toBe("failed");
		expect(state.errorMessage).toBe("No API key");
	});

	it("records retry messages", () => {
		const state = reduceSessionEvent(createInitialSessionState(), {
			type: "retry",
			sessionId: "pi-session:one",
			attempt: 1,
			maxAttempts: 3,
			delayMs: 500,
			message: "rate limit",
			receivedAt,
		});

		expect(state.retryMessage).toBe("Retry 1 of 3: rate limit");
	});
});
```

- [ ] **Step 2: Run reducer tests to verify they fail**

Run:

```bash
pnpm test -- tests/renderer/session-state.test.ts
```

Expected: FAIL because `session-state.ts` does not exist.

- [ ] **Step 3: Add session reducer**

Create `src/renderer/session/session-state.ts` with this content:

```ts
import type { PiSessionEvent, PiSessionStatus } from "../../shared/pi-session";

export type LiveSessionMessage = {
	id: string;
	role: "user" | "assistant" | "tool" | "system";
	content: string;
	streaming: boolean;
};

export type LiveSessionState = {
	sessionId: string | null;
	status: PiSessionStatus;
	statusLabel: string;
	messages: LiveSessionMessage[];
	errorMessage: string;
	retryMessage: string;
};

export const createInitialSessionState = (): LiveSessionState => ({
	sessionId: null,
	status: "idle",
	statusLabel: "Idle",
	messages: [],
	errorMessage: "",
	retryMessage: "",
});

const upsertMessage = (
	messages: readonly LiveSessionMessage[],
	next: LiveSessionMessage,
): LiveSessionMessage[] => {
	const index = messages.findIndex((message) => message.id === next.id);
	if (index === -1) {
		return [...messages, next];
	}

	return messages.map((message, messageIndex) => (messageIndex === index ? next : message));
};

export const reduceSessionEvent = (state: LiveSessionState, event: PiSessionEvent): LiveSessionState => {
	if (event.type === "status") {
		return {
			...state,
			sessionId: event.sessionId,
			status: event.status,
			statusLabel: event.label,
			errorMessage: event.status === "failed" ? state.errorMessage : "",
		};
	}

	if (event.type === "message_start") {
		return {
			...state,
			sessionId: event.sessionId,
			messages: upsertMessage(state.messages, {
				id: event.messageId,
				role: event.role,
				content: event.content,
				streaming: event.role === "assistant",
			}),
		};
	}

	if (event.type === "assistant_delta") {
		return {
			...state,
			sessionId: event.sessionId,
			messages: state.messages.map((message) =>
				message.id === event.messageId
					? { ...message, content: `${message.content}${event.delta}`, streaming: true }
					: message,
			),
		};
	}

	if (event.type === "message_end") {
		return {
			...state,
			sessionId: event.sessionId,
			messages: upsertMessage(state.messages, {
				id: event.messageId,
				role: event.role,
				content: event.content,
				streaming: false,
			}),
		};
	}

	if (event.type === "runtime_error") {
		return {
			...state,
			sessionId: event.sessionId ?? state.sessionId,
			status: "failed",
			statusLabel: "Failed",
			errorMessage: event.message,
		};
	}

	if (event.type === "retry") {
		const max = event.maxAttempts ? ` of ${event.maxAttempts}` : "";
		return {
			...state,
			sessionId: event.sessionId,
			status: "retrying",
			statusLabel: "Retrying",
			retryMessage: `Retry ${event.attempt}${max}: ${event.message}`,
		};
	}

	return state;
};
```

- [ ] **Step 4: Update route model expectations**

Modify `src/renderer/chat/chat-view-model.ts` so `ComposerContext` has:

```ts
runtimeAvailable: boolean;
disabledReason: string;
projectId?: string;
```

Change `createComposerContext` to:

```ts
const createComposerContext = (
	projectSelectorLabel: string,
	options: { runtimeAvailable: boolean; disabledReason: string; projectId?: string },
): ComposerContext => ({
	projectSelectorLabel,
	modeLabel: "Work locally",
	modelLabel: "5.5 High",
	runtimeAvailable: options.runtimeAvailable,
	disabledReason: options.disabledReason,
	projectId: options.projectId,
});
```

Use it for no-project:

```ts
composer: createComposerContext("Work in a project", {
	runtimeAvailable: false,
	disabledReason: "Select an available project to start a Pi session.",
}),
```

Use it for available selected project:

```ts
const composer = createComposerContext(projectSelectorLabel, {
	runtimeAvailable: true,
	disabledReason: "",
	projectId: selectedProject.id,
});
```

Modify tests in `tests/renderer/chat-view-model.test.ts` so available project routes expect `runtimeAvailable: true`, `disabledReason: ""`, and `projectId: project.id`. Keep global start disabled with `"Select an available project to start a Pi session."`.

- [ ] **Step 5: Update composer state for empty disabled reason**

Modify `src/renderer/chat/composer-state.ts` so runtime-unavailable status uses the supplied reason:

```ts
interface ComposerStateInput {
	text: string;
	runtimeAvailable: boolean;
	disabledReason: string;
}

export const createComposerState = ({ text, runtimeAvailable, disabledReason }: ComposerStateInput) => {
	const hasText = text.trim().length > 0;
	const blockedByRuntime = !runtimeAvailable;

	return {
		sendDisabled: !hasText || blockedByRuntime,
		statusLabel: blockedByRuntime ? disabledReason : "",
	};
};
```

Update `tests/renderer/composer-state.test.ts` runtime-available expectations to pass `disabledReason: ""`.

- [ ] **Step 6: Run renderer unit tests**

Run:

```bash
pnpm test -- tests/renderer/session-state.test.ts tests/renderer/chat-view-model.test.ts tests/renderer/composer-state.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/session/session-state.ts tests/renderer/session-state.test.ts src/renderer/chat/chat-view-model.ts tests/renderer/chat-view-model.test.ts src/renderer/chat/composer-state.ts tests/renderer/composer-state.test.ts
git commit -m "feat: add renderer pi session state"
```

## Task 7: Wire Composer, Live Transcript, And Abort UI

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/project-main.tsx`
- Modify: `src/renderer/components/chat-shell.tsx`
- Modify: `src/renderer/components/composer.tsx`
- Create: `src/renderer/components/live-session-transcript.tsx`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Add live transcript component**

Create `src/renderer/components/live-session-transcript.tsx` with this content:

```tsx
import { LoaderCircle, TriangleAlert } from "lucide-react";
import type { LiveSessionState } from "../session/session-state";

interface LiveSessionTranscriptProps {
	session: LiveSessionState;
}

export function LiveSessionTranscript({ session }: LiveSessionTranscriptProps) {
	return (
		<section className="live-session" aria-label="Pi session transcript">
			<div className="live-session__status" aria-live="polite">
				{session.status === "running" || session.status === "retrying" || session.status === "aborting" ? (
					<LoaderCircle className="live-session__status-icon live-session__status-icon--spin" />
				) : null}
				<span>{session.statusLabel}</span>
			</div>
			{session.retryMessage ? <div className="live-session__notice">{session.retryMessage}</div> : null}
			{session.errorMessage ? (
				<div className="live-session__error" role="alert">
					<TriangleAlert className="live-session__status-icon" />
					<span>{session.errorMessage}</span>
				</div>
			) : null}
			<div className="live-session__messages">
				{session.messages.map((message) => (
					<article className={`live-session__message live-session__message--${message.role}`} key={message.id}>
						<div className="live-session__message-role">{message.role === "assistant" ? "Pi" : "You"}</div>
						<div className="live-session__message-content">
							{message.content}
							{message.streaming ? <span className="live-session__cursor" aria-label="Streaming" /> : null}
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
```

- [ ] **Step 2: Update composer props and submit behavior**

Modify `src/renderer/components/composer.tsx` props:

```ts
interface ComposerProps {
	context: ComposerContext;
	layout?: "center" | "bottom";
	running?: boolean;
	onSubmit?: (prompt: string) => void;
	onAbort?: () => void;
}
```

Change function signature:

```tsx
export function Composer({ context, layout = "center", running = false, onSubmit, onAbort }: ComposerProps) {
```

Change `<form ... onSubmit>`:

```tsx
onSubmit={(event) => {
	event.preventDefault();
	const prompt = text.trim();
	if (!state.sendDisabled && prompt) {
		onSubmit?.(prompt);
		setText("");
	}
}}
```

Replace the send button with:

```tsx
{running ? (
	<button className="composer__send-button composer__send-button--abort" type="button" aria-label="Abort run" onClick={onAbort}>
		<span className="composer__abort-mark" />
	</button>
) : (
	<button
		className="composer__send-button"
		type="submit"
		disabled={state.sendDisabled}
		aria-label="Send message"
	>
		<ArrowUp className="composer__icon" />
	</button>
)}
```

- [ ] **Step 3: Pass live session through chat shell**

Modify `src/renderer/components/chat-shell.tsx` props:

```ts
import type { LiveSessionState } from "../session/session-state";
import { LiveSessionTranscript } from "./live-session-transcript";

interface ChatShellProps {
	route: Exclude<ChatShellRoute, { kind: "unavailable-project" }>;
	session: LiveSessionState;
	onSubmitPrompt: (prompt: string) => void;
	onAbortSession: () => void;
}
```

Inside `ChatShell`, define:

```ts
const running = session.status === "starting" || session.status === "running" || session.status === "retrying" || session.status === "aborting";
```

For start routes:

```tsx
return (
	<ChatStartState
		route={route}
		session={session}
		onSubmitPrompt={onSubmitPrompt}
		onAbortSession={onAbortSession}
	/>
);
```

For session routes, render live transcript when any live messages or errors exist:

```tsx
{session.messages.length > 0 || session.errorMessage ? (
	<LiveSessionTranscript session={session} />
) : route.kind === "continued-chat" ? (
	<ChatTranscript title={route.title} transcript={route.transcript} />
) : (
	<section className="chat-shell__empty-chat" aria-label="Empty chat">
		No messages yet.
	</section>
)}
```

Update bottom composer:

```tsx
<Composer context={route.composer} layout="bottom" running={running} onSubmit={onSubmitPrompt} onAbort={onAbortSession} />
```

Modify `src/renderer/components/chat-start-state.tsx` similarly so it accepts `session`, `onSubmitPrompt`, and `onAbortSession`, renders `LiveSessionTranscript` below suggestions when live state exists, and passes submit/abort props to `Composer`.

- [ ] **Step 4: Own session state in App**

Modify `src/renderer/App.tsx`.

Add imports:

```ts
import { createInitialSessionState, reduceSessionEvent, type LiveSessionState } from "./session/session-state";
```

Add state:

```ts
const [sessionState, setSessionState] = useState<LiveSessionState>(() => createInitialSessionState());
```

Add event subscription in `useEffect`:

```ts
useEffect(() => {
	return window.piDesktop.piSession.onEvent((event) => {
		setSessionState((current) => reduceSessionEvent(current, event));
	});
}, []);
```

Add submit callback:

```ts
const submitPrompt = useCallback(
	async (prompt: string) => {
		const selectedProject = projectState.selectedProject;
		if (!selectedProject || selectedProject.availability.status !== "available") {
			setSessionState((current) => ({
				...current,
				status: "failed",
				statusLabel: "Failed",
				errorMessage: "Select an available project to start a Pi session.",
			}));
			return;
		}

		setSessionState((current) => ({
			...current,
			status: sessionState.sessionId ? "running" : "starting",
			statusLabel: sessionState.sessionId ? "Running" : "Starting",
			errorMessage: "",
		}));

		const result = sessionState.sessionId
			? await window.piDesktop.piSession.submit({ sessionId: sessionState.sessionId, prompt })
			: await window.piDesktop.piSession.start({ projectId: selectedProject.id, prompt });

		if (!result.ok) {
			setSessionState((current) => ({
				...current,
				status: "failed",
				statusLabel: "Failed",
				errorMessage: result.error.message,
			}));
		}
	},
	[projectState.selectedProject, sessionState.sessionId],
);
```

Add abort callback:

```ts
const abortSession = useCallback(async () => {
	if (!sessionState.sessionId) {
		return;
	}

	const result = await window.piDesktop.piSession.abort({ sessionId: sessionState.sessionId });
	if (!result.ok) {
		setSessionState((current) => ({
			...current,
			status: "failed",
			statusLabel: "Failed",
			errorMessage: result.error.message,
		}));
	}
}, [sessionState.sessionId]);
```

Pass props to `AppShell`:

```tsx
<AppShell
	state={projectState}
	statusMessage={statusMessage?.message}
	session={sessionState}
	onProjectState={applyProjectStateViewResult}
	onSubmitPrompt={submitPrompt}
	onAbortSession={abortSession}
/>
```

Thread those props through `src/renderer/components/app-shell.tsx` and `src/renderer/components/project-main.tsx` to `ChatShell`.

- [ ] **Step 5: Add CSS**

Append to `src/renderer/styles.css`:

```css
.live-session {
	display: flex;
	flex-direction: column;
	gap: 14px;
	width: min(760px, 100%);
	margin: 0 auto;
}

.live-session__status,
.live-session__notice,
.live-session__error {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	color: var(--muted-foreground);
	font-size: 12px;
}

.live-session__error {
	color: #fca5a5;
}

.live-session__status-icon {
	width: 14px;
	height: 14px;
}

.live-session__status-icon--spin {
	animation: live-session-spin 900ms linear infinite;
}

.live-session__messages {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.live-session__message {
	display: grid;
	gap: 6px;
}

.live-session__message--user {
	justify-items: end;
}

.live-session__message-role {
	color: var(--muted-foreground);
	font-size: 12px;
}

.live-session__message-content {
	max-width: min(680px, 100%);
	white-space: pre-wrap;
	color: var(--foreground);
	font-size: 14px;
	line-height: 1.6;
}

.live-session__message--user .live-session__message-content {
	border-radius: 8px;
	background: var(--sidebar-accent);
	padding: 10px 12px;
}

.live-session__cursor {
	display: inline-block;
	width: 7px;
	height: 1em;
	margin-left: 2px;
	background: currentColor;
	vertical-align: -0.15em;
}

.composer__send-button--abort {
	background: #ef4444;
}

.composer__abort-mark {
	width: 10px;
	height: 10px;
	border-radius: 2px;
	background: #fff;
}

@keyframes live-session-spin {
	to {
		transform: rotate(360deg);
	}
}
```

- [ ] **Step 6: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/App.tsx src/renderer/components/app-shell.tsx src/renderer/components/project-main.tsx src/renderer/components/chat-shell.tsx src/renderer/components/chat-start-state.tsx src/renderer/components/composer.tsx src/renderer/components/live-session-transcript.tsx src/renderer/styles.css
git commit -m "feat: wire live pi session ui"
```

## Task 8: Add Preview Stream And Smoke Coverage

**Files:**
- Modify: `src/renderer/dev-preview-api.ts`
- Modify: `tests/smoke/app.spec.ts`

- [ ] **Step 1: Add fake session API to preview**

Modify `src/renderer/dev-preview-api.ts`.

Add imports:

```ts
import type { PiSessionEvent } from "../shared/pi-session";
```

Add this state inside `installDevPreviewApi` before `const api: PiDesktopApi = {`:

```ts
const sessionListeners = new Set<(event: PiSessionEvent) => void>();
const emitSessionEvent = (event: PiSessionEvent) => {
	for (const listener of sessionListeners) {
		listener(event);
	}
};
const emitPreviewStream = (sessionId: string, prompt: string) => {
	const receivedAt = () => new Date().toISOString();
	emitSessionEvent({ type: "status", sessionId, status: "running", label: "Running", receivedAt: receivedAt() });
	emitSessionEvent({
		type: "message_start",
		sessionId,
		messageId: `user:${Date.now()}`,
		role: "user",
		content: prompt,
		receivedAt: receivedAt(),
	});
	const assistantMessageId = `assistant:${Date.now() + 1}`;
	emitSessionEvent({
		type: "message_start",
		sessionId,
		messageId: assistantMessageId,
		role: "assistant",
		content: "",
		receivedAt: receivedAt(),
	});
	for (const delta of ["I can see this project. ", "Pi session streaming is connected."]) {
		emitSessionEvent({
			type: "assistant_delta",
			sessionId,
			messageId: assistantMessageId,
			delta,
			receivedAt: receivedAt(),
		});
	}
	emitSessionEvent({
		type: "message_end",
		sessionId,
		messageId: assistantMessageId,
		role: "assistant",
		content: "I can see this project. Pi session streaming is connected.",
		receivedAt: receivedAt(),
	});
	emitSessionEvent({ type: "status", sessionId, status: "idle", label: "Idle", receivedAt: receivedAt() });
};
```

Add `piSession` to the preview API:

```ts
		piSession: {
			start: async ({ projectId, prompt }) => {
				const sessionId = `preview-session:${projectId}`;
				queueMicrotask(() => emitPreviewStream(sessionId, prompt));
				return {
					ok: true,
					data: {
						sessionId,
						projectId,
						workspacePath: store.projects.find((candidate) => candidate.id === projectId)?.path ?? previewRoot,
						status: "running",
					},
				};
			},
			submit: async ({ sessionId, prompt }) => {
				queueMicrotask(() => emitPreviewStream(sessionId, prompt));
				return { ok: true, data: { sessionId, status: "running" } };
			},
			abort: async ({ sessionId }) => {
				emitSessionEvent({ type: "status", sessionId, status: "aborting", label: "Aborting", receivedAt: new Date().toISOString() });
				emitSessionEvent({ type: "status", sessionId, status: "idle", label: "Idle", receivedAt: new Date().toISOString() });
				return { ok: true, data: { sessionId, status: "idle" } };
			},
			dispose: async ({ sessionId }) => ({ ok: true, data: { sessionId, status: "idle" } }),
			onEvent: (listener) => {
				sessionListeners.add(listener);
				return () => sessionListeners.delete(listener);
			},
		},
```

- [ ] **Step 2: Add smoke test coverage**

Modify `tests/smoke/app.spec.ts` with a test that selects the `pi-desktop` project, fills the composer, sends a prompt, and expects streamed preview text:

```ts
test("streams a Pi session response in the selected project", async ({ page }) => {
	await page.getByRole("button", { name: /pi-desktop/i }).click();
	await page.getByLabel("Message Pi").fill("What files are here?");
	await page.getByRole("button", { name: "Send message" }).click();

	await expect(page.getByText("What files are here?")).toBeVisible();
	await expect(page.getByText("Pi session streaming is connected.")).toBeVisible();
	await expect(page.getByText("Idle")).toBeVisible();
});
```

- [ ] **Step 3: Run targeted smoke and unit checks**

Run:

```bash
pnpm test -- tests/renderer/session-state.test.ts tests/main/pi-session-runtime.test.ts tests/main/pi-session-event-normalizer.test.ts
pnpm test:smoke
```

Expected: both commands PASS.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/dev-preview-api.ts tests/smoke/app.spec.ts
git commit -m "test: cover pi session preview stream"
```

## Task 9: Final Verification And Documentation Review

**Files:**
- Modify only if verification exposes a concrete issue.

- [ ] **Step 1: Run formatting**

Run:

```bash
pnpm format
```

Expected: files are formatted.

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm check
```

Expected: PASS for format check, lint, typecheck, coverage, and smoke tests.

- [ ] **Step 3: Manual runtime verification**

Run:

```bash
pnpm dev
```

Expected:

- App opens.
- Select an available project.
- Send `What files are in this repository?`.
- Composer changes to abort control while Pi runs.
- Assistant response streams into the transcript.
- Abort during a second prompt changes status through `Aborting` and returns to `Idle`.
- If auth or model config is missing, the chat surface shows the Pi error text.

- [ ] **Step 4: Record verification fixes if needed**

If Step 2 or Step 3 requires code changes, stop after the fix, run the failed command again, and record the exact changed files from:

```bash
git status --short
```

Then create a one-step follow-up plan that names the exact files and command required for that verification fix. If verification required no code changes, skip this step.

## Self-Review

- Spec coverage: Pi SDK dependency is Task 1. Runtime adapter is Task 4. Session creation for selected project is Tasks 2, 4, and 5. Prompt submission and streaming messages are Tasks 4, 5, 6, and 7. Agent status indicators, abort, retry events, and runtime errors are Tasks 3, 4, and 7. Minimum project selection and availability checks are Tasks 2 and 6.
- Placeholder scan: all task steps include concrete commands, file paths, or code blocks.
- Type consistency: shared types use `PiSessionStartInput`, `PiSessionSubmitInput`, `PiSessionAbortInput`, `PiSessionEvent`, `PiSessionStatus`, and `LiveSessionState` consistently across tasks.
