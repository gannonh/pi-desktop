import type * as React from "react";

import { cn } from "@/renderer/lib/utils";

type MenuSurfaceVariant = "popover" | "context";

interface MenuSurfaceProps extends React.ComponentProps<"div"> {
	variant?: MenuSurfaceVariant;
}

interface MenuItemProps extends React.ComponentProps<"button"> {
	inactive?: boolean;
	tone?: "default" | "danger";
}

export function MenuAnchor({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("menu-anchor", className)} {...props} />;
}

export function MenuSurface({ className, variant = "popover", ...props }: MenuSurfaceProps) {
	return <div role="menu" className={cn("menu", `menu--${variant}`, className)} {...props} />;
}

export function MenuItem({ className, inactive = false, tone = "default", ...props }: MenuItemProps) {
	return (
		<button
			role="menuitem"
			className={cn("menu__item", `menu__item--${tone}`, inactive ? "menu__item--inactive" : "", className)}
			type="button"
			{...props}
		/>
	);
}

export function MenuItemIcon({ className, ...props }: React.ComponentProps<"span">) {
	return <span className={cn("menu__item-icon", className)} aria-hidden="true" {...props} />;
}

export function MenuSelectionIndicator({ className, ...props }: React.ComponentProps<"span">) {
	return <span className={cn("menu__selection-indicator", className)} aria-hidden="true" {...props} />;
}

export function MenuSectionHeading({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("menu__section-heading", className)} {...props} />;
}

export function MenuSeparator({ className, ...props }: React.ComponentProps<"hr">) {
	return <hr className={cn("menu__separator", className)} {...props} />;
}
