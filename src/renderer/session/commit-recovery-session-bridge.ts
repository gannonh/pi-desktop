export type CommitRecoverySessionRequest = {
	projectId: string;
	prompt: string;
};

export type CommitRecoverySessionHandler = (request: CommitRecoverySessionRequest) => Promise<boolean>;

let commitRecoverySessionHandler: CommitRecoverySessionHandler | null = null;

export const registerCommitRecoverySessionHandler = (handler: CommitRecoverySessionHandler | null): void => {
	commitRecoverySessionHandler = handler;
};

export const requestCommitRecoverySession = async (request: CommitRecoverySessionRequest): Promise<boolean> => {
	if (!commitRecoverySessionHandler) {
		return false;
	}
	return commitRecoverySessionHandler(request);
};
