import { proxy } from "valtio";
import { smallPageWidth } from "../SideBar/sidebarProxy";

// TODO: Should this be a part of Mantine's theme and PuzzleManager respectively?
// This is in a separate file to help with HMR
export const mobileControlsProxy = proxy({
    opened: window.matchMedia?.(`(min-width: ${smallPageWidth})`).matches ?? true,
});
