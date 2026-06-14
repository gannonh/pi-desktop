import { useRef } from "react";
import type { ProjectRecord } from "../../shared/project-state";
import { Button } from "../components/ui/button";
import { TerminalEmptyStates } from "./terminal-empty-states";
import { useTerminalConnection } from "./use-terminal-connection";

interface TerminalPanelProps {
	project: ProjectRecord | null;
	isActive: boolean;
}

export function TerminalPanel({ project, isActive }: TerminalPanelProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const { state, terminate, restart } = useTerminalConnection({
		project,
		isActive,
		containerRef,
	});

	const showSurface = state.phase.kind === "idle" || state.phase.kind === "starting" || state.phase.kind === "running";
	const projectPath = project?.path ?? null;

	return (
		<div className="terminal-panel" data-testid="workspace-panel-terminal">
			<header className="terminal-panel__header">
				<div className="terminal-panel__meta">
					<span className="terminal-panel__label">cwd</span>
					<span className="terminal-panel__value">{projectPath ?? "No project selected"}</span>
				</div>
				<div className="terminal-panel__actions">
					{state.phase.kind === "running" ? (
						<Button type="button" variant="outline" size="sm" onClick={() => void terminate()}>
							Terminate
						</Button>
					) : null}
					{state.phase.kind === "exited" || state.phase.kind === "error" ? (
						<Button type="button" variant="outline" size="sm" onClick={() => void restart()}>
							Restart shell
						</Button>
					) : null}
				</div>
			</header>

			{showSurface ? (
				<div className="terminal-panel__surface">
					{state.phase.kind === "starting" ? (
						<div className="terminal-panel__status" data-testid="terminal-panel-starting">
							Starting shell...
						</div>
					) : null}
					<div
						ref={containerRef}
						className="terminal-panel__xterm"
						data-testid="terminal-panel-xterm"
						aria-hidden={state.phase.kind !== "running"}
					/>
				</div>
			) : state.phase.kind === "no-project" ||
				state.phase.kind === "project-unavailable" ||
				state.phase.kind === "exited" ||
				state.phase.kind === "error" ? (
				<TerminalEmptyStates phase={state.phase} />
			) : null}
		</div>
	);
}
