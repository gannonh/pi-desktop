import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { GitStatusPayload } from "../../shared/source-control/schemas";
import { useGitStatusPolling } from "./use-git-status-polling";

export type ChangesPanelContextValue = {
	projectId: string | null;
	status: GitStatusPayload | null;
	statusError: string | null;
	isRefreshing: boolean;
	isGitRepo: boolean | null;
	refresh: () => Promise<void>;
	initializeRepository: () => Promise<void>;
};

const ChangesPanelContext = createContext<ChangesPanelContextValue | null>(null);

export const useChangesPanel = (): ChangesPanelContextValue => {
	const value = useContext(ChangesPanelContext);
	if (!value) {
		throw new Error("useChangesPanel must be used within ChangesPanelProvider.");
	}
	return value;
};

type ChangesPanelProviderProps = {
	projectId: string | null;
	isActive: boolean;
	children: ReactNode;
};

export function ChangesPanelProvider({ projectId, isActive, children }: ChangesPanelProviderProps) {
	const [status, setStatus] = useState<GitStatusPayload | null>(null);
	const [statusError, setStatusError] = useState<string | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isGitRepo, setIsGitRepo] = useState<boolean | null>(null);

	const refresh = useCallback(async () => {
		if (!projectId) {
			setStatus(null);
			setStatusError(null);
			setIsGitRepo(null);
			return;
		}

		setIsRefreshing(true);
		try {
			const result = await window.piDesktop.sourceControl.getStatus({ projectId });
			if (!result.ok) {
				const message = result.error.message;
				setStatus(null);
				setStatusError(message);
				setIsGitRepo(message.toLowerCase().includes("not a git repository") ? false : null);
				return;
			}
			setStatus(result.data);
			setStatusError(null);
			setIsGitRepo(true);
		} finally {
			setIsRefreshing(false);
		}
	}, [projectId]);

	const initializeRepository = useCallback(async () => {
		if (!projectId) {
			return;
		}
		const result = await window.piDesktop.sourceControl.initializeRepository({ projectId });
		if (!result.ok) {
			setStatusError(result.error.message);
			return;
		}
		await refresh();
	}, [projectId, refresh]);

	useGitStatusPolling({ enabled: isActive && Boolean(projectId), refresh });

	const value = useMemo(
		() => ({
			projectId,
			status,
			statusError,
			isRefreshing,
			isGitRepo,
			refresh,
			initializeRepository,
		}),
		[projectId, status, statusError, isRefreshing, isGitRepo, refresh, initializeRepository],
	);

	return <ChangesPanelContext.Provider value={value}>{children}</ChangesPanelContext.Provider>;
}
