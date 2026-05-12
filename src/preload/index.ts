import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("piDesktop", {
	ready: true,
});
