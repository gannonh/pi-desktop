import { extractTextFromPiContent } from "../../shared/pi-session-content";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const commandFromArgs = (args: unknown): string | undefined => {
	if (!isRecord(args) || typeof args.command !== "string") {
		return undefined;
	}

	return args.command.trim() || undefined;
};

const truncate = (value: string, maxLength = 120): string =>
	value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;

const stringifyPayload = (value: unknown): string => {
	if (value === null || value === undefined) {
		return "";
	}

	if (typeof value === "string") {
		return value;
	}

	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
};

export const summarizeToolArgs = (_toolName: string, args: unknown): string => {
	const command = commandFromArgs(args);
	if (command) {
		return truncate(command);
	}

	const serialized = stringifyPayload(args).trim();
	if (!serialized) {
		return "Input unavailable";
	}

	return truncate(serialized.replace(/\s+/g, " "));
};

export const summarizeToolResult = (_toolName: string, result: unknown, isError: boolean): string => {
	if (isError) {
		const text = extractTextFromPiContent(isRecord(result) ? result.content : result).trim();
		return text ? truncate(text) : "Tool failed";
	}

	const command = commandFromArgs(isRecord(result) ? result : undefined);
	if (command) {
		return truncate(command);
	}

	const text = extractTextFromPiContent(isRecord(result) ? result.content : result).trim();
	if (text) {
		return truncate(text.split("\n")[0] ?? text);
	}

	const serialized = stringifyPayload(result).trim();
	return serialized ? truncate(serialized.replace(/\s+/g, " ")) : "Result unavailable";
};

export const getToolOutputText = (_toolName: string, result: unknown): string => {
	if (typeof result === "string") {
		return result;
	}

	if (!isRecord(result)) {
		return stringifyPayload(result);
	}

	const text = extractTextFromPiContent(result.content).trim();
	if (text) {
		return text;
	}

	return stringifyPayload(result);
};

export const isTerminalTool = (toolName: string, args: unknown, result: unknown): boolean => {
	if (toolName === "bash") {
		return true;
	}

	return Boolean(commandFromArgs(args) || commandFromArgs(isRecord(result) ? result : undefined));
};

export const getTerminalOutputText = (args: unknown, result: unknown): string => {
	const command = commandFromArgs(args);
	const output = getToolOutputText("bash", result).trim();

	if (command && output) {
		return `$ ${command}\n${output}`;
	}

	if (command) {
		return `$ ${command}`;
	}

	return output;
};

export const formatToolTimestamp = (value: string): string => {
	const parsed = Date.parse(value);
	if (Number.isNaN(parsed)) {
		return value;
	}

	return new Intl.DateTimeFormat(undefined, {
		hour: "numeric",
		minute: "2-digit",
		second: "2-digit",
	}).format(parsed);
};

export const formatToolPayload = (value: unknown): string => {
	const serialized = stringifyPayload(value).trim();
	return serialized || "Unavailable";
};
