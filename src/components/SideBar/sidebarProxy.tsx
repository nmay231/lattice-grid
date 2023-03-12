import { proxy } from "valtio";

// TODO: Should this be a part of Mantine's theme and PuzzleManager respectively?
export const smallPageWidth = "800px";
export const sidebarProxy = proxy({
    opened: window.matchMedia?.(`(min-width: ${smallPageWidth})`).matches ?? true,
});
