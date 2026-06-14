export type AppPlatform = NodeJS.Platform;

export const isMacAppPlatform = (platform: AppPlatform): boolean => platform === "darwin";

export const detectNavigatorPlatform = (): AppPlatform => {
	if (typeof navigator === "undefined") {
		return "linux";
	}

	const platform = navigator.userAgentData?.platform;
	if (platform && /Mac|iPhone|iPod|iPad/i.test(platform)) {
		return "darwin";
	}
	if (platform && /Win/i.test(platform)) {
		return "win32";
	}

	return "linux";
};
