import { randomId } from "@mantine/hooks";
import { Base64 } from "js-base64";
// import { inspect } from "node-inspect-extracted";
import { deflate, inflate } from "pako";
import { UnknownObject } from "../types";

export const stringifyAnything = (obj: any): string => {
    try {
        // TODO: Safari <16.4 doesn't support a regex parser feature for something in `node-inspect-extracted`, so importing inspect will error until most Safari supports it.
        // return inspect(obj, { showProxy: true });
        return JSON.stringify(obj);
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

// TODO: A temporary way to encode puzzle data as a string.
// Consider setting windowBits on deflate and inflate.
export const compressJSON = (object: UnknownObject) => {
    const JSONString = JSON.stringify(object);
    const compressedArray = deflate(JSONString);
    const URLSafe = Base64.fromUint8Array(compressedArray);
    return URLSafe;
};

export const decompressJSON = (URLSafe: string) => {
    const compressedArray = Base64.toUint8Array(URLSafe);
    const JSONString = inflate(compressedArray, { to: "string" });
    const object = JSON.parse(JSONString);
    return object;
};
