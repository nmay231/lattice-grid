import { proxy, useSnapshot } from "valtio";

type Focus = "layerList" | "other";
export const focusProxy = proxy({ on: "layerList" as Focus });
export const useCurrentFocus = () => [
    useSnapshot(focusProxy).on,
    (focus: Focus) => (focusProxy.on = focus),
];
