// eslint-disable-next-line no-restricted-imports
import type { InspectOptions } from "node-inspect-extracted";

let inspect: typeof import("node-inspect-extracted").inspect;
// eslint-disable-next-line unicorn/prefer-top-level-await
void import("node-inspect-extracted").then((mod) => {
    inspect = mod.inspect;
});

const stringifyAnything = (obj: any, params: Partial<InspectOptions> = {}): string => {
    try {
        return inspect
            ? inspect(obj, { ...params, showProxy: true })
            : `[JSON]${JSON.stringify(obj)}`;
    } catch (err) {
        console.error(err);
        return `[COULD_NOT_STRINGIFY_OBJECT]`;
    }
};

export const debugFormat = (strings: TemplateStringsArray, ...objs: any[]): string => {
    return strings
        .map((str, i) => (i < objs.length ? `${str}${stringifyAnything(objs[i])}` : str))
        .join("");
};
