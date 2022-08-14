import { NotificationProps, showNotification } from "@mantine/notifications";

export const blurActiveElement = () => {
    // Sometimes, I hate JS... Why event loop? WHY?
    window.setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0);
};

export const errorNotification = (
    props: Partial<Pick<NotificationProps, "message" | "title">> & { forever?: true },
) => {
    const { forever, ...rest } = props;
    showNotification({
        color: "red",
        title: "Internal Error",
        message: "Something might have gone went wrong. We don't know what.",
        autoClose: !forever && 4000,
        ...rest,
    });
};
