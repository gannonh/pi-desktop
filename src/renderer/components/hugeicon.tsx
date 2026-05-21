import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

interface HugeiconProps {
	icon: IconSvgElement;
	className?: string;
	size?: number;
	strokeWidth?: number;
}

export function Hugeicon({ icon, className, size = 16, strokeWidth = 1.5 }: HugeiconProps) {
	return <HugeiconsIcon icon={icon} size={size} color="currentColor" strokeWidth={strokeWidth} className={className} />;
}
