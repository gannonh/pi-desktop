import type { PiDesktopApi } from "../shared/preload-api";

declare global {
	interface Window {
		piDesktop: PiDesktopApi;
	}

	interface ImportMetaEnv {
		readonly DEV: boolean;
		readonly VITE_PI_DESKTOP_APP_SERVER_URL?: string;
		readonly VITE_PI_DESKTOP_USE_SAME_ORIGIN_BRIDGE?: string;
		readonly VITE_SHOW_PLANNED_AFFORDANCES?: string;
	}

	interface Navigator {
		readonly userAgentData?: {
			readonly platform?: string;
		};
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}
