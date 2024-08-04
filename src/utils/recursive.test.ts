import fc from "fast-check";
import lodash from "lodash";
import { FCRepeat, given } from "../testing-utils/fcArbitraries";
import { deepClone, isEqual } from "./recursive";

describe("deepClone and isEqual", () => {
    it("they work in tandem", () => {
        given([
            fc.anything().map((thing) => {
                if (typeof thing === "object" && thing) {
                    delete (thing as any)["__proto__"];
                }
                return thing;
            }),
        ]).assertProperty((thing) => {
            const copy = deepClone(thing);
            expect(copy).toEqual(thing);

            expect(isEqual(thing, copy)).toBe(true);
        });
    });

    it("isEqual copies behavior of lodash.isEqual", () => {
        given([FCRepeat(2, fc.anything())]).assertProperty(([a, b]) => {
            expect(isEqual(a, b)).toBe(lodash.isEqual(a, b));
        });
    });

    // This is why you have to write manual example tests. The tests above didn't catch this.
    it.each([
        [{ a: 1 }, { a: 1 }, true],
        [{ a: 1 }, { a: 2 }, false],
        [{ a: 1 }, { b: 1 }, false],
        [[1], [2], false],
    ] satisfies Array<[unknown, unknown, boolean]>)(
        "detects simple differences in an object",
        (one, two, expected) => {
            expect(isEqual(one, two)).toBe(expected);
        },
    );
});
