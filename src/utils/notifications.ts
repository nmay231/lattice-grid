import { showNotification } from "@mantine/notifications";
import { stringifyAnything } from "./string";

export const notify = {
    error(props: { message: string; title?: string; forever?: true; error?: Error }) {
        const { forever, error, ...rest } = props;

        if (error) console.error(error);

        showNotification({
            color: "red",
            title: "Internal Error",
            autoClose: !forever && 4000,
            ...rest,
        });

        return new Error(stringifyAnything(rest));
    },
};
