import { proxy } from "valtio";

// TODO: Should this be a part of Mantine's theme and PuzzleManager respectively?
// This is in a separate file to help with HMR
export const smallPageWidth = 800;
export const sidebarProxy = proxy({
    opened: window.innerWidth >= smallPageWidth,
});
