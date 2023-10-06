import { proxy } from "valtio";
import { subscribeKey } from "valtio/utils";
import { smallPageWidth } from "../SideBar/sidebarProxy";

// TODO: Should this be a part of Mantine's theme and PuzzleManager respectively?
// This is in a separate file to help with HMR
const isMobile = (true || window.matchMedia?.(`(max-width: ${smallPageWidth})`).matches) ?? true;
export const mobileControlsProxy = proxy({
    opened: isMobile,
    enabled: isMobile,
});

// TODO: Update to the new eslint files so I can restrict vitest lints to only testing files
// eslint-disable-next-line vitest/require-hook
subscribeKey(mobileControlsProxy, "enabled", () => {
    mobileControlsProxy.opened = mobileControlsProxy.enabled;
});
