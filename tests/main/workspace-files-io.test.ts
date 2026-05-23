import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { WORKSPACE_FILES_MAX_BYTES } from "../../src/shared/workspace-files";
import { readWorkspaceFile, writeWorkspaceFile } from "../../src/main/workspace-files/workspace-files-service";

describe("workspace files io", () => {
	let tempRoot = "";

	afterEach(async () => {
		if (tempRoot) {
			const { rm } = await import("node:fs/promises");
			await rm(tempRoot, { recursive: true, force: true });
			tempRoot = "";
		}
	});

	const createProject = async () => {
		tempRoot = await mkdtemp(join(tmpdir(), "pi-desktop-workspace-io-"));
		await writeFile(join(tempRoot, "editable.txt"), "initial\n", "utf8");
		return tempRoot;
	};

	it("reads and writes text files", async () => {
		const projectRoot = await createProject();
		const readInitial = await readWorkspaceFile(projectRoot, "editable.txt");
		expect(readInitial).toEqual({ kind: "text", content: "initial\n", size: 8 });

		await writeWorkspaceFile(projectRoot, "editable.txt", "updated\n");
		const disk = await readFile(join(projectRoot, "editable.txt"), "utf8");
		expect(disk).toBe("updated\n");
	});

	it("detects binary files", async () => {
		const projectRoot = await createProject();
		await writeFile(join(projectRoot, "data.txt"), Buffer.from([97, 0, 98]));

		const result = await readWorkspaceFile(projectRoot, "data.txt");
		expect(result).toEqual({ kind: "binary" });
	});

	it("returns too_large for oversized files", async () => {
		const projectRoot = await createProject();
		const big = Buffer.alloc(WORKSPACE_FILES_MAX_BYTES + 1, 97);
		await writeFile(join(projectRoot, "big.txt"), big);

		const result = await readWorkspaceFile(projectRoot, "big.txt");
		expect(result).toEqual({ kind: "too_large", size: WORKSPACE_FILES_MAX_BYTES + 1 });
	});

	it("returns unsupported for unknown extensions", async () => {
		const projectRoot = await createProject();
		await writeFile(join(projectRoot, "image.png"), Buffer.from([1, 2, 3]));

		const result = await readWorkspaceFile(projectRoot, "image.png");
		expect(result).toEqual({ kind: "unsupported" });
	});

	it("rejects writes above the size limit", async () => {
		const projectRoot = await createProject();
		const content = "a".repeat(WORKSPACE_FILES_MAX_BYTES + 1);
		await expect(writeWorkspaceFile(projectRoot, "editable.txt", content)).rejects.toThrow(/byte limit/);
	});
});
