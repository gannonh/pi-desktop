import { mapSessionWorkspaceError } from "../../shared/terminal-eligibility";
import { ok, type IpcResult } from "../../shared/result";

export type TerminalCwdResolver = (projectId: string) => Promise<IpcResult<{ cwd: string }>>;

export const createTerminalCwdResolver = (
	getSessionWorkspace: (input: { projectId: string }) => Promise<{ path: string }>,
): TerminalCwdResolver => {
	return async (projectId) => {
		try {
			const workspace = await getSessionWorkspace({ projectId });
			return ok({ cwd: workspace.path });
		} catch (error) {
			return mapSessionWorkspaceError(error);
		}
	};
};
