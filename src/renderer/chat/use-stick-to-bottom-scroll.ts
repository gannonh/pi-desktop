import { useCallback, useLayoutEffect, useRef, useState } from "react";

export const PIN_THRESHOLD_PX = 48;

export const isNearScrollBottom = (
	scrollTop: number,
	scrollHeight: number,
	clientHeight: number,
	threshold = PIN_THRESHOLD_PX,
) => scrollHeight - scrollTop - clientHeight <= threshold;

export const useStickToBottomScroll = (scrollTriggerKey: string) => {
	const scrollRef = useRef<HTMLDivElement>(null);
	const isPinnedRef = useRef(true);
	const [showJumpToLatest, setShowJumpToLatest] = useState(false);

	const scrollToBottom = useCallback(() => {
		const element = scrollRef.current;
		if (!element) {
			return;
		}

		element.scrollTop = element.scrollHeight;
		isPinnedRef.current = true;
		setShowJumpToLatest(false);
	}, []);

	const handleScroll = useCallback(() => {
		const element = scrollRef.current;
		if (!element) {
			return;
		}

		const pinned = isNearScrollBottom(element.scrollTop, element.scrollHeight, element.clientHeight);
		isPinnedRef.current = pinned;
		setShowJumpToLatest(!pinned);
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scrollTriggerKey intentionally reruns the pinned scroll effect.
	useLayoutEffect(() => {
		if (!isPinnedRef.current) {
			return;
		}

		scrollToBottom();
	}, [scrollTriggerKey, scrollToBottom]);

	return {
		scrollRef,
		showJumpToLatest,
		scrollToBottom,
		onScroll: handleScroll,
	};
};
