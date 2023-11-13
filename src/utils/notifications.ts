import { showNotification } from "@mantine/notifications";
import { stringifyAnything } from "./string";

export const notify = {
    error(props: {
        message: string;
        title?: string;
        /** @default 0 - never closes */
        timeout?: number;
        error?: Error;
    }) {
        const { timeout = 0, error, ...rest } = props;

        if (error) console.error(error);

        showNotification({
            color: "red",
            title: "Internal Error",
            autoClose: timeout || false,
            ...rest,
        });

        return new Error(stringifyAnything(rest));
    },
    info(props: {
        message: string;
        title?: string;
        /**
         * Set to `0` to stay until user manually closes
         * @default 4000 milliseconds
         */
        timeout?: number;
    }) {
        const { timeout = 4000, ...rest } = props;

        showNotification({
            color: "green",
            title: "Information",
            autoClose: timeout || false,
            ...rest,
        });
    },
};
