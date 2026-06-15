// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

const fitMock = vi.fn();
const terminalState = { cols: 0, rows: 0, onData: vi.fn(), loadAddon: vi.fn(), open: vi.fn(), dispose: vi.fn() };

vi.mock("@xterm/xterm", () => ({
	Terminal: class {
		get cols() {
			return terminalState.cols;
		}
		get rows() {
			return terminalState.rows;
		}
		onData = terminalState.onData;
		loadAddon = terminalState.loadAddon;
		open = terminalState.open;
		dispose = terminalState.dispose;
	},
}));

vi.mock("@xterm/addon-fit", () => ({
	FitAddon: class {
		fit = fitMock;
	},
}));

describe("createXtermTerminal fit", () => {
	afterEach(() => {
		terminalState.cols = 0;
		terminalState.rows = 0;
		fitMock.mockReset();
	});

	it("returns null when fit leaves zero dimensions so spawn can fall back to defaults", async () => {
		const { createXtermTerminal } = await import("../../src/renderer/terminal/xterm-instance");
		const container = document.createElement("div");
		const handle = createXtermTerminal(container, { onData: vi.fn() });

		expect(handle.fit()).toBeNull();

		terminalState.cols = 80;
		terminalState.rows = 24;
		expect(handle.fit()).toEqual({ cols: 80, rows: 24 });
	});
});
