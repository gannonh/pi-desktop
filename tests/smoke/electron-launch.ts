import { _electron as electron, type ElectronApplication } from "@playwright/test";

type ElectronLaunchOptions = NonNullable<Parameters<typeof electron.launch>[0]>;

/** Set `PI_DESKTOP_SMOKE_HEADED=1` or `PWDEBUG=1` to show Electron windows while debugging smoke tests. */
export const isSmokeElectronHeaded = (): boolean =>
	process.env.PI_DESKTOP_SMOKE_HEADED === "1" || process.env.PWDEBUG === "1";

export const launchElectronApp = (options: ElectronLaunchOptions): Promise<ElectronApplication> => {
	const { env: launchEnv, ...rest } = options;

	return electron.launch({
		...rest,
		env: {
			...process.env,
			...launchEnv,
			PI_DESKTOP_SMOKE_HEADLESS: isSmokeElectronHeaded() ? "0" : "1",
		},
	});
};
