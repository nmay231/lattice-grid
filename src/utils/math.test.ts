import fc from "fast-check";
import { TupleVector } from "../types";
import { Vec } from "./math";
import { FCNormalFloat, FCRepeat, given } from "./testing/fcArbitraries";

// Most of the simple tests are not really to test correctness as much as they are to check there are no unexpected errors
describe("Vector", () => {
    it("has .xy and .size props", () => {
        const vec = new Vec(3, 4);
        expect(vec.xy).toEqual([3, 4]);
        expect(vec.size).toEqual(5);
    });

    it("can add", () => {
        const a = new Vec(1, 2);
        const b = new Vec(-3, 8);
        expect(a.plus(b).xy).toEqual([-2, 10]);
        expect(b.plus([6, 10]).xy).toEqual([3, 18]);

        // a and b remain unchanged
        expect(a.xy).toEqual([1, 2]);
        expect(b.xy).toEqual([-3, 8]);
    });

    it("can subtract", () => {
        const a = new Vec(1, 2);
        const b = new Vec(-3, 8);
        expect(a.minus(b).xy).toEqual([4, -6]);
        expect(a.minus([2, 1]).xy).toEqual([-1, 1]);

        // a and b remain unchanged
        expect(a.xy).toEqual([1, 2]);
        expect(b.xy).toEqual([-3, 8]);
    });

    it("can be scaled", () => {
        const a = new Vec(1, 2);
        expect(a.scale(5).xy).toEqual([5, 10]);

        // a remains unchanged
        expect(a.xy).toEqual([1, 2]);
    });

    it("gets its unit vector", () => {
        const { x, y } = new Vec(8, 8).unit();
        expect(x).toBeCloseTo(Math.SQRT1_2);
        expect(y).toBeCloseTo(Math.SQRT1_2);
        given([FCRepeat(2, FCNormalFloat())]).assertProperty((xy) => {
            fc.pre((xy[0] && xy[1]) > 0); // Ignore division by zero
            const [x, y] = xy;

            const vec = new Vec(x, y);
            const denominator = Math.sqrt(x ** 2 + y ** 2);
            expect(vec.unit().xy).toEqual([x / denominator, y / denominator]);

            // vec remains unchanged
            expect(vec.xy).toEqual(xy);
        });
    });

    it("checks equality", () => {
        given([
            FCRepeat(2, FCNormalFloat()),
            fc.integer().filter((n) => !!n), // Offset has to be non-zero
        ]).assertProperty((xy, offset) => {
            const [x, y] = xy;
            const vec = new Vec(x, y);
            expect(vec.equals([x, y])).toBe(true);
            expect(vec.equals(new Vec(x, y))).toBe(true);

            expect(vec.equals([x, y + offset])).toBe(false);
            expect(vec.equals([x + offset, y])).toBe(false);

            // vec remains unchanged
            expect(vec.xy).toEqual(xy);
        });
    });

    it("calculates the dotProduct", () => {
        const a = new Vec(2, 1);
        const b = new Vec(8, -9);
        expect(a.dotProduct(b)).toBe(7);
        expect(a.dotProduct(a)).toBeCloseTo(a.size ** 2);
        expect(a.dotProduct([-1, 2])).toBe(0);
        expect(a.dotProduct([1, -2])).toBe(0);

        // a and b remain unchanged
        expect(a.xy).toEqual([2, 1]);
        expect(b.xy).toEqual([8, -9]);
    });

    it("calculates scalar projection", () => {
        given([FCRepeat(2, FCNormalFloat())]).assertProperty((xy) => {
            const [x, y] = xy;
            const vec = new Vec(x, y);

            expect(vec.scalarProjectionOnto([0, 1])).toBeCloseTo(y);
            expect(vec.scalarProjectionOnto([0, 100])).toBeCloseTo(y);
            expect(vec.scalarProjectionOnto([42, 0])).toBeCloseTo(x); // TODO: Just check using the cosine method
            expect(vec.scalarProjectionOnto(vec)).toBeCloseTo(vec.size);

            // vec remains unchanged
            expect(vec.xy).toEqual(xy);
        });
    });

    it("rotates by quarter turns", () => {
        given([
            FCRepeat(2, FCNormalFloat()),
            fc.integer({ min: 1000, max: 1000 }), // cos() and sin() become too inaccurate with large angles
        ]).assertProperty((xy, n) => {
            const [x, y] = xy;
            const vec = new Vec(x, y);
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
        });
    });

    const SQRT_3 = Math.sqrt(3);

    it.each([
        { xy: [1, 0], degrees: 0 },
        { xy: [2, 0], degrees: 0 },
        { xy: [-2, 0], degrees: 180 },
        { xy: [0, 1], degrees: 90 },
        { xy: [0, -1], degrees: -90 },
        { xy: [Math.SQRT1_2, Math.SQRT1_2], degrees: 45 },
        { xy: [-Math.SQRT1_2, Math.SQRT1_2], degrees: 90 + 45 },
        { xy: [Math.SQRT1_2, -Math.SQRT1_2], degrees: -45 },
        { xy: [-Math.SQRT1_2, -Math.SQRT1_2], degrees: -(90 + 45) },
        { xy: [SQRT_3, 1], degrees: 30 },
        { xy: [1, SQRT_3], degrees: 60 },
    ] satisfies Array<{ xy: TupleVector; degrees: number }>)(
        "gives the angle to the origin",
        ({ xy, degrees }) => {
            const vec = Vec.from(xy);
            const angle = (degrees * Math.PI) / 180;
            expect(vec.originAngle()).toBeCloseTo(angle);
            expect(vec.scale(42).originAngle()).toBeCloseTo(angle);

            expect(vec.xy).toEqual(xy);
        },
    );

    it.each([
        { a: [0.001, 0], b: [1000, 0], degrees: 0 },
        { a: [42, 42], b: [420, 420], degrees: 0 },
        { a: [0.001, 0], b: [0, 1000], degrees: 90 },
        { a: [0, 1000], b: [0.001, 0], degrees: 90 },
        { a: [SQRT_3, 1], b: [1, 0], degrees: 30 },
        { a: [1, SQRT_3], b: [1, 0], degrees: 60 },
        { a: [-1, 0], b: [1, 0], degrees: 180 },
        { a: [-2 * SQRT_3, 2], b: [-2, 0], degrees: 30 },
    ] satisfies Array<{ a: TupleVector; b: TupleVector; degrees: number }>)(
        "calculates the correct angle to another vector",
        ({ a, b, degrees }) => {
            const vec1 = Vec.from([...a]);
            const vec2 = Vec.from([...b]);
            const angle = (degrees * Math.PI) / 180;

            expect(vec1.positiveAngleTo(vec2)).toBeCloseTo(angle);
            expect(vec2.positiveAngleTo(vec1)).toBeCloseTo(angle);

            // vec1 and vec2 remain unchanged
            expect(vec1.xy).toEqual(a);
            expect(vec2.xy).toEqual(b);
        },
    );

    it("positiveAngleTo is commutative", () => {
        given([
            FCRepeat(2, FCNormalFloat({ lower: 0.01, upper: 1000 })),
            FCRepeat(2, FCNormalFloat({ lower: 0.01, upper: 1000 })),
        ]).assertProperty((a, b) => {
            const vec1 = Vec.from([...a]);
            const vec2 = Vec.from([...b]);

            // The angles are commutative
            const angle1 = vec1.positiveAngleTo(vec2);
            expect(angle1).toBeCloseTo(vec2.positiveAngleTo(vec1));

            // They range in [0, 2 * Pi]
            expect(angle1).toBeGreaterThanOrEqual(0);
            expect(angle1).toBeLessThanOrEqual(2 * Math.PI);

            // The angle is the same as the origin angle when the other vector points along the origin
            expect(vec1.positiveAngleTo([1, 0])).toBeCloseTo(Math.abs(vec1.originAngle()));

            // vec1 and vec2 remain unchanged
            expect(vec1.xy).toEqual(a);
            expect(vec2.xy).toEqual(b);
        });
    });
});
