import { vi } from "vitest";
import type { PiDesktopApi } from "../../src/shared/preload-api";
import { ok } from "../../src/shared/result";

export const installTerminalApiMock = (overrides: Partial<PiDesktopApi["terminal"]> = {}) => {
	const terminal: PiDesktopApi["terminal"] = {
		spawn: vi.fn(async () => ok({ terminalId: "term-1" })),
		write: vi.fn(),
		resize: vi.fn(async () => ok({ accepted: true as const })),
		kill: vi.fn(async () => ok({ accepted: true as const })),
		onEvent: () => () => {},
		...overrides,
	};

	Object.defineProperty(window, "piDesktop", {
		configurable: true,
		writable: true,
		value: { terminal },
	});

	return terminal;
};
