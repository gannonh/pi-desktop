import type { PiDesktopApi } from "../shared/preload-api";

declare global {
	interface Window {
		piDesktop: PiDesktopApi;
	}

	interface ImportMetaEnv {
		readonly VITE_PI_DESKTOP_APP_SERVER_URL?: string;
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}
