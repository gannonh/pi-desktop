import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { GitStatusPayload } from "../../shared/source-control/schemas";
import type { SourceControlGhAuthStatus, SourceControlPullRequestInfo } from "../../shared/source-control/types";
import { useGitStatusPolling } from "./use-git-status-polling";

export type ChangesPanelContextValue = {
	projectId: string | null;
	defaultBaseRef: string;
	status: GitStatusPayload | null;
	statusError: string | null;
	isRefreshing: boolean;
	isGitRepo: boolean | null;
	pullRequest: SourceControlPullRequestInfo | null;
	pullRequestLookupError: string | null;
	ghAuthStatus: SourceControlGhAuthStatus | null;
	refresh: () => Promise<void>;
	initializeRepository: () => Promise<void>;
	setPullRequest: (pullRequest: SourceControlPullRequestInfo | null) => void;
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
	defaultBaseRef: string;
	isActive: boolean;
	children: ReactNode;
};

export function ChangesPanelProvider({ projectId, defaultBaseRef, isActive, children }: ChangesPanelProviderProps) {
	const [status, setStatus] = useState<GitStatusPayload | null>(null);
	const [statusError, setStatusError] = useState<string | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isGitRepo, setIsGitRepo] = useState<boolean | null>(null);
	const [pullRequest, setPullRequest] = useState<SourceControlPullRequestInfo | null>(null);
	const [pullRequestLookupError, setPullRequestLookupError] = useState<string | null>(null);
	const [ghAuthStatus, setGhAuthStatus] = useState<SourceControlGhAuthStatus | null>(null);
	const currentProjectIdRef = useRef(projectId);
	const refreshRequestIdRef = useRef(0);

	useEffect(() => {
		currentProjectIdRef.current = projectId;
		refreshRequestIdRef.current += 1;
		setStatus(null);
		setStatusError(null);
		setIsGitRepo(null);
		setPullRequest(null);
		setPullRequestLookupError(null);
		setGhAuthStatus(null);
	}, [projectId]);

	const refreshGhAuthStatus = useCallback(async (requestProjectId: string, requestId: number) => {
		const result = await window.piDesktop.sourceControl.getGhAuthStatus();
		if (currentProjectIdRef.current !== requestProjectId || refreshRequestIdRef.current !== requestId) {
			return;
		}
		setGhAuthStatus(result.ok ? result.data : null);
	}, []);

	const refresh = useCallback(async () => {
		if (!projectId) {
			setStatus(null);
			setStatusError(null);
			setIsGitRepo(null);
			setGhAuthStatus(null);
			return;
		}

		setIsRefreshing(true);
		const requestId = refreshRequestIdRef.current + 1;
		refreshRequestIdRef.current = requestId;
		const requestProjectId = projectId;
		try {
			const result = await window.piDesktop.sourceControl.getStatus({ projectId: requestProjectId });
			if (currentProjectIdRef.current !== requestProjectId || refreshRequestIdRef.current !== requestId) {
				return;
			}
			if (!result.ok) {
				const message = result.error.message;
				setStatus(null);
				setStatusError(message);
				const notGitRepo = result.error.code === "source_control.not_a_git_repo";
				setIsGitRepo(notGitRepo ? false : null);
				if (notGitRepo) {
					setGhAuthStatus(null);
				}
				return;
			}
			setStatus(result.data);
			setStatusError(null);
			setIsGitRepo(true);
			await refreshGhAuthStatus(requestProjectId, requestId);
		} finally {
			if (currentProjectIdRef.current === projectId && refreshRequestIdRef.current === requestId) {
				setIsRefreshing(false);
			}
		}
	}, [projectId, refreshGhAuthStatus]);

	const initializeRepository = useCallback(async () => {
		if (!projectId) {
			return;
		}
		const result = await window.piDesktop.sourceControl.initializeRepository({ projectId });
		if (!result.ok) {
			setStatusError(result.error.message);
			setIsGitRepo(null);
			return;
		}
		await refresh();
	}, [projectId, refresh]);

	useGitStatusPolling({ enabled: isActive && Boolean(projectId), refreshKey: projectId, refresh });

	const pullRequestBranchKey = status?.branch ?? status?.head ?? null;
	const pullRequestLookupKey = projectId && status ? `${projectId}:${pullRequestBranchKey ?? ""}` : null;

	useEffect(() => {
		if (!projectId || !pullRequestLookupKey) {
			setPullRequest(null);
			setPullRequestLookupError(null);
			return;
		}
		let cancelled = false;
		setPullRequest(null);
		setPullRequestLookupError(null);
		void window.piDesktop.sourceControl.getPullRequestInfo({ projectId }).then((result) => {
			if (cancelled) {
				return;
			}
			if (result.ok) {
				setPullRequest(result.data);
				setPullRequestLookupError(null);
				return;
			}
			if (result.error.code === "source_control.no_linked_pull_request") {
				setPullRequestLookupError(null);
				return;
			}
			setPullRequest(null);
			setPullRequestLookupError(result.error.message);
		});
		return () => {
			cancelled = true;
		};
	}, [projectId, pullRequestLookupKey]);

	const value = useMemo(
		() => ({
			projectId,
			defaultBaseRef,
			status,
			statusError,
			isRefreshing,
			isGitRepo,
			pullRequest,
			pullRequestLookupError,
			ghAuthStatus,
			refresh,
			initializeRepository,
			setPullRequest,
		}),
		[
			projectId,
			defaultBaseRef,
			status,
			statusError,
			isRefreshing,
			isGitRepo,
			pullRequest,
			pullRequestLookupError,
			ghAuthStatus,
			refresh,
			initializeRepository,
		],
	);

	return <ChangesPanelContext.Provider value={value}>{children}</ChangesPanelContext.Provider>;
}
