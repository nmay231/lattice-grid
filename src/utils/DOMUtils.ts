import { mergeRefs, useEventListener, useFocusTrap } from "@mantine/hooks";
import { NotificationProps, showNotification } from "@mantine/notifications";
import { Layer } from "../types";
import { formatAnything } from "./stringUtils";

export const errorNotification = (
    props: Partial<Pick<NotificationProps, "message" | "title">> & {
        forever?: true;
        error: Error | null;
    },
) => {
    const { forever, error, ...rest } = props;

    if (error) console.error(error);

    showNotification({
        color: "red",
        title: "Internal Error",
        message: "Something might have gone went wrong. We don't know what.",
        autoClose: !forever && 4000,
        ...rest,
    });

    return new Error(formatAnything(rest));
};

export const useFocusGroup = (condition: boolean) => {
    const trapRef = useFocusTrap(condition);
    const focusOutRef = useEventListener("focusout", function (event) {
        if (condition) {
            if (!event.relatedTarget || !this.contains(event.relatedTarget as Node)) {
                (event.target as HTMLElement).focus();
            } else if (this.contains(event.relatedTarget as Node)) {
                (event.relatedTarget as HTMLElement).focus();
            }
        }
    });

    const ref = mergeRefs(trapRef, focusOutRef);

    return { ref };
};

let _layerSelectTimeout = 0;
export const focusCurrentLayer = (layerId: Layer["id"], throwError = false) => {
    // TODO: A (maybe) temporary hack to keep the DOM up to date. Must be in a timeout to allow the DOM to be updated.
    window.clearTimeout(_layerSelectTimeout);
    _layerSelectTimeout = window.setTimeout(() => {
        const elm = document.querySelector<HTMLElement>(`[data-id="${layerId}"]`);
        if (!elm && throwError) {
            throw errorNotification({
                error: null,
                message: "LayerList: Unable to find the next LayerItem to focus",
            });
        } else if (elm) {
            elm.focus();
        }
    }, 10);
};
