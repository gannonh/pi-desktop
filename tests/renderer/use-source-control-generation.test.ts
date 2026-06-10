// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSourceControlGeneration } from "../../src/renderer/changes-panel/use-source-control-generation";
import type { IpcResult } from "../../src/shared/result";
import type { PiDesktopApi } from "../../src/shared/preload-api";

describe("useSourceControlGeneration", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("surfaces cancellation failures instead of clearing the loading state optimistically", async () => {
		const cancelGeneration = vi.fn(async () => ({
			ok: false as const,
			error: { code: "source_control.operation_failed", message: "Could not cancel generation." },
		}));
		window.piDesktop = {
			sourceControl: { cancelGeneration },
		} as unknown as PiDesktopApi;

		let resolveRun: (value: IpcResult<{ message: string }>) => void = () => {};
		const run = vi.fn(
			() =>
				new Promise<IpcResult<{ message: string }>>((resolve) => {
					resolveRun = resolve;
				}),
		);

		const { result } = renderHook(() =>
			useSourceControlGeneration({
				run,
				onSuccess: vi.fn(),
			}),
		);

		let generatePromise: Promise<void> | undefined;
		act(() => {
			generatePromise = result.current.generate();
		});

		expect(result.current.isGenerating).toBe(true);

		await act(async () => {
			await result.current.cancel();
		});

		expect(cancelGeneration).toHaveBeenCalledTimes(1);
		expect(result.current.isGenerating).toBe(false);
		expect(result.current.error).toBe("Could not cancel generation.");

		await act(async () => {
			resolveRun({ ok: true, data: { message: "stale draft" } });
			await generatePromise;
		});
	});
});
