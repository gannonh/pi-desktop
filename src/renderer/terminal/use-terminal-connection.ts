import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from "react";
import type { RefObject } from "react";
import type { ProjectRecord } from "../../shared/project-state";
import type { TerminalEvent } from "../../shared/terminal";
import { createXtermTerminal, type XtermHandle } from "./xterm-instance";
import { createInitialTerminalPanelState, terminalPanelReducer } from "./terminal-state";

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;

export const useTerminalConnection = ({
	project,
	isActive,
	containerRef,
}: {
	project: ProjectRecord | null;
	isActive: boolean;
	containerRef: RefObject<HTMLDivElement | null>;
}) => {
	const [state, dispatch] = useReducer(terminalPanelReducer, undefined, createInitialTerminalPanelState);
	const xtermRef = useRef<XtermHandle | null>(null);
	const activeTerminalIdRef = useRef<string | null>(null);
	const spawnGenerationRef = useRef(0);

	const disposeXterm = useCallback(() => {
		xtermRef.current?.dispose();
		xtermRef.current = null;
	}, []);

	const killActiveTerminal = useCallback(async () => {
		const terminalId = activeTerminalIdRef.current;
		activeTerminalIdRef.current = null;
		if (!terminalId) {
			return;
		}
		await window.piDesktop.terminal.kill({ terminalId });
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: containerRef is a stable ref; reading .current must not re-create spawnTerminal.
	const spawnTerminal = useCallback(
		async (targetProject: ProjectRecord) => {
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
					void window.piDesktop.terminal.write({ terminalId, data });
				},
				onResize: (size) => {
					const terminalId = activeTerminalIdRef.current;
					if (!terminalId) {
						return;
					}
					void window.piDesktop.terminal.resize({ terminalId, cols: size.cols, rows: size.rows });
				},
			});
			xtermRef.current = xterm;
			const initialSize = xterm.fit() ?? { cols: DEFAULT_COLS, rows: DEFAULT_ROWS };

			const result = await window.piDesktop.terminal.spawn({
				projectId: targetProject.id,
				projectPath: targetProject.path,
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
			dispatch({ type: "running", projectId: targetProject.id });
		},
		[disposeXterm],
	);

	useEffect(() => {
		dispatch({ type: "sync-project", project });
	}, [project]);

	useLayoutEffect(() => {
		if (!isActive || !project || project.availability.status !== "available") {
			void killActiveTerminal();
			disposeXterm();
			if (project && project.availability.status === "available" && !isActive) {
				dispatch({ type: "reset-idle" });
			}
			return;
		}

		let cancelled = false;
		const run = async () => {
			await killActiveTerminal();
			if (cancelled) {
				return;
			}
			await spawnTerminal(project);
		};
		void run();

		return () => {
			cancelled = true;
			spawnGenerationRef.current += 1;
			void killActiveTerminal();
			disposeXterm();
		};
	}, [disposeXterm, isActive, killActiveTerminal, project, spawnTerminal]);

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
				activeTerminalIdRef.current = null;
				disposeXterm();
				dispatch({ type: "exited", exitCode: event.code });
				return;
			}
			if (event.type === "error") {
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
			xtermRef.current?.fit();
		});
		observer.observe(container);
		return () => observer.disconnect();
	}, [containerRef, state.phase.kind]);

	const terminate = async () => {
		const terminalId = activeTerminalIdRef.current;
		if (!terminalId) {
			disposeXterm();
			dispatch({ type: "exited", exitCode: 0 });
			return;
		}
		await window.piDesktop.terminal.kill({ terminalId });
		activeTerminalIdRef.current = null;
		disposeXterm();
		dispatch({ type: "exited", exitCode: 0 });
	};

	const restart = async () => {
		if (!project || project.availability.status !== "available" || !isActive) {
			return;
		}
		await killActiveTerminal();
		disposeXterm();
		await spawnTerminal(project);
	};

	return {
		state,
		terminate,
		restart,
	};
};
