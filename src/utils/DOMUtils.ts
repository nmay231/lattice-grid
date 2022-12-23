import { useEventListener, useFocusTrap, useMergedRef } from "@mantine/hooks";
import { NotificationProps, showNotification } from "@mantine/notifications";
import { NeedsUpdating } from "../types";
import { formatAnything } from "./stringUtils";

// TODO: Remove once focus management is complete.
export const blurActiveElement = () => {
    // Sometimes, I hate JS... Why event loop? WHY?
    // window.setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0);
};

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
    const eventRef = useEventListener("focusout", function (event) {
        if (condition) {
            if (!event.relatedTarget || !this.contains(event.relatedTarget as Node)) {
                (event.target as HTMLElement).focus();
            } else if (this.contains(event.relatedTarget as Node)) {
                (event.relatedTarget as HTMLElement).focus();
            }
        }
    });
    const ref = useMergedRef(trapRef, eventRef) as NeedsUpdating as (
        node: HTMLElement | null,
    ) => void;

    return { ref };
};
