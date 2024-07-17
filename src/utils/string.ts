import { randomId } from "@mantine/hooks";
import { Base64 } from "js-base64";
import { inspect, type InspectOptions } from "node-inspect-extracted";

export const stringifyAnything = (obj: any, params: Partial<InspectOptions> = {}): string => {
    try {
        return inspect(obj, { ...params, showProxy: true });
    } catch (err) {
        console.error(err);
        return `[COULD_NOT_STRINGIFY_OBJECT]`;
    }
};

export const keypressString = (
    event: Pick<KeyboardEvent, "key" | "ctrlKey" | "shiftKey">,
): string => {
    let key = event.key;
    const { ctrlKey, shiftKey } = event;
    if (key === " ") {
        key = "Space";
    } else if (key === "Control" || key === "Shift") {
        return key;
    }
    if (key.length > 1) {
        return (ctrlKey ? "ctrl-" : "") + (shiftKey ? "shift-" : "") + key;
    }

    return (ctrlKey ? "ctrl-" : "") + key;
};

export const smartSort = <T extends string | number = any>(a: T, b: T) => {
    return a < b ? -1 : a > b ? 1 : 0;
};

export const randomStringId = (blacklist: string[]) => {
    let s: string;
    do {
        // TODO: I'll probably use a different function in the future, we'll see.
        s = randomId();
    } while (blacklist.includes(s));
    return s;
};

/** Mostly helpful for ensuring it's url safe */
export const base64 = {
    parse(input: string): Uint8Array {
        return Base64.toUint8Array(input);
    },
    stringify(input: Uint8Array): string {
        return Base64.fromUint8Array(input, true);
    },
};

/** Replace spaces with hyphens and vice versa */
export const losslessKebab = (input: string): string => {
    return input
        .split(" ")
        .map((part) => part.replaceAll("-", " "))
        .join("-");
};
