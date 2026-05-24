import type { ClipboardWriteTextInput, ClipboardWriteTextResult } from "../../shared/ipc";
import { err } from "../../shared/result";

export async function writeBrowserClipboardText({ text }: ClipboardWriteTextInput): Promise<ClipboardWriteTextResult> {
	try {
		await navigator.clipboard.writeText(text);
		return { ok: true, data: { written: true } };
	} catch (error) {
		return err("clipboard.write_failed", error instanceof Error ? error.message : "Clipboard write failed.");
	}
}
