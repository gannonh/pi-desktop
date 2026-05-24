import type { ClipboardWriteTextInput, ClipboardWriteTextResult } from "../../shared/ipc";

export async function writeBrowserClipboardText({ text }: ClipboardWriteTextInput): Promise<ClipboardWriteTextResult> {
	await navigator.clipboard.writeText(text);
	return { ok: true, data: { written: true } };
}
