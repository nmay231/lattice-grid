import fc from "fast-check";
import { given } from "../testing-utils/fcArbitraries";
import { deepClone, isEqual } from "./recursive";

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
