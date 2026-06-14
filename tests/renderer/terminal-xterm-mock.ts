import { vi } from "vitest";

export const createXtermMock = () => ({
	terminal: {
		write: vi.fn(),
		dispose: vi.fn(),
		cols: 80,
		rows: 24,
		options: { disableStdin: false },
	},
	fit: vi.fn(() => ({ cols: 80, rows: 24 })),
	dispose: vi.fn(),
});
