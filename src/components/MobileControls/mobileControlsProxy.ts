import { useEffect } from "react";
import { proxy } from "valtio";
import { subscribeKey } from "valtio/utils";
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
    useEffect(() => {
        const func = () => {
            mobileControlsProxy.isSmallScreen = window.innerWidth < smallPageWidth;
            // TODO: Respect permanent setting, if I ever make one
            mobileControlsProxy.opened = mobileControlsProxy.isSmallScreen;
            sidebarProxy.opened = !mobileControlsProxy.isSmallScreen;
        };
        window.addEventListener("resize", func);
        return () => window.removeEventListener("resize", func);
    }, []);
};
