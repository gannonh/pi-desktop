import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname } from "node:path";
import type { ZodError } from "zod";
import { createEmptyProjectStore, ProjectStoreSchema, type ProjectStore } from "../../shared/project-state";

export type ProjectStoreFile = {
	load: () => Promise<ProjectStore>;
	save: (store: ProjectStore) => Promise<void>;
};

const isMissingFileError = (error: unknown): boolean =>
	typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";

const formatValidationError = (error: ZodError): string => error.issues.map((issue) => issue.message).join("; ");

const syncDirectory = async (directoryPath: string): Promise<void> => {
	const directory = await open(directoryPath, "r");
	try {
		await directory.sync();
	} finally {
		await directory.close();
	}
};

export const createProjectStore = (storePath: string): ProjectStoreFile => ({
	async load() {
		let contents: string;

		try {
			contents = await readFile(storePath, "utf8");
		} catch (error) {
			if (isMissingFileError(error)) {
				return createEmptyProjectStore();
			}

			throw new Error(
				`Unable to read project store JSON: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(contents);
		} catch (error) {
			throw new Error(
				`Unable to parse project store JSON: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		const result = ProjectStoreSchema.safeParse(parsed);
		if (!result.success) {
			throw new Error(`Project store validation failed: ${formatValidationError(result.error)}`);
		}

		return result.data;
	},

	async save(store) {
		const result = ProjectStoreSchema.safeParse(store);
		if (!result.success) {
			throw new Error(`Project store validation failed: ${formatValidationError(result.error)}`);
		}

		const storeDirectory = dirname(storePath);
		const tempPath = `${storePath}.tmp-${process.pid}-${Date.now()}`;
		await mkdir(storeDirectory, { recursive: true });
		try {
			const tempFile = await open(tempPath, "w");
			try {
				await tempFile.writeFile(`${JSON.stringify(result.data, null, 2)}\n`, "utf8");
				await tempFile.sync();
			} finally {
				await tempFile.close();
			}
			await rename(tempPath, storePath);
			await syncDirectory(storeDirectory);
		} finally {
			await rm(tempPath, { force: true });
		}
	},
});
