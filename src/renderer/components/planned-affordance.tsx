import type { ReactNode } from "react";
import {
	formatPlannedTooltip,
	PLANNED_AFFORDANCES,
	SHOW_PLANNED_AFFORDANCES,
	type PlannedAffordanceId,
} from "../dev/planned-affordances";
import { cn } from "../lib/utils";

interface PlannedAffordanceProps {
	id: PlannedAffordanceId;
	children: ReactNode;
	className?: string;
	showLabel?: boolean;
}

export function PlannedAffordance({ id, children, className, showLabel = true }: PlannedAffordanceProps) {
	if (!SHOW_PLANNED_AFFORDANCES) {
		return null;
	}

	const definition = PLANNED_AFFORDANCES[id];

	return (
		<span
			className={cn("planned-affordance", className)}
			title={formatPlannedTooltip(definition)}
			aria-disabled="true"
		>
			{children}
			{showLabel ? <span className="planned-affordance__label">Planned</span> : null}
		</span>
	);
}

interface PlannedAffordanceButtonProps {
	id: PlannedAffordanceId;
	className?: string;
	children: ReactNode;
	"aria-label"?: string;
	showLabel?: boolean;
}

export function PlannedAffordanceButton({
	id,
	className,
	children,
	"aria-label": ariaLabel,
	showLabel = false,
}: PlannedAffordanceButtonProps) {
	if (!SHOW_PLANNED_AFFORDANCES) {
		return null;
	}

	const definition = PLANNED_AFFORDANCES[id];
	const title = formatPlannedTooltip(definition);

	return (
		<span className={cn("planned-affordance", "planned-affordance--button", className)} title={title}>
			<button
				type="button"
				className="planned-affordance__control"
				disabled
				tabIndex={-1}
				aria-disabled="true"
				aria-label={ariaLabel ?? definition.label}
			>
				{children}
			</button>
			{showLabel ? <span className="planned-affordance__label">Planned</span> : null}
		</span>
	);
}

interface PlannedAffordanceMenuItemProps {
	id: PlannedAffordanceId;
	children: ReactNode;
	className?: string;
}

export function PlannedAffordanceMenuItem({ id, children, className }: PlannedAffordanceMenuItemProps) {
	if (!SHOW_PLANNED_AFFORDANCES) {
		return null;
	}

	const definition = PLANNED_AFFORDANCES[id];

	return (
		<div
			className={cn("planned-affordance", "planned-affordance--menu-item", className)}
			title={formatPlannedTooltip(definition)}
			aria-disabled="true"
		>
			{children}
			<span className="planned-affordance__label">Planned</span>
		</div>
	);
}
