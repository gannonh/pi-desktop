// Adapted from Orca terminal-pane xterm setup patterns (MIT, stablyai/orca).

import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

const readCssVariable = (name: string, fallback: string) => {
	if (typeof window === "undefined") {
		return fallback;
	}
	const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return value.length > 0 ? value : fallback;
};

export type XtermHandle = {
	terminal: Terminal;
	fitAddon: FitAddon;
	fit: () => { cols: number; rows: number } | null;
	dispose: () => void;
};

export const createXtermTerminal = (
	container: HTMLElement,
	options: {
		onData: (data: string) => void;
		onResize?: (size: { cols: number; rows: number }) => void;
	},
): XtermHandle => {
	const terminal = new Terminal({
		cursorBlink: true,
		fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		fontSize: 13,
		lineHeight: 1.2,
		scrollback: 5000,
		theme: {
			background: readCssVariable("--color-background", "#0a0a0a"),
			foreground: readCssVariable("--color-foreground", "#f5f5f5"),
			cursor: readCssVariable("--color-foreground", "#f5f5f5"),
			selectionBackground: readCssVariable("--color-accent", "#262626"),
		},
		allowProposedApi: true,
	});

	const fitAddon = new FitAddon();
	terminal.loadAddon(fitAddon);
	terminal.open(container);
	terminal.onData(options.onData);

	const fitToContainer = () => {
		try {
			fitAddon.fit();
		} catch {
			return null;
		}
		const size = { cols: terminal.cols, rows: terminal.rows };
		if (size.cols > 0 && size.rows > 0) {
			options.onResize?.(size);
		}
		return size;
	};

	fitToContainer();

	return {
		terminal,
		fitAddon,
		fit: fitToContainer,
		dispose: () => {
			terminal.dispose();
		},
	};
};
