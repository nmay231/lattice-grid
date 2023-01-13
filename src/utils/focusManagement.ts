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

export type FocusGroup = "layerList" | "controlSettings" | "constraintSettings" | "none" | "debug";

// Export for testing
export const _focusState = {
    groupIsFocused: true,
    focusOutOfGroupTimeout: new LatestTimeout(),
    lastGroupTarget: null as HTMLElement | null,
};

// The current focus group must be kept in a proxy so that components are rerendered, but could the rest of _focusState be merged for simplicity?
export const focusProxy = proxy({ group: "layerList" as FocusGroup });

export const useGlobalFocusListeners = ({ pageFocusOut }: { pageFocusOut: () => void }) => {
    useEffect(() => {
        const focusIn = (event: FocusEvent) => {
            const target = event.target as HTMLElement | null;

            if (_focusState.groupIsFocused) {
                _focusState.focusOutOfGroupTimeout.clear();
            } else if (target?.tabIndex !== 0) {
                // TODO: openModal()
                // Refocus last group element if the element doesn't opt into handling focus itself.
                _focusState.lastGroupTarget?.focus();
            }
        };

        const focusOut = () => {
            // This timeout only runs if a non-group element was focused or everything was unfocused
            _focusState.focusOutOfGroupTimeout.after(0, () => {
                if (document.activeElement === document.body) {
                    // The page background was clicked/tapped
                    pageFocusOut();
                    _focusState.lastGroupTarget?.focus();
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
    group,
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
        setTimeout(() => (focusProxy.group = group), 0);
    });

    const keyDownRef = useEventListener("keydown", (event) => {
        if (group === "layerList") return;

        if (event.code === "Escape") {
            event.stopPropagation();
            puzzle.focusCurrentLayer();
        }
    });

    const snap = useSnapshot(focusProxy);
    const trapRef = useFocusTrap(snap.group === group);
    const ref = mergeRefs(focusInRef, focusOutRef, keyDownRef, trapRef);

    return { ref, unfocus: () => puzzle.focusCurrentLayer() };
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

    const focusInRef = useEventListener("focusin", () => {
        focusProxy.group = "none";
    });

    return { ref: mergeRefs(keyDownRef, focusInRef), unfocus };
};

export type ModalName = "blockly" | "import-export" | "resize-grid";

const modalProxy = proxy({ modal: null as null | ModalName });

export const openModal = (modal: ModalName) => {
    // The element must be focused before the modal is opened so that focus is returned correctly when it closed.
    _focusState.lastGroupTarget?.focus();
    setTimeout(() => (modalProxy.modal = modal));
};

export const closeModal = () => {
    modalProxy.modal = null;
};

export const useModal = (modal: ModalName) => {
    const modalSnap = useSnapshot(modalProxy);

    return { opened: modal === modalSnap.modal, close: closeModal };
};
