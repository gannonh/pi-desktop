import type { PiDesktopApi } from "../shared/preload-api";

declare global {
	interface Window {
		readonly piDesktop: PiDesktopApi;
	}
}
