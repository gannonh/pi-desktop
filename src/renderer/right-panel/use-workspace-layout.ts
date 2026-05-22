import { useEffect, useState } from "react";

const NARROW_WORKSPACE_QUERY = "(max-width: 959px)";

export function useWorkspaceLayout() {
	const [isNarrow, setIsNarrow] = useState(() => {
		if (typeof window === "undefined" || !window.matchMedia) {
			return false;
		}
		return window.matchMedia(NARROW_WORKSPACE_QUERY).matches;
	});

	useEffect(() => {
		if (typeof window.matchMedia !== "function") {
			return;
		}

		const media = window.matchMedia(NARROW_WORKSPACE_QUERY);
		const onChange = () => setIsNarrow(media.matches);
		onChange();
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, []);

	return { isNarrow };
}
