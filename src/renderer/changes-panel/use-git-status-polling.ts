import { useEffect, useRef } from "react";
import { createCoalescedPollRunner } from "./coalesced-poll-runner";

const POLL_INTERVAL_MS = 3_000;

type UseGitStatusPollingInput = {
	enabled: boolean;
	refresh: () => Promise<void>;
};

export const useGitStatusPolling = ({ enabled, refresh }: UseGitStatusPollingInput): void => {
	const refreshRef = useRef(refresh);
	refreshRef.current = refresh;

	useEffect(() => {
		if (!enabled) {
			return;
		}

		const runner = createCoalescedPollRunner(() => refreshRef.current());
		runner.run();
		const intervalId = window.setInterval(() => runner.run(), POLL_INTERVAL_MS);
		return () => {
			window.clearInterval(intervalId);
			runner.dispose();
		};
	}, [enabled, refresh]);
};
