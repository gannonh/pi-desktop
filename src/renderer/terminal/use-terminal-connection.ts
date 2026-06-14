import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from "react";
import type { RefObject } from "react";
import type { ProjectRecord } from "../../shared/project-state";
import type { TerminalEvent } from "../../shared/terminal";
import { createXtermTerminal, type XtermHandle } from "./xterm-instance";
import { createInitialTerminalPanelState, terminalPanelReducer } from "./terminal-state";

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const RESIZE_DEBOUNCE_MS = 75;

type SpawnTarget = {
	id: string;
	path: string;
};

export const useTerminalConnection = ({
	project,
	containerRef,
}: {
	project: ProjectRecord | null;
	containerRef: RefObject<HTMLDivElement | null>;
}) => {
	const [state, dispatch] = useReducer(terminalPanelReducer, undefined, createInitialTerminalPanelState);
	const xtermRef = useRef<XtermHandle | null>(null);
	const activeTerminalIdRef = useRef<string | null>(null);
	const userTerminateRef = useRef<string | null>(null);
	const spawnGenerationRef = useRef(0);
	const lastResizeRef = useRef<{ cols: number; rows: number } | null>(null);
	const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const projectId = project?.id ?? null;
	const projectPath = project?.path ?? null;
	const projectAvailability = project?.availability.status ?? null;
	const spawnTarget = useMemo<SpawnTarget | null>(() => {
		if (!projectId || !projectPath || projectAvailability !== "available") {
			return null;
		}
		return { id: projectId, path: projectPath };
	}, [projectAvailability, projectId, projectPath]);

	const disposeXterm = useCallback(() => {
		if (resizeTimerRef.current) {
			clearTimeout(resizeTimerRef.current);
			resizeTimerRef.current = null;
		}
		xtermRef.current?.dispose();
		xtermRef.current = null;
		lastResizeRef.current = null;
	}, []);

	const killActiveTerminal = useCallback(async () => {
		const terminalId = activeTerminalIdRef.current;
		activeTerminalIdRef.current = null;
		userTerminateRef.current = null;
		if (!terminalId) {
			return;
		}
		await window.piDesktop.terminal.kill({ terminalId });
	}, []);

	const setTerminalInputEnabled = useCallback((enabled: boolean) => {
		if (xtermRef.current) {
			xtermRef.current.terminal.options.disableStdin = !enabled;
		}
	}, []);

	const sendResize = useCallback((size: { cols: number; rows: number }) => {
		const terminalId = activeTerminalIdRef.current;
		if (!terminalId) {
			return;
		}
		const last = lastResizeRef.current;
		if (last && last.cols === size.cols && last.rows === size.rows) {
			return;
		}
		lastResizeRef.current = size;
		void window.piDesktop.terminal.resize({ terminalId, cols: size.cols, rows: size.rows });
	}, []);

	const spawnTerminal = useCallback(
		async (targetProject: SpawnTarget) => {
			const generation = ++spawnGenerationRef.current;
			dispatch({ type: "start", projectId: targetProject.id });

			const container = containerRef.current;
			if (!container) {
				dispatch({ type: "error", message: "Terminal surface is not ready." });
				return;
			}

			disposeXterm();
			const xterm = createXtermTerminal(container, {
				onData: (data) => {
					const terminalId = activeTerminalIdRef.current;
					if (!terminalId) {
						return;
					}
					window.piDesktop.terminal.write({ terminalId, data });
				},
				onResize: (size) => {
					sendResize(size);
				},
			});
			xtermRef.current = xterm;
			setTerminalInputEnabled(false);
			const initialSize = xterm.fit() ?? { cols: DEFAULT_COLS, rows: DEFAULT_ROWS };

			const result = await window.piDesktop.terminal.spawn({
				projectId: targetProject.id,
				cols: initialSize.cols,
				rows: initialSize.rows,
			});

			if (generation !== spawnGenerationRef.current) {
				if (result.ok) {
					await window.piDesktop.terminal.kill({ terminalId: result.data.terminalId });
				}
				return;
			}

			if (!result.ok) {
				disposeXterm();
				dispatch({ type: "error", message: result.error.message });
				return;
			}

			activeTerminalIdRef.current = result.data.terminalId;
			lastResizeRef.current = initialSize;
			setTerminalInputEnabled(true);
			dispatch({ type: "running", projectId: targetProject.id });
		},
		[containerRef, disposeXterm, sendResize, setTerminalInputEnabled],
	);

	useEffect(() => {
		dispatch({ type: "sync-project", project });
	}, [project]);

	useLayoutEffect(() => {
		if (!spawnTarget) {
			void killActiveTerminal();
			disposeXterm();
			return;
		}

		let cancelled = false;
		const run = async () => {
			await killActiveTerminal();
			if (cancelled) {
				return;
			}
			await spawnTerminal(spawnTarget);
		};
		void run();

		return () => {
			cancelled = true;
			spawnGenerationRef.current += 1;
			void killActiveTerminal();
			disposeXterm();
		};
	}, [disposeXterm, killActiveTerminal, spawnTarget, spawnTerminal]);

	useEffect(() => {
		const unsubscribe = window.piDesktop.terminal.onEvent((event: TerminalEvent) => {
			if (event.terminalId !== activeTerminalIdRef.current) {
				return;
			}
			if (event.type === "data") {
				xtermRef.current?.terminal.write(event.data);
				return;
			}
			if (event.type === "exit") {
				const wasUserTerminate = userTerminateRef.current === event.terminalId;
				userTerminateRef.current = null;
				activeTerminalIdRef.current = null;
				disposeXterm();
				dispatch(wasUserTerminate ? { type: "terminated" } : { type: "exited", exitCode: event.code });
				return;
			}
			if (event.type === "error") {
				userTerminateRef.current = null;
				activeTerminalIdRef.current = null;
				disposeXterm();
				dispatch({ type: "error", message: event.message });
			}
		});
		return unsubscribe;
	}, [disposeXterm]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container || state.phase.kind !== "running") {
			return;
		}

		const observer = new ResizeObserver(() => {
			if (resizeTimerRef.current) {
				clearTimeout(resizeTimerRef.current);
			}
			resizeTimerRef.current = setTimeout(() => {
				const size = xtermRef.current?.fit();
				if (size) {
					sendResize(size);
				}
			}, RESIZE_DEBOUNCE_MS);
		});
		observer.observe(container);
		return () => {
			observer.disconnect();
			if (resizeTimerRef.current) {
				clearTimeout(resizeTimerRef.current);
				resizeTimerRef.current = null;
			}
		};
	}, [containerRef, sendResize, state.phase.kind]);

	const terminate = async () => {
		const terminalId = activeTerminalIdRef.current;
		if (!terminalId) {
			disposeXterm();
			dispatch({ type: "terminated" });
			return;
		}
		userTerminateRef.current = terminalId;
		setTerminalInputEnabled(false);
		await window.piDesktop.terminal.kill({ terminalId });
	};

	const restart = async () => {
		if (!spawnTarget) {
			return;
		}
		await killActiveTerminal();
		disposeXterm();
		await spawnTerminal(spawnTarget);
	};

	return {
		state,
		terminate,
		restart,
	};
};
