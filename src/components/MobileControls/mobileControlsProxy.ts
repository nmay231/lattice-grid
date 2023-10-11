import { proxy } from "valtio";
import { subscribeKey } from "valtio/utils";
import { smallPageWidth } from "../SideBar/sidebarProxy";

// TODO: Should this be a part of Mantine's theme and PuzzleManager respectively?
// This is in a separate file to help with HMR
const isMobile = window.matchMedia?.(`(max-width: ${smallPageWidth})`).matches ?? true;
export const mobileControlsProxy = proxy({
    opened: isMobile,
    enabled: isMobile,
});

subscribeKey(mobileControlsProxy, "enabled", () => {
    mobileControlsProxy.opened = mobileControlsProxy.enabled;
});
