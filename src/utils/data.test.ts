import fc from "fast-check";
import { range, zip as lodashZip } from "lodash";
import { parseIntBase, reduceTo, zip as ourZip } from "./data";
import { FCNormalFloat, FCRepeat, given } from "./testing/fcArbitraries";

describe("reduceTo", () => {
    it.each([
        { arr: [1, 3, 0, 2], max: 3, min: 0 },
        { arr: [-3, -1, 0, -2], max: 0, min: -3 },
    ])("finds the min/max value", ({ arr, max, min }) => {
        expect(arr.reduce(reduceTo.max((a, b) => a - b))).toBe(max);
        expect(arr.reduce(reduceTo.last((a, b) => a - b))).toBe(max);

        expect(arr.reduce(reduceTo.min((a, b) => a - b))).toBe(min);
        expect(arr.reduce(reduceTo.first((a, b) => a - b))).toBe(min);
    });

    it("gives the same value as the first/last value after sorting the array", () => {
        given([fc.array(FCNormalFloat(), { minLength: 1 }), fc.compareFunc()]).assertProperty(
            (array, sorter) => {
                const sorted = [...array].sort(sorter);
                expect(array.reduce(reduceTo.min<number>(sorter))).toBeCloseTo(sorted[0]);
                expect(array.reduce(reduceTo.max<number>(sorter))).toBeCloseTo(
                    sorted[sorted.length - 1],
                );
            },
        );
    });
});

describe("parseIntBase", () => {
    it("ignores other arguments", () => {
        const numberStrings = [61, 123, 2, 2, 5, 3, 5, 67, 2, 190_873, 87_287_936_108_264]
            .join(",")
            .split(",");
        expect(numberStrings.map((number) => parseInt(number))).toEqual(
            numberStrings.map(parseIntBase(10)),
        );
    });

    it("does other bases than 10", () => {
        const base36 = [..."0123456789abcdefghijklmnopqrstuvwxyz"].concat("EEEEEEEEE");
        expect(base36.map(parseIntBase(36))).toEqual(range(0, 36).concat(40623982667366));

        expect(parseIntBase(2)("110100100")).toBe(420);
    });
});

describe("zip with better types", () => {
    it("does exactly what the lodash zip does for arrays with equal length", () => {
        given([
            fc
                .integer({ min: 0, max: 1000 })
                .chain((length) =>
                    fc.array(FCRepeat(length, fc.integer()), { minLength: 2, maxLength: 5 }),
                ),
        ]).assertProperty((arrays) => {
            expect(Array.from(ourZip(...arrays))).toEqual(lodashZip(...arrays));
        });
    });
});
