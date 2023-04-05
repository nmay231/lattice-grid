import fc from "fast-check";
import { shuffle } from "lodash";
import { TupleVector } from "../types";
import { reduceTo } from "../utils/data";
import { Vec } from "../utils/math";
import { smartSort } from "../utils/string";
import { FCRepeat, given } from "../utils/testing/fcArbitraries";
import { SquareGrid, _SquareGridTransformer } from "./SquareGrid";

describe("SquareGrid", () => {
    const common = { minX: 0, minY: 0, type: "square" as const };
    const smallGrid = new SquareGrid({ ...common, width: 2, height: 2 });
    const mediumGrid = new SquareGrid({ ...common, width: 10, height: 10 });

    it("knows points are within bounds", () => {
        expect([
            mediumGrid._outOfBounds({ x: 1, y: 1, type: "cells" }),
            mediumGrid._outOfBounds({ x: 1, y: 19, type: "cells" }),
            mediumGrid._outOfBounds({ x: 19, y: 1, type: "cells" }),
            mediumGrid._outOfBounds({ x: 19, y: 19, type: "cells" }),
        ]).toEqual([false, false, false, false]);
    });

    it("knows points are outside bounds", () => {
        expect([
            mediumGrid._outOfBounds({ x: -1, y: -1, type: "cells" }),
            mediumGrid._outOfBounds({ x: 10, y: 21, type: "edges" }),
            mediumGrid._outOfBounds({ x: 21, y: 10, type: "edges" }),
            mediumGrid._outOfBounds({
                x: 1000000,
                y: 1000000,
                type: "corners",
            }),
        ]).toEqual([true, true, true, true]);
    });

    it("generates all cell grid points", () => {
        const cells = smallGrid._getAllGridPoints("cells");
        expect(cells).toEqual([
            { type: "cells", x: 1, y: 1 },
            { type: "cells", x: 1, y: 3 },
            { type: "cells", x: 3, y: 1 },
            { type: "cells", x: 3, y: 3 },
        ]);
    });

    it("generates all corner grid points", () => {
        const corners = smallGrid._getAllGridPoints("corners");
        expect(corners).toEqual([
            { type: "corners", x: 0, y: 0 },
            { type: "corners", x: 0, y: 2 },
            { type: "corners", x: 0, y: 4 },
            { type: "corners", x: 2, y: 0 },
            { type: "corners", x: 2, y: 2 },
            { type: "corners", x: 2, y: 4 },
            { type: "corners", x: 4, y: 0 },
            { type: "corners", x: 4, y: 2 },
            { type: "corners", x: 4, y: 4 },
        ]);
    });

    it("generates all edge grid points", () => {
        const edges = smallGrid._getAllGridPoints("edges");
        expect(edges).toEqual([
            { type: "edges", x: 1, y: 0 },
            { type: "edges", x: 0, y: 1 },
            { type: "edges", x: 1, y: 2 },
            { type: "edges", x: 0, y: 3 },
            { type: "edges", x: 1, y: 4 },
            { type: "edges", x: 3, y: 0 },
            { type: "edges", x: 2, y: 1 },
            { type: "edges", x: 3, y: 2 },
            { type: "edges", x: 2, y: 3 },
            { type: "edges", x: 3, y: 4 },
            { type: "edges", x: 4, y: 1 },
            { type: "edges", x: 4, y: 3 },
        ]);
    });

    // TODO: Testing implementation, not behavior. Replace with some sorta image snapshot testing.
    it("_getBlits()", () => {
        let [edges, shrinkwrap, ...rest] = smallGrid._getBlits({
            blacklist: new Set(),
            settings: { cellSize: 20 },
        });

        expect(rest).toEqual([]);
        expect(edges).toEqual({
            blits: {
                "1,2": { x1: -0, x2: 20, y1: 20, y2: 20 },
                "2,1": { x1: 20, x2: 20, y1: -0, y2: 20 },
                "2,3": { x1: 20, x2: 20, y1: 20, y2: 40 },
                "3,2": { x1: 20, x2: 40, y1: 20, y2: 20 },
            },
            blitter: "line",
            id: "grid",
            style: { stroke: "black", strokeLinecap: "square", strokeWidth: 2 },
        });
        expect(shrinkwrap).toEqual({
            blits: { "0": { points: ["-4,-4", "-4,44", "44,44", "44,-4"] } },
            blitter: "polygon",
            id: "outline",
            style: { fill: "none", stroke: "black", strokeLinejoin: "miter", strokeWidth: 10 },
        });

        // Remove the bottom left and top right corners
        [edges, shrinkwrap, ...rest] = smallGrid._getBlits({
            blacklist: new Set(["1,1", "3,3"]),
            settings: { cellSize: 20 },
        });

        expect(rest).toEqual([]);
        expect(edges).toEqual({
            blits: {},
            blitter: "line",
            id: "grid",
            style: { stroke: "black", strokeLinecap: "square", strokeWidth: 2 },
        });
        expect(shrinkwrap).toEqual({
            blits: {
                "0": {
                    points: [
                        "-4,16",
                        "-4,44",
                        "24,44",
                        "24,24",
                        "44,24",
                        "44,-4",
                        "16,-4",
                        "16,16",
                    ],
                },
            },
            blitter: "polygon",
            id: "outline",
            style: { fill: "none", stroke: "black", strokeLinejoin: "miter", strokeWidth: 10 },
        });
    });
});

describe("SquareGridTransformer", () => {
    // cellSize defaults to 2 so that the grid space matches the svg space
    const pointTransformer = ({ cellSize = 2 } = {}) => new _SquareGridTransformer({ cellSize });
    const toPoint = (vec: Vec) => vec.xy.join(",");

    it("parses points", () => {
        const pt = pointTransformer();
        const [map, cells] = pt.fromPoints("cells", ["1,1", "3,3", "5,5"]);

        expect(Array.from(map.entries())).toEqual([
            ["1,1", { x: 1, y: 1 }],
            ["3,3", { x: 3, y: 3 }],
            ["5,5", { x: 5, y: 5 }],
        ]);
        expect(cells).toEqual({
            points: [
                { x: 1, y: 1 },
                { x: 3, y: 3 },
                { x: 5, y: 5 },
            ],
            settings: { cellSize: 2 },
            type: "cells",
        });
    });

    it("converts to SVGPoints", () => {
        const pt = pointTransformer({ cellSize: 2 });
        let [, cells] = pt.fromPoints("cells", ["1,1", "3,3", "5,5"]);

        expect(Array.from(cells.toSVGPoints().entries())).toEqual([
            [{ x: 1, y: 1 }, [1, 1]],
            [{ x: 3, y: 3 }, [3, 3]],
            [{ x: 5, y: 5 }, [5, 5]],
        ]);

        pt.settings.cellSize = 60; // The standard cellSize
        [, cells] = pt.fromPoints("cells", ["1,1", "3,3", "5,5"]);

        expect(Array.from(cells.toSVGPoints().entries())).toEqual([
            [{ x: 1, y: 1 }, [30, 30]],
            [{ x: 3, y: 3 }, [90, 90]],
            [{ x: 5, y: 5 }, [150, 150]],
        ]);
    });

    // This would just be copying values for now, but I might change how maxRadius works in the future, giving reason to test it.
    it.todo("gives the maxRadius");

    it("errors on invalid arguments to sorter", () => {
        const pt = pointTransformer();

        // Must provide 2 cardinal directions
        expect(() => pt.sorter({ direction: "" })).toThrow();
        expect(() => pt.sorter({ direction: "E" })).toThrow();

        // Must be from NESW
        expect(() => pt.sorter({ direction: "XY" })).toThrow();
    });

    it("sorts by primary then by secondary directions", () => {
        const pt = pointTransformer();
        const [, cells] = pt.fromPoints("cells", ["3,3", "1,3", "1,1", "3,1"]);

        const NW = pt.sorter({ direction: "NW" });
        // "3,1" before "1,3"
        expect([...cells.points].sort(NW).map(toPoint)).toEqual(["1,1", "3,1", "1,3", "3,3"]);

        const WN = pt.sorter({ direction: "WN" });
        // "1,3" before "3,1"
        expect([...cells.points].sort(WN).map(toPoint)).toEqual(["1,1", "1,3", "3,1", "3,3"]);
    });

    it("sorter is idempotent and consistent", () => {
        const CARDINAL = "NESW";
        given([
            // Even though it doesn't really matter (yet at least), make the coords odd so they are cell points.
            fc.array(FCRepeat(2, fc.integer()).map(([x, y]) => [x * 2 + 1, y * 2 + 1].join(","))),
            // Pick two orthogonal directions. Don't generate something like "NS" or "EE".
            fc
                .tuple(fc.integer({ min: 0, max: 3 }), fc.constantFrom(1, 3))
                .map(([a, b]) => CARDINAL[a] + CARDINAL[(a + b) % 4]),
        ]).assertProperty((points, direction) => {
            const pt = pointTransformer();
            const sorter = pt.sorter({ direction });
            const [, cells] = pt.fromPoints("cells", points);
            const sorted = [...cells.points].sort(sorter);

            // Sorting should be idempotent
            expect([...sorted].map(toPoint)).toEqual(sorted.map(toPoint));

            // Sorting order should be consistent, i.e. sorting order does not depend on starting order
            expect(shuffle(sorted).sort(sorter).map(toPoint)).toEqual(sorted.map(toPoint));
        });
    });

    it("svgOutline works on cells", () => {
        const pt = pointTransformer();
        const [cellMap, cells] = pt.fromPoints("cells", ["1,1", "-1,3", "-9,7"]);
        const [outlineMap] = pt.svgOutline(cells);

        expect(outlineMap.get(cellMap.get("1,1"))).toEqual([
            { x: 2, y: 2 },
            { x: 2, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 2 },
        ]);
        expect(outlineMap.get(cellMap.get("-1,3"))).toEqual([
            { x: 0, y: 4 },
            { x: 0, y: 2 },
            { x: -2, y: 2 },
            { x: -2, y: 4 },
        ]);
        expect(outlineMap.get(cellMap.get("-9,7"))).toEqual([
            { x: -8, y: 8 },
            { x: -8, y: 6 },
            { x: -10, y: 6 },
            { x: -10, y: 8 },
        ]);
    });
});

describe("SquareGridTransformer.shrinkwrap", () => {
    // cellSize defaults to 2 so that the grid space matches the svg space
    const pointTransformer = ({ cellSize = 2 } = {}) => new _SquareGridTransformer({ cellSize });

    const FCCellVector = () => {
        return FCRepeat(2, fc.integer()).map((vec) => Vec.from(vec).scale(2).plus([1, 1]));
    };

    const FCStraightVector = ({
        vertical = null as null | boolean,
        minLength = 1,
        max = 100,
    } = {}) => {
        return fc
            .tuple(fc.integer({ min: minLength > 0 ? minLength : undefined, max }), fc.boolean())
            .map(([n, vert]) => {
                n = 2 * n;
                return Vec.from(vertical ?? vert ? [0, n] : [n, 0]);
            });
    };

    // Points are not included in the FC arbitrary because it keeps the test output smaller
    const pointsFromLine = (start: Vec, vec: Vec) => {
        const unit = vec.unit();
        const points: string[] = [];

        for (let i = vec.size; i >= 0; i -= 2) {
            points.push(start.plus(unit.scale(i)).xy.join(","));
        }

        return points;
    };

    const boundingCorners = (start: Vec, vec: Vec) => {
        const end = start.plus(vec);
        return {
            NW: [start.x - 1, start.y - 1],
            NE: [end.x + 1, start.y - 1],
            SE: [end.x + 1, end.y + 1],
            SW: [start.x - 1, end.y + 1],
        } satisfies Record<string, TupleVector>;
    };

    // The shrinkwrap is only guaranteed to give the outline in a clockwise direction; we don't know which corner will be given first. This function "rotates" the array to a consistent start (with the max at the start)
    const putMaxAtStart = (arr: string[]) => {
        const max = arr.reduce(reduceTo.max(smartSort));
        const index = arr.indexOf(max);
        return [...arr.slice(index), ...arr.slice(0, index)];
    };

    it("shrinkwraps a simple line", () => {
        given([FCCellVector(), FCStraightVector()]).assertProperty((start, vec) => {
            const points = pointsFromLine(start, vec);
            const pt = pointTransformer();
            const [, cells] = pt.fromPoints("cells", shuffle(points));
            const shrinkwrap = pt.shrinkwrap(cells);

            const corners = boundingCorners(start, vec);
            const expected = [corners.NW, corners.NE, corners.SE, corners.SW].map((vec) =>
                vec.join(","),
            );

            expect(shrinkwrap).toHaveLength(1);
            expect(putMaxAtStart(shrinkwrap[0])).toEqual(putMaxAtStart(expected));
        });
    });

    it("shrinkwraps a rectangle", () => {
        given([FCCellVector(), FCRepeat(2, fc.integer({ min: 1, max: 30 }))]).assertProperty(
            (start, [width, height]) => {
                const points: string[] = [];
                for (let x = 0; x < 2 * width; x += 2) {
                    for (let y = 0; y < 2 * height; y += 2) {
                        points.push(`${start.x + x},${start.y + y}`);
                    }
                }

                expect(points).toHaveLength(width * height);

                const pt = pointTransformer();
                const [, cells] = pt.fromPoints("cells", shuffle(points));
                const shrinkwrap = pt.shrinkwrap(cells);

                const expected = [
                    start.plus([-1, -1]).xy,
                    start.plus([2 * width - 1, -1]).xy,
                    start.plus([2 * width - 1, 2 * height - 1]).xy,
                    start.plus([-1, 2 * height - 1]).xy,
                ].map((vec) => vec.join(","));

                expect(shrinkwrap).toHaveLength(1);
                expect(putMaxAtStart(shrinkwrap[0])).toEqual(putMaxAtStart(expected));
            },
        );
    });

    it("shrinkwraps an L", () => {
        given([
            fc
                .boolean()
                .chain((vert) =>
                    fc.tuple(
                        FCCellVector(),
                        FCStraightVector({ vertical: vert }),
                        FCStraightVector({ vertical: !vert }),
                    ),
                ),
        ]).assertProperty(([start, vec1, vec2]) => {
            const end = start.plus(vec1);
            const points1 = pointsFromLine(start, vec1);
            const points2 = pointsFromLine(end, vec2);

            const pt = pointTransformer();
            const [, cells] = pt.fromPoints(
                "cells",
                shuffle([...new Set([...points1, ...points2])]),
            );
            const shrinkwrap = pt.shrinkwrap(cells);

            const corners1 = boundingCorners(start, vec1);
            const corners2 = boundingCorners(end, vec2);
            let expected: string[];

            if (vec1.y) {
                // L corner is pointing down-left
                expected = [
                    corners1.NW,
                    corners1.NE,
                    end.plus([1, -1]).xy,
                    corners2.NE,
                    corners2.SE,
                    corners2.SW,
                ].map((vec) => vec.join(","));
            } else {
                // L corner is pointing up-right
                expected = [
                    corners1.SW,
                    corners1.NW,
                    corners1.NE,
                    corners2.SE,
                    corners2.SW,
                    end.plus([-1, 1]).xy,
                ].map((vec) => vec.join(","));
            }

            expect(shrinkwrap).toHaveLength(1);
            expect(putMaxAtStart(shrinkwrap[0])).toEqual(putMaxAtStart(expected));
        });
    });

    it("shrinkwraps a plus", () => {
        given([
            FCCellVector(),
            FCStraightVector({ minLength: 2, vertical: true }),
            FCStraightVector({ minLength: 2, vertical: false }),
            FCStraightVector({ minLength: 2, vertical: true }),
            FCStraightVector({ minLength: 2, vertical: false }),
        ]).assertProperty((center, up, right, down, left) => {
            up = up.scale(-1);
            left = left.scale(-1);

            const points = new Set([
                ...pointsFromLine(center, up),
                ...pointsFromLine(center, right),
                ...pointsFromLine(center, down),
                ...pointsFromLine(center, left),
            ]);

            const pt = pointTransformer();
            const [, cells] = pt.fromPoints("cells", shuffle([...points]));
            const shrinkwrap = pt.shrinkwrap(cells);

            const vecUp = center.plus(up);
            const vecRight = center.plus(right);
            const vecDown = center.plus(down);
            const vecLeft = center.plus(left);

            const expected = [
                vecUp.plus([-1, -1]),
                vecUp.plus([1, -1]),
                center.plus([1, -1]),
                vecRight.plus([1, -1]),
                vecRight.plus([1, 1]),
                center.plus([1, 1]),
                vecDown.plus([1, 1]),
                vecDown.plus([-1, 1]),
                center.plus([-1, 1]),
                vecLeft.plus([-1, 1]),
                vecLeft.plus([-1, -1]),
                center.plus([-1, -1]),
            ].map((vec) => vec.xy.join(","));

            expect(shrinkwrap).toHaveLength(1);
            expect(putMaxAtStart(shrinkwrap[0])).toEqual(putMaxAtStart(expected));
        });
    });

    it("shrinkwraps a rectangular loop", () => {
        given([
            FCCellVector(),
            FCStraightVector({ minLength: 2, vertical: false }),
            FCStraightVector({ minLength: 2, vertical: true }),
        ]).assertProperty((cornerNW, right, down) => {
            const cornerNE = cornerNW.plus(right);
            const cornerSW = cornerNW.plus(down);
            const cornerSE = cornerSW.plus(right);

            const points = new Set([
                ...pointsFromLine(cornerNW, down),
                ...pointsFromLine(cornerNW, right),
                ...pointsFromLine(cornerNE, down),
                ...pointsFromLine(cornerSW, right),
            ]);

            const pt = pointTransformer();
            const [, cells] = pt.fromPoints("cells", shuffle([...points]));
            const shrinkwrap = pt.shrinkwrap(cells);

            expect(shrinkwrap).toHaveLength(2);

            const outer = [
                cornerNW.plus([-1, -1]),
                cornerNE.plus([1, -1]),
                cornerSE.plus([1, 1]),
                cornerSW.plus([-1, 1]),
            ].map((vec) => vec.xy.join(","));
            const inner = [
                // inner goes counter-clockwise because the 'normals' point inwards instead of outwards
                cornerNW.minus([-1, -1]),
                cornerSW.minus([-1, 1]),
                cornerSE.minus([1, 1]),
                cornerNE.minus([1, -1]),
            ].map((vec) => vec.xy.join(","));

            expect(new Set(shrinkwrap.map(putMaxAtStart))).toEqual(
                new Set([putMaxAtStart(inner), putMaxAtStart(outer)]),
            );
        });
    });

    /**
     * The next two tests generate a shape made of cells like the following, and then
     * rotates by a random multiple of 90 degrees
     * +--+--+
     * |     |
     * +     +
     * |   [] <-- Makes a touching corner here
     * +--+
     */
    it("shrinkwraps one thing with touching corners, inset >= 0", () => {
        given([
            FCCellVector(),
            FCStraightVector({ minLength: 2, vertical: false }),
            FCStraightVector({ minLength: 2, vertical: true }),
            fc.integer({ min: 0, max: 3 }),
        ]).assertProperty((cornerNW, right, down, rotation) => {
            // Note: Because of the rotation, all the cardinal NESW directions are only true if rotation = 0
            // Using NESW just makes it easier to reason about things
            right = right.rotate90(rotation);
            down = down.rotate90(rotation);
            const rightUnit = right.unit();
            const downUnit = down.unit();

            const cornerNE = cornerNW.plus(right);
            const cornerSW = cornerNW.plus(down);
            const corner2Right = cornerSW.plus(right).minus(rightUnit.scale(2));
            const corner2Bottom = cornerNE.plus(down).minus(downUnit.scale(2));

            const points = new Set([
                ...pointsFromLine(cornerNW, down),
                ...pointsFromLine(cornerNW, right),
                ...pointsFromLine(cornerNE, down),
                ...pointsFromLine(cornerSW, right),
            ]);

            const deleted = points.delete(corner2Right.plus(rightUnit.scale(2)).xy.join(","));
            expect(deleted).toBe(true);

            const pt = pointTransformer({ cellSize: 20 });
            const [, cells] = pt.fromPoints("cells", shuffle([...points]));
            const shrinkwrap = pt.shrinkwrap(cells, { inset: 1 });

            expect(shrinkwrap).toHaveLength(1);

            const zero = new Vec(0, 0);
            const NW = zero.minus(downUnit).minus(rightUnit);
            const NE = zero.minus(downUnit).plus(rightUnit);
            const SE = zero.plus(downUnit).plus(rightUnit);
            const SW = zero.plus(downUnit).minus(rightUnit);

            // cell.plus(offsetToShrinkwrapCorner).scale(toSVGCoordinates).minus(inset = 1)
            const halfCell = 10;
            const expected = [
                cornerNW.plus(NW).scale(halfCell).minus(NW),
                cornerNE.plus(NE).scale(halfCell).minus(NE),
                corner2Bottom.plus(SE).scale(halfCell).minus(SE),
                corner2Bottom.plus(SW).scale(halfCell).minus(SW),
                cornerNE.plus(SW).scale(halfCell).minus(SW),
                cornerNW.plus(SE).scale(halfCell).minus(SE),
                cornerSW.plus(NE).scale(halfCell).minus(NE),
                corner2Right.plus(NE).scale(halfCell).minus(NE),
                corner2Right.plus(SE).scale(halfCell).minus(SE),
                cornerSW.plus(SW).scale(halfCell).minus(SW),
            ].map((vec) => vec.xy.join(","));

            expect(putMaxAtStart(shrinkwrap[0])).toEqual(putMaxAtStart(expected));
        });
    });

    it("shrinkwraps one thing with touching corners, inset < 0", () => {
        given([
            FCCellVector(),
            FCStraightVector({ minLength: 2, vertical: false }),
            FCStraightVector({ minLength: 2, vertical: true }),
            fc.integer({ min: 0, max: 3 }),
        ]).assertProperty((cornerNW, right, down, rotation) => {
            // Note: Because of the rotation, all the cardinal NESW directions are only true if rotation = 0
            // Using NESW just makes it easier to reason about things
            right = right.rotate90(rotation);
            down = down.rotate90(rotation);
            const rightUnit = right.unit();
            const downUnit = down.unit();

            const cornerNE = cornerNW.plus(right);
            const cornerSW = cornerNW.plus(down);
            const cornerOnRight = cornerSW.plus(right).minus(rightUnit.scale(2));
            const cornerOnBottom = cornerNE.plus(down).minus(downUnit.scale(2));

            const points = new Set([
                ...pointsFromLine(cornerNW, down),
                ...pointsFromLine(cornerNW, right),
                ...pointsFromLine(cornerNE, down),
                ...pointsFromLine(cornerSW, right),
            ]);

            const deleted = points.delete(cornerOnRight.plus(rightUnit.scale(2)).xy.join(","));
            expect(deleted).toBe(true);

            const pt = pointTransformer({ cellSize: 20 });
            const [, cells] = pt.fromPoints("cells", shuffle([...points]));
            const shrinkwrap = pt.shrinkwrap(cells, { inset: -1 });

            expect(shrinkwrap).toHaveLength(2);

            const zero = new Vec(0, 0);
            const NW = zero.minus(downUnit).minus(rightUnit);
            const NE = zero.minus(downUnit).plus(rightUnit);
            const SE = zero.plus(downUnit).plus(rightUnit);
            const SW = zero.plus(downUnit).minus(rightUnit);

            // cell.plus(offsetToShrinkwrapCorner).scale(toSVGCoordinates).plus(inset = -1)
            const halfCell = 10;
            const outer = [
                cornerNW.plus(NW).scale(halfCell).plus(NW),
                cornerNE.plus(NE).scale(halfCell).plus(NE),
                cornerOnBottom.plus(SE).scale(halfCell).plus(SE),
                cornerOnBottom.plus(SW).scale(halfCell).plus(SE), // Bottom-right inset corner
                cornerOnRight.plus(SE).scale(halfCell).plus(SE),
                cornerSW.plus(SW).scale(halfCell).plus(SW),
            ].map((vec) => vec.xy.join(","));
            const inner = [
                // inner goes counter-clockwise because the 'normals' point inwards instead of outwards
                cornerNW.plus(SE).scale(halfCell).plus(SE),
                cornerSW.plus(NE).scale(halfCell).plus(NE),
                cornerNW.plus(right).plus(down).plus(NW).scale(halfCell).plus(NW),
                cornerNE.plus(SW).scale(halfCell).plus(SW),
            ].map((vec) => vec.xy.join(","));

            expect(new Set(shrinkwrap.map(putMaxAtStart))).toEqual(
                new Set([putMaxAtStart(inner), putMaxAtStart(outer)]),
            );
        });
    });

    it("shrinkwraps two things with touching corners, inset >= 0", () => {
        const pt = pointTransformer({ cellSize: 20 });
        {
            const [, cells] = pt.fromPoints("cells", shuffle(["1,1", "3,3"]));
            const shrinkwrap = pt.shrinkwrap(cells, { inset: 1 });

            const expected: typeof shrinkwrap = [
                ["1,1", "19,1", "19,19", "1,19"],
                ["21,21", "39,21", "39,39", "21,39"],
            ];

            expect(shrinkwrap).toHaveLength(2);
            expect(new Set(shrinkwrap.map(putMaxAtStart))).toEqual(
                new Set(expected.map(putMaxAtStart)),
            );
        }
        {
            const [, cells] = pt.fromPoints("cells", shuffle(["3,1", "1,3"]));
            const shrinkwrap = pt.shrinkwrap(cells, { inset: 1 });

            const expected: typeof shrinkwrap = [
                ["1,21", "19,21", "19,39", "1,39"],
                ["21,1", "39,1", "39,19", "21,19"],
            ];

            expect(shrinkwrap).toHaveLength(2);
            expect(new Set(shrinkwrap.map(putMaxAtStart))).toEqual(
                new Set(expected.map(putMaxAtStart)),
            );
        }
    });

    it("shrinkwraps two things with touching corners, inset < 0", () => {
        const pt = pointTransformer({ cellSize: 20 });
        {
            const [, cells] = pt.fromPoints("cells", shuffle(["1,1", "3,3"]));
            const shrinkwrap = pt.shrinkwrap(cells, { inset: -1 });

            const expected = [
                "-1,-1",
                "21,-1",
                "21,19",
                "41,19",
                "41,41",
                "19,41",
                "19,21",
                "-1,21",
            ];

            expect(shrinkwrap).toHaveLength(1);
            expect(putMaxAtStart(shrinkwrap[0])).toEqual(putMaxAtStart(expected));
        }
        {
            const [, cells] = pt.fromPoints("cells", shuffle(["1,3", "3,1"]));
            const shrinkwrap = pt.shrinkwrap(cells, { inset: -1 });

            const expected = [
                "19,-1",
                "41,-1",
                "41,21",
                "21,21",
                "21,41",
                "-1,41",
                "-1,19",
                "19,19",
            ];

            expect(shrinkwrap).toHaveLength(1);
            expect(putMaxAtStart(shrinkwrap[0])).toEqual(putMaxAtStart(expected));
        }
    });
});
