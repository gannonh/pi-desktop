import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { createEmptyProjectStore } from "../../src/shared/project-state";
import { createProjectStore } from "../../src/main/projects/project-store";

const createTempStorePath = async () => join(await mkdtemp(join(tmpdir(), "pi-project-store-")), "state", "store.json");

describe("project store", () => {
	it("creates an empty store when no JSON file exists using createEmptyProjectStore()", async () => {
		const storePath = await createTempStorePath();
		const projectStore = createProjectStore(storePath);

		await expect(projectStore.load()).resolves.toEqual(createEmptyProjectStore());
	});

	it("saves and loads valid project store JSON", async () => {
		const storePath = await createTempStorePath();
		const projectStore = createProjectStore(storePath);
		const store = {
			...createEmptyProjectStore(),
			projects: [
				{
					id: "project:/tmp/pi-desktop",
					displayName: "pi-desktop",
					path: "/tmp/pi-desktop",
					createdAt: "2026-05-12T09:00:00.000Z",
					updatedAt: "2026-05-12T10:00:00.000Z",
					lastOpenedAt: "2026-05-12T10:00:00.000Z",
					pinned: false,
					availability: { status: "available" as const },
				},
			],
			selectedProjectId: "project:/tmp/pi-desktop",
		};

		await projectStore.save(store);

		await expect(projectStore.load()).resolves.toEqual(store);
		await expect(readFile(storePath, "utf8")).resolves.toBe(`${JSON.stringify(store, null, 2)}\n`);
	});

	it("fails visibly on malformed JSON with message containing Unable to parse project store JSON", async () => {
		const storePath = await createTempStorePath();
		await mkdir(dirname(storePath), { recursive: true });
		await writeFile(storePath, "{", "utf8");

		await expect(createProjectStore(storePath).load()).rejects.toThrow(/Unable to parse project store JSON/);
	});

	it("fails visibly on invalid store shape with message containing Project store validation failed", async () => {
		const storePath = await createTempStorePath();
		await mkdir(dirname(storePath), { recursive: true });
		await writeFile(storePath, JSON.stringify({ projects: "invalid" }), "utf8");

		await expect(createProjectStore(storePath).load()).rejects.toThrow(/Project store validation failed/);
	});

	it("fails visibly when the project store JSON cannot be read", async () => {
		const storePath = await mkdtemp(join(tmpdir(), "pi-project-store-directory-"));

		await expect(createProjectStore(storePath).load()).rejects.toThrow(/Unable to read project store JSON/);
	});

	it("fails visibly when saving an invalid project store shape", async () => {
		const storePath = await createTempStorePath();
		const invalidStore = { ...createEmptyProjectStore(), selectedProjectId: "" };

		await expect(createProjectStore(storePath).save(invalidStore)).rejects.toThrow(/Project store validation failed/);
	});
});
