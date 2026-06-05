import { vi } from "vitest";
import type { SessionCommandPaletteActions } from "../../src/renderer/chat/session-command-palette";

export function createMockSessionCommandPaletteActions(
	overrides: Partial<SessionCommandPaletteActions> = {},
): SessionCommandPaletteActions {
	return {
		onNewSession: vi.fn(),
		onRenameSession: vi.fn(),
		onShowSessionInfo: vi.fn(),
		onForkSession: vi.fn(),
		onCloneSession: vi.fn(),
		onShowPaletteNotice: vi.fn(),
		...overrides,
	};
}
