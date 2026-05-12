import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { getNextNewProjectName } from "../../shared/project-state";

export const getNextScratchProjectPath = async (documentsDir: string): Promise<string> => {
	const entries = await readdir(documentsDir, { withFileTypes: true });
	const existingNames = entries.map((entry) => entry.name);

	return join(documentsDir, getNextNewProjectName(existingNames));
};
