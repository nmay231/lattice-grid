import fc from "fast-check";
import { deepClone, isEqual } from "./recursive";
import { given } from "./testing/fcArbitraries";

describe("deepClone and isEqual", () => {
    it("they work in tandem", () => {
        given([
            fc.anything().map((thing) => {
                if (typeof thing === "object" && thing) {
                    delete (thing as any)["__proto__"];
                }
            }),
        ]).assertProperty((thing) => {
            const copy = deepClone(thing);
            expect(copy).toEqual(thing);

            expect(isEqual(thing, copy)).toBe(true);
        });
    });
});
