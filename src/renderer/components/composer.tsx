import { ArrowUp, Mic, Plus } from "lucide-react";

interface ComposerProps {
	projectSelectorLabel: string;
	disabledReason: string;
}

export function Composer({ projectSelectorLabel, disabledReason }: ComposerProps) {
	return (
		<form
			className="composer"
			aria-label="Pi composer"
			aria-describedby="composer-disabled-reason"
			onSubmit={(event) => event.preventDefault()}
		>
			<div className="composer__input-row">
				<button className="composer__icon-button" type="button" disabled aria-label="Add context">
					<Plus className="composer__icon" />
				</button>
				<div className="composer__placeholder">Ask Pi anything. @ to use skills or mention files</div>
				<button className="composer__icon-button" type="button" disabled aria-label="Voice input">
					<Mic className="composer__icon" />
				</button>
				<button className="composer__send-button" type="button" disabled aria-label="Send message">
					<ArrowUp className="composer__icon" />
				</button>
			</div>
			<div className="composer__footer">
				<button className="composer__project-selector" type="button" disabled>
					{projectSelectorLabel}
				</button>
				<span id="composer-disabled-reason" className="composer__disabled-reason">
					{disabledReason}
				</span>
			</div>
		</form>
	);
}
