// Adapted from Orca terminal-pane xterm setup patterns (MIT, stablyai/orca).

import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

const readTerminalTheme = () => {
	if (typeof window === "undefined") {
		return {
			background: "#0a0a0a",
			foreground: "#f5f5f5",
			cursor: "#f5f5f5",
			selectionBackground: "#262626",
		};
	}
	const styles = getComputedStyle(document.documentElement);
	const read = (name: string, fallback: string) => {
		const value = styles.getPropertyValue(name).trim();
		return value.length > 0 ? value : fallback;
	};
	return {
		background: read("--color-background", "#0a0a0a"),
		foreground: read("--color-foreground", "#f5f5f5"),
		cursor: read("--color-foreground", "#f5f5f5"),
		selectionBackground: read("--color-accent", "#262626"),
	};
};

export type XtermHandle = {
	terminal: Terminal;
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
		theme: readTerminalTheme(),
	});

	const fitAddon = new FitAddon();
	terminal.loadAddon(fitAddon);
	terminal.open(container);
	terminal.onData(options.onData);

	const fit = () => {
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

	return {
		terminal,
		fit,
		dispose: () => {
			terminal.dispose();
		},
	};
};
