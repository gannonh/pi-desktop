import { useCallback, useLayoutEffect, useRef, useState } from "react";

export const PIN_THRESHOLD_PX = 48;

export const isNearScrollBottom = (
	scrollTop: number,
	scrollHeight: number,
	clientHeight: number,
	threshold = PIN_THRESHOLD_PX,
) => scrollHeight - scrollTop - clientHeight <= threshold;

export type StickToBottomScrollTrigger = {
	messageCount: number;
	streamingMessageCount: number;
	lastMessageKey: string;
	sessionStatus: string;
	hydrationStatus: string;
};

export const useStickToBottomScroll = (trigger: StickToBottomScrollTrigger) => {
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

	const scrollTriggerKey = `${trigger.messageCount}:${trigger.streamingMessageCount}:${trigger.lastMessageKey}:${trigger.sessionStatus}:${trigger.hydrationStatus}`;

	// biome-ignore lint/correctness/useExhaustiveDependencies: scrollTriggerKey encodes transcript changes that should re-pin scroll.
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
