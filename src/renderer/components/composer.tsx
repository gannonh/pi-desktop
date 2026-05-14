import {
	ArrowUp,
	ChevronDown,
	GitBranch,
	Laptop,
	Mic,
	Paperclip,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type { ComposerContext } from "../chat/chat-view-model";
import { createComposerState } from "../chat/composer-state";

interface ComposerProps {
	context: ComposerContext;
	layout?: "center" | "bottom";
}

type ComposerMenu = "project" | "mode" | "access" | "model" | null;

const inputHint = "Ask Pi anything. @ to use skills or mention files";

export function Composer({ context, layout = "center" }: ComposerProps) {
	const statusId = useId();
	const [text, setText] = useState("");
	const [openMenu, setOpenMenu] = useState<ComposerMenu>(null);
	const state = createComposerState({
		text,
		runtimeAvailable: context.runtimeAvailable,
		disabledReason: context.disabledReason,
	});

	const toggleMenu = (menu: Exclude<ComposerMenu, null>) => {
		setOpenMenu((current) => (current === menu ? null : menu));
	};

	return (
		<form
			className={["composer", `composer--${layout}`].join(" ")}
			aria-label="Pi composer"
			aria-describedby={state.statusLabel ? statusId : undefined}
			onSubmit={(event) => event.preventDefault()}
		>
			<div className="composer__input-row">
				<button className="composer__icon-button" type="button" aria-label="Add context" disabled>
					<Paperclip className="composer__icon" />
				</button>
				<textarea
					className="composer__textarea"
					aria-label="Message Pi"
					value={text}
					onChange={(event) => setText(event.target.value)}
					placeholder={inputHint}
					rows={1}
				/>
				<button className="composer__icon-button" type="button" aria-label="Voice input" disabled>
					<Mic className="composer__icon" />
				</button>
				<button className="composer__send-button" type="submit" disabled={state.sendDisabled} aria-label="Send message">
					<ArrowUp className="composer__icon" />
				</button>
			</div>
			<div className="composer__control-row">
				<ComposerControl
					label={context.projectSelectorLabel}
					menu="project"
					openMenu={openMenu}
					icon={<Sparkles className="composer__control-icon" />}
					onToggle={toggleMenu}
				/>
				<ComposerControl
					label={context.modeLabel}
					menu="mode"
					openMenu={openMenu}
					icon={<Laptop className="composer__control-icon" />}
					onToggle={toggleMenu}
				/>
				{context.branchLabel ? (
					<span className="composer__branch-label">
						<GitBranch className="composer__control-icon" />
						{context.branchLabel}
					</span>
				) : null}
				<span className="composer__control-spacer" />
				<ComposerControl
					label={context.accessLabel}
					menu="access"
					openMenu={openMenu}
					icon={<ShieldCheck className="composer__control-icon" />}
					onToggle={toggleMenu}
				/>
				<ComposerControl label={context.modelLabel} menu="model" openMenu={openMenu} onToggle={toggleMenu} />
				{state.statusLabel ? (
					<span id={statusId} className="composer__disabled-reason">
						{state.statusLabel}
					</span>
				) : null}
			</div>
		</form>
	);
}

interface ComposerControlProps {
	label: string;
	menu: Exclude<ComposerMenu, null>;
	openMenu: ComposerMenu;
	icon?: ReactNode;
	onToggle: (menu: Exclude<ComposerMenu, null>) => void;
}

function ComposerControl({ label, menu, openMenu, icon, onToggle }: ComposerControlProps) {
	const open = openMenu === menu;

	return (
		<span className="composer__control-wrap">
			<button
				className="composer__control"
				type="button"
				aria-expanded={open}
				onClick={() => onToggle(menu)}
			>
				{icon}
				<span className="composer__control-label">{label}</span>
				<ChevronDown className="composer__control-icon" />
			</button>
			{open ? (
				<span className="composer__local-menu" role="menu">
					<span className="composer__local-menu-item" role="menuitem">
						{label}
					</span>
				</span>
			) : null}
		</span>
	);
}
