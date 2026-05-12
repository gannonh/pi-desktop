import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getNextScratchProjectPath } from "../../src/main/projects/project-paths";

const createDocumentsDir = async () => mkdtemp(join(tmpdir(), "pi-documents-"));

describe("project paths", () => {
	it("returns documentsDir/New project when available", async () => {
		const documentsDir = await createDocumentsDir();

		await expect(getNextScratchProjectPath(documentsDir)).resolves.toBe(join(documentsDir, "New project"));
	});

	it("returns documentsDir/New project 3 when New project and New project 2 exist", async () => {
		const documentsDir = await createDocumentsDir();
		await mkdir(join(documentsDir, "New project"));
		await mkdir(join(documentsDir, "New project 2"));

		await expect(getNextScratchProjectPath(documentsDir)).resolves.toBe(join(documentsDir, "New project 3"));
	});

	it("returns documentsDir/New project 2 when New project exists as a file", async () => {
		const documentsDir = await createDocumentsDir();
		await writeFile(join(documentsDir, "New project"), "", "utf8");

		await expect(getNextScratchProjectPath(documentsDir)).resolves.toBe(join(documentsDir, "New project 2"));
	});
});
