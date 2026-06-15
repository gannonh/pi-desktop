// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import type { ProjectRecord } from "../../src/shared/project-state";
import { ok } from "../../src/shared/result";
import { useTerminalConnection } from "../../src/renderer/terminal/use-terminal-connection";
import { installTerminalApiMock } from "./terminal-test-api";
import { createXtermMock } from "./terminal-xterm-mock";

vi.mock("../../src/renderer/terminal/xterm-instance", () => ({
	createXtermTerminal: vi.fn(() => createXtermMock()),
}));

const availableProject = (): ProjectRecord => ({
	id: "project:/tmp/pi-desktop",
	displayName: "pi-desktop",
	path: "/tmp/pi-desktop",
	createdAt: "2026-05-12T09:00:00.000Z",
	updatedAt: "2026-05-12T10:00:00.000Z",
	lastOpenedAt: "2026-05-12T10:00:00.000Z",
	pinned: false,
	availability: { status: "available" },
	gitSettings: { defaultBaseRef: "main" },
});

describe("useTerminalConnection", () => {
	let terminalApi: ReturnType<typeof installTerminalApiMock>;
	let containerRef: ReturnType<typeof createRef<HTMLDivElement | null>>;
	let container: HTMLDivElement;

	beforeEach(() => {
		class ResizeObserverMock {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
		vi.stubGlobal("ResizeObserver", ResizeObserverMock);

		container = document.createElement("div");
		containerRef = { current: container };
		terminalApi = installTerminalApiMock({
			spawn: vi.fn(async () => ok({ terminalId: "term-1" })),
			kill: vi.fn(async () => ok({ accepted: true as const })),
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("spawns when an available project is mounted", async () => {
		const project = availableProject();
		const { result } = renderHook(() =>
			useTerminalConnection({
				project,
				containerRef,
			}),
		);

		await waitFor(() => {
			expect(result.current.state.phase).toEqual({ kind: "running", projectId: "project:/tmp/pi-desktop" });
		});
		expect(terminalApi.spawn).toHaveBeenCalledWith({
			projectId: "project:/tmp/pi-desktop",
			cols: 80,
			rows: 24,
		});
	});

	it("does not respawn when the project object identity changes but the spawn key is stable", async () => {
		const { result, rerender } = renderHook(
			({ project }) =>
				useTerminalConnection({
					project,
					containerRef,
				}),
			{ initialProps: { project: availableProject() } },
		);

		await waitFor(() => {
			expect(result.current.state.phase.kind).toBe("running");
		});
		const spawnCalls = vi.mocked(terminalApi.spawn).mock.calls.length;

		rerender({ project: { ...availableProject(), updatedAt: "2026-05-12T11:00:00.000Z" } });

		await act(async () => {
			await Promise.resolve();
		});

		expect(vi.mocked(terminalApi.spawn).mock.calls.length).toBe(spawnCalls);
	});

	it("marks user terminate as terminated when the exit event arrives", async () => {
		let exitListener: ((event: { type: "exit"; terminalId: string; code: number }) => void) | null = null;
		terminalApi.onEvent = (listener) => {
			exitListener = listener;
			return () => {
				exitListener = null;
			};
		};

		const project = availableProject();
		const { result } = renderHook(() =>
			useTerminalConnection({
				project,
				containerRef,
			}),
		);

		await waitFor(() => {
			expect(result.current.state.phase.kind).toBe("running");
		});

		await act(async () => {
			await result.current.terminate();
			exitListener?.({ type: "exit", terminalId: "term-1", code: 143 });
		});

		expect(result.current.state.phase).toEqual({ kind: "terminated" });
	});
});
