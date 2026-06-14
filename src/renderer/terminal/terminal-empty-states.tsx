import type { TerminalPanelPhase } from "./terminal-state";

interface TerminalEmptyStatesProps {
	phase: Extract<
		TerminalPanelPhase,
		{ kind: "no-project" } | { kind: "project-unavailable" } | { kind: "exited" } | { kind: "error" }
	>;
	onRestart?: () => void;
}

export function TerminalEmptyStates({ phase, onRestart }: TerminalEmptyStatesProps) {
	switch (phase.kind) {
		case "no-project":
			return (
				<div className="terminal-panel__empty" data-testid="terminal-panel-no-project">
					<h2 className="terminal-panel__empty-title">Select a project</h2>
					<p className="terminal-panel__empty-copy">Choose a project in the sidebar to open its terminal.</p>
				</div>
			);
		case "project-unavailable":
			return (
				<div className="terminal-panel__empty" data-testid="terminal-panel-unavailable-project">
					<h2 className="terminal-panel__empty-title">Project unavailable</h2>
					<p className="terminal-panel__empty-copy">{phase.message}</p>
				</div>
			);
		case "exited":
			return (
				<div className="terminal-panel__empty" data-testid="terminal-panel-exited">
					<h2 className="terminal-panel__empty-title">Terminal exited</h2>
					<p className="terminal-panel__empty-copy">The shell exited with code {phase.exitCode}.</p>
					{onRestart ? (
						<button type="button" className="terminal-panel__action" onClick={onRestart}>
							Restart shell
						</button>
					) : null}
				</div>
			);
		case "error":
			return (
				<div className="terminal-panel__empty" data-testid="terminal-panel-error">
					<h2 className="terminal-panel__empty-title">Terminal unavailable</h2>
					<p className="terminal-panel__empty-copy">{phase.message}</p>
					{onRestart ? (
						<button type="button" className="terminal-panel__action" onClick={onRestart}>
							Try again
						</button>
					) : null}
				</div>
			);
	}
}
