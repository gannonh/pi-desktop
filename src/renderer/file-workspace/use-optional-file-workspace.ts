import { useContext } from "react";
import { FileWorkspaceContext } from "./file-workspace-context";

export const useOptionalFileWorkspace = () => {
	const context = useContext(FileWorkspaceContext);
	return context;
};
