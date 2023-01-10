import { mergeRefs, useEventListener, useFocusTrap } from "@mantine/hooks";
import { useEffect } from "react";
import { proxy, useSnapshot } from "valtio";
import { NeedsUpdating } from "../types";
import { LatestTimeout } from "./LatestTimeout";

export type FocusGroup = "layerList" | "other";

// Export for testing
export const _focusState = {
    groupIsFocused: true,
    blurCanvasTimeout: new LatestTimeout(),
    lastGroupTarget: null as HTMLElement | null,
};

export const focusProxy = proxy({ group: "layerList" as FocusGroup });

export const useGlobalFocusListeners = ({ pageFocusOut }: { pageFocusOut: () => void }) => {
    useEffect(() => {
        const focusIn = (event: FocusEvent) => {
            if (_focusState.groupIsFocused) {
                _focusState.blurCanvasTimeout.clear();
                _focusState.lastGroupTarget = event.target as HTMLElement | null;
            }
        };

        const focusOut = (event: FocusEvent) => {
            _focusState.lastGroupTarget =
                (event.target as NeedsUpdating) || _focusState.lastGroupTarget;
            _focusState.blurCanvasTimeout.after(0, () => {
                if (document.activeElement === document.body) pageFocusOut();

                _focusState.lastGroupTarget?.focus();
            });
        };
        document.addEventListener("focusin", focusIn);
        document.addEventListener("focusout", focusOut);

        return () => {
            document.removeEventListener("focusin", focusIn);
            document.removeEventListener("focusout", focusOut);
        };
    }, [pageFocusOut]);
};

export const useFocusGroup = (name: FocusGroup) => {
    const focusOutRef = useEventListener("focusout", () => {
        _focusState.groupIsFocused = false;
    });
    const focusInRef = useEventListener("focusin", () => {
        _focusState.groupIsFocused = true;
        // TODO: Must be in a timeout to alow other events to be handled before rerendering react.
        setTimeout(() => (focusProxy.group = name), 0);
    });

    const snap = useSnapshot(focusProxy);
    const trapRef = useFocusTrap(snap.group === name);
    const ref = mergeRefs(focusInRef, focusOutRef, trapRef);

    return { ref };
};
