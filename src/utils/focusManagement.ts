/**
 * There is a list of possible actions that a user can take on the page that affects focus. Additionally, depending on
 *
 * Here are the list of focusin/out events that can happen based on the user actions. The delay "group" is there because keyboard users can focus an element and apply its action (like a button click) after a delay.
 * -
 */

import { mergeRefs, useEventListener, useFocusTrap } from "@mantine/hooks";
import { useEffect } from "react";
import { proxy, useSnapshot } from "valtio";
import { type PuzzleManager } from "../logic/PuzzleManager";
import { LatestTimeout } from "./LatestTimeout";

export type FocusGroup = "layerList" | "other";

// Export for testing
export const _focusState = {
    groupIsFocused: true,
    focusOutOfGroupTimeout: new LatestTimeout(),
    lastGroupTarget: null as HTMLElement | null,
};

export const focusProxy = proxy({ group: "layerList" as FocusGroup });

export const useGlobalFocusListeners = ({ pageFocusOut }: { pageFocusOut: () => void }) => {
    useEffect(() => {
        const focusIn = (event: FocusEvent) => {
            const target = event.target as HTMLElement | null;

            if (_focusState.groupIsFocused) {
                _focusState.focusOutOfGroupTimeout.clear();
            } else if (target?.tabIndex !== 0) {
                // TODO: Do not refocus if the current focus group is a modal.
                // Refocus last group element if the element doesn't opt into handling focus itself.
                _focusState.lastGroupTarget?.focus();
            }
        };

        const focusOut = () => {
            _focusState.focusOutOfGroupTimeout.after(0, () => {
                // This runs only if a non-group element was focused or everything was unfocused

                if (document.activeElement === document.body) {
                    // The page background was clicked/tapped
                    pageFocusOut();
                }
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

export const useFocusGroup = ({
    puzzle,
    group: name,
}: {
    puzzle: Pick<PuzzleManager, "focusCurrentLayer">;
    group: FocusGroup;
}) => {
    const focusOutRef = useEventListener("focusout", () => {
        _focusState.groupIsFocused = false;
    });

    const focusInRef = useEventListener("focusin", (event) => {
        _focusState.groupIsFocused = true;
        _focusState.lastGroupTarget = event.target as HTMLElement | null;
        // TODO: Must be in a timeout to alow other events to be handled before rerendering react.
        setTimeout(() => (focusProxy.group = name), 0);
    });

    const keyDownRef = useEventListener("keydown", (event) => {
        if (name === "layerList") return;

        if (event.code === "Escape") {
            event.stopPropagation();
            puzzle.focusCurrentLayer();
        }
    });

    const snap = useSnapshot(focusProxy);
    const trapRef = useFocusTrap(snap.group === name);
    const ref = mergeRefs(focusInRef, focusOutRef, keyDownRef, trapRef);

    return { ref };
};

const unfocus = () => {
    _focusState.lastGroupTarget?.focus();
};
export const useFocusElementHandler = () => {
    const keyDownRef = useEventListener("keydown", (event) => {
        if (event.code === "Escape") {
            unfocus();
        }
    });

    return { ref: keyDownRef, unfocus };
};
