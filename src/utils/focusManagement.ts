import { mergeRefs, useEventListener, useFocusTrap } from "@mantine/hooks";
import { useSnapshot } from "valtio";
import { focusProxy } from "../state/focus";
import { NeedsUpdating } from "../types";
import { LatestTimeout } from "./LatestTimeout";

type FocusGroup = "layerList" | "other";
const lastFocused = { yes: true };

export const attachGlobalFocusListeners = () => {
    const state = {
        blurCanvasTimeout: new LatestTimeout(),
        lastGroupTarget: null as HTMLElement | null,
    };

    const focusIn = (event: FocusEvent) => {
        if (lastFocused.yes) {
            state.blurCanvasTimeout.clear();
            state.lastGroupTarget = event.target as HTMLElement | null;
        }
    };

    const focusOut = (event: FocusEvent) => {
        state.lastGroupTarget = (event.target as NeedsUpdating) || state.lastGroupTarget;
        state.blurCanvasTimeout.after(0, () => {
            state.lastGroupTarget?.focus();

            // TODO: clickOutsideCanvas();
        });
    };
    document.addEventListener("focusin", focusIn);
    document.addEventListener("focusout", focusOut);

    return {
        // Include state for testing
        state,
        unsubscribe: () => {
            document.removeEventListener("focusin", focusIn);
            document.removeEventListener("focusout", focusOut);
        },
    };
};

export const useFocusGroup = (name: FocusGroup) => {
    const focusOutRef = useEventListener("focusout", () => {
        lastFocused.yes = false;
    });
    const focusInRef = useEventListener("focusin", () => {
        lastFocused.yes = true;
        // TODO: Must be in a timeout to alow other events to be handled before rerendering react.
        setTimeout(() => (focusProxy.on = name), 0);
    });

    const snap = useSnapshot(focusProxy);
    const trapRef = useFocusTrap(snap.on === name);
    const ref = mergeRefs(focusInRef, focusOutRef, trapRef);

    return { ref };
};
