import { NotificationProps, showNotification } from "@mantine/notifications";
import { Layer } from "../types";
import { LatestTimeout } from "./LatestTimeout";
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

const _layerSelectTimeout = new LatestTimeout();
export const focusCurrentLayer = (layerId: Layer["id"], throwError = false) => {
    // Must be in a timeout to allow the DOM to be updated.
    _layerSelectTimeout.after(10, () => {
        const elm = document.querySelector<HTMLElement>(`[data-id="${layerId}"]`);
        if (!elm && throwError) {
            throw errorNotification({
                error: null,
                message: "LayerList: Unable to find the next LayerItem to focus",
            });
        } else if (elm) {
            elm.focus();
        }
    });
};
