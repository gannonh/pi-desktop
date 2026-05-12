const major = Number.parseInt(process.versions.node.split(".")[0] ?? "", 10);

if (major !== 24) {
	console.error(`pi-desktop requires Node 24.x. Current version: ${process.version}`);
	process.exit(1);
}
