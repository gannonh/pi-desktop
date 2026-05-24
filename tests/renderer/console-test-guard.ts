import { expect, vi } from "vitest";

export type ConsoleMessage = {
	method: "error" | "warn";
	input: unknown[];
};

export function ensureRangeClientRects(): void {
	if (Reflect.has(Range.prototype, "getClientRects")) {
		return;
	}

	Range.prototype.getClientRects = () =>
		({
			length: 0,
			item: () => null,
			[Symbol.iterator]: function* iterator() {},
		}) as DOMRectList;
}

export function captureConsoleMessages(): ConsoleMessage[] {
	const consoleMessages: ConsoleMessage[] = [];
	vi.spyOn(console, "error").mockImplementation((...input) => {
		consoleMessages.push({ method: "error", input });
	});
	vi.spyOn(console, "warn").mockImplementation((...input) => {
		consoleMessages.push({ method: "warn", input });
	});
	return consoleMessages;
}

export function expectNoUnexpectedConsoleMessages(
	consoleMessages: ConsoleMessage[],
	isExpectedMessage: (message: ConsoleMessage) => boolean = () => false,
): void {
	const unexpectedMessages = consoleMessages.filter((message) => !isExpectedMessage(message));
	vi.restoreAllMocks();

	expect(unexpectedMessages.map(formatConsoleMessage)).toEqual([]);
}

export function isKnownMdxEditorActWarning(
	knownComponents: ReadonlySet<string>,
	{ method, input }: ConsoleMessage,
): boolean {
	return (
		method === "error" &&
		typeof input[0] === "string" &&
		input[0].startsWith("An update to %s inside a test was not wrapped in act(...).") &&
		typeof input[1] === "string" &&
		knownComponents.has(input[1])
	);
}

export function isKnownFileWorkspaceSelectionWarning({ method, input }: ConsoleMessage): boolean {
	return (
		method === "error" &&
		typeof input[0] === "string" &&
		input[0].startsWith("Cannot update a component (`%s`) while rendering a different component (`%s`).") &&
		input[1] === "RightPanelProvider" &&
		input[2] === "FileWorkspaceProvider"
	);
}

function formatConsoleMessage({ method, input }: ConsoleMessage): string {
	return `${method}: ${input.map((entry) => (entry instanceof Error ? (entry.stack ?? entry.message) : String(entry))).join(" ")}`;
}
