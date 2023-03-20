import fc from "fast-check";
import { range } from "lodash";
import { maxReducer, parseIntBase } from "./data";

describe("maxReducer", () => {
    it("gives the same value as the last value after sorting the array", () => {
        fc.assert(
            fc.property(
                fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), { minLength: 1 }),
                fc.compareFunc(),
                (array, sorter) => {
                    const sorted = [...array].sort(sorter);
                    expect(array.reduce(maxReducer<number>(sorter))).toBeCloseTo(
                        sorted[sorted.length - 1],
                    );
                },
            ),
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
