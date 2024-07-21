import { useEffect } from "react";
import { proxy } from "valtio";
import { subscribeKey, useProxy } from "valtio/utils";
import { focusProxy } from "../../utils/focusManagement";
import { sidebarProxy, smallPageWidth } from "../SideBar/sidebarProxy";

// TODO: Should this be a part of Mantine's theme and PuzzleManager respectively?
const isMobile = window.innerWidth < smallPageWidth;
export const mobileControlsProxy = proxy({
    opened: isMobile,
    enabled: isMobile,
    isSmallScreen: isMobile,
});

subscribeKey(mobileControlsProxy, "enabled", () => {
    mobileControlsProxy.opened = mobileControlsProxy.enabled;
});

// Only put in a useEffect to work with HMR
export const useResizeObserver = () => {
    const focus = useProxy(focusProxy);
    useEffect(() => {
        const func = () => {
            mobileControlsProxy.isSmallScreen = window.innerWidth < smallPageWidth;
            // TODO: Respect permanent setting, if I ever make one
            mobileControlsProxy.opened = mobileControlsProxy.isSmallScreen;
            // TODO: Renaming author or title on Android shrinks the screen, so we only close the sidebar if the layer list is focused. We only care to open and close the sidebar at all if we are resizing the window on desktop, so perhaps I should find a better way to manage those preferences than screen size alone.
            if (focus.group === "layerList") {
                sidebarProxy.opened = !mobileControlsProxy.isSmallScreen;
            }
        };
        window.addEventListener("resize", func);
        return () => window.removeEventListener("resize", func);
    }, []);
};
