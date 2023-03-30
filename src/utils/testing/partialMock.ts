import { Proxy as InspectableProxy } from "node-inspect-extracted";
import { RecursivePartial } from "../../types";
import { stringifyAnything } from "../string";

export const partialMock = <T>(x: RecursivePartial<T>) => {
    return _defineAllUsedProperties(x, stringifyAnything(x), "") as T;
};

type PartialMockError = Error & { attributeChain: string };
const _defineAllUsedProperties = <T extends object = any>(
    x: T,
    stringified: string,
    attributeChain: string,
): T => {
    return new InspectableProxy(x, {
        get(target, p, receiver) {
            if (typeof p !== "string") {
                return Reflect.get(target, p, receiver);
            }

            const nextAttributeChain = `${attributeChain}.${p}`;
            if (p in target) {
                let recurse: unknown;

                try {
                    recurse = target[p as never]; // `as never` Because typescript is dumb sometimes
                } catch (err) {
                    const nextErr = new Error(
                        `Could not access the nested property of ${stringified}: \`${
                            (err as PartialMockError).attributeChain
                        }\``,
                        {},
                    ) as PartialMockError;
                    nextErr.attributeChain = (err as PartialMockError).attributeChain;
                    throw nextErr;
                }
                if (typeof recurse === "object" && recurse !== null) {
                    return _defineAllUsedProperties(recurse, stringified, nextAttributeChain);
                }
                return recurse;
            } else {
                const err = new Error(
                    `Could not access the property of ${stringified}: \`${nextAttributeChain}\``,
                    {},
                ) as PartialMockError;
                err.attributeChain = attributeChain;
                throw err;
            }
        },
    });
};
