import { NotificationProps, showNotification } from "@mantine/notifications";
import { formatAnything } from "./stringUtils";

export const blurActiveElement = () => {
    // Sometimes, I hate JS... Why event loop? WHY?
    window.setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0);
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
