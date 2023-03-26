import fc from "fast-check";
import { FancyVector } from "./math";
import { FCNormalFloats } from "./testing/fcArbitraries";

// Most of the simple tests are not really to test correctness as much as they are to check there are no unexpected errors
describe("Vector", () => {
    it("has .xy and .size props", () => {
        const vec = new FancyVector([3, 4]);
        expect(vec.xy).toEqual([3, 4]);
        expect(vec.size).toEqual(5);
    });

    it("can add", () => {
        const a = new FancyVector([1, 2]);
        const b = new FancyVector([-3, 8]);
        expect(a.plus(b).xy).toEqual([-2, 10]);
        expect(b.plus([6, 10]).xy).toEqual([3, 18]);

        // a and b remain unchanged
        expect(a.xy).toEqual([1, 2]);
        expect(b.xy).toEqual([-3, 8]);
    });

    it("can subtract", () => {
        const a = new FancyVector([1, 2]);
        const b = new FancyVector([-3, 8]);
        expect(a.minus(b).xy).toEqual([4, -6]);
        expect(a.minus([2, 1]).xy).toEqual([-1, 1]);

        // a and b remain unchanged
        expect(a.xy).toEqual([1, 2]);
        expect(b.xy).toEqual([-3, 8]);
    });

    it("can be scaled", () => {
        const a = new FancyVector([1, 2]);
        expect(a.scale(5).xy).toEqual([5, 10]);

        // a remains unchanged
        expect(a.xy).toEqual([1, 2]);
    });

    it("gets its unit vector", () => {
        const { x, y } = new FancyVector([8, 8]).unit();
        expect(x).toBeCloseTo(Math.SQRT1_2);
        expect(y).toBeCloseTo(Math.SQRT1_2);

        fc.assert(
            fc.property(fc.tuple(FCNormalFloats(), FCNormalFloats()), (xy) => {
                fc.pre((xy[0] && xy[1]) > 0); // Ignore division by zero
                const [x, y] = xy;

                const vec = new FancyVector([x, y]);
                const denominator = Math.sqrt(x ** 2 + y ** 2);
                expect(vec.unit().xy).toEqual([x / denominator, y / denominator]);

                // vec remains unchanged
                expect(vec.xy).toEqual(xy);
            }),
        );
    });

    it("checks equality", () => {
        fc.assert(
            fc.property(
                fc.tuple(FCNormalFloats(), FCNormalFloats()),
                fc.integer().filter((n) => !!n), // Offset has to be non-zero
                (xy, offset) => {
                    const [x, y] = xy;
                    const vec = new FancyVector([x, y]);
                    expect(vec.equals([x, y])).toBe(true);
                    expect(vec.equals(new FancyVector([x, y]))).toBe(true);

                    expect(vec.equals([x, y + offset])).toBe(false);
                    expect(vec.equals([x + offset, y])).toBe(false);

                    // vec remains unchanged
                    expect(vec.xy).toEqual(xy);
                },
            ),
        );
    });

    it("calculates the dotProduct", () => {
        const a = new FancyVector([2, 1]);
        const b = new FancyVector([8, -9]);
        expect(a.dotProduct(b)).toBe(7);
        expect(a.dotProduct(a)).toBeCloseTo(a.size ** 2);
        expect(a.dotProduct([-1, 2])).toBe(0);
        expect(a.dotProduct([1, -2])).toBe(0);

        // a and b remain unchanged
        expect(a.xy).toEqual([2, 1]);
        expect(b.xy).toEqual([8, -9]);
    });

    it("calculates scalar projection", () => {
        fc.assert(
            fc.property(fc.tuple(FCNormalFloats(), FCNormalFloats()), (xy) => {
                const [x, y] = xy;
                const vec = new FancyVector([x, y]);

                expect(vec.scalarProjectionOnto([0, 1])).toBeCloseTo(y);
                expect(vec.scalarProjectionOnto([0, 100])).toBeCloseTo(y);
                expect(vec.scalarProjectionOnto([42, 0])).toBeCloseTo(x); // TODO: Just check using the cosine method
                expect(vec.scalarProjectionOnto(vec)).toBeCloseTo(vec.size);

                // vec remains unchanged
                expect(vec.xy).toEqual(xy);
            }),
        );
    });

    it("rotates by quarter turns", () => {
        fc.assert(
            fc.property(
                fc.tuple(FCNormalFloats(), FCNormalFloats()),
                fc.integer({ min: 1000, max: 1000 }), // cos() and sin() become too inaccurate with large angles
                (xy, n) => {
                    const [x, y] = xy;
                    const vec = new FancyVector([x, y]);
                    const rotated = vec.rotate90(n);

                    const newAngle = Math.atan2(y, x) + (n * Math.PI) / 2;
                    const newVec = {
                        x: Math.cos(newAngle) * vec.size,
                        y: Math.sin(newAngle) * vec.size,
                    };

                    expect(rotated.x).toBeCloseTo(newVec.x);
                    expect(rotated.y).toBeCloseTo(newVec.y);

                    // vec remains unchanged
                    expect(vec.xy).toEqual(xy);
                },
            ),
        );
    });
});

describe.todo("euclidean (Move from hopStraight.ts)");
