import fc from "fast-check";
import { Delta, Vector } from "../types";
import { hopStraight } from "./hopStraight";

describe("hopStraight", () => {
    console.log("todo" || hopStraight);

    type Arg = Parameters<typeof hopStraight>[0] & {
        targetPoints: string[];
        round?: (n: number) => number;
    };
    type Result = "REACHED_TARGET" | "OVERSHOT_POINT" | "REVISITED_POINT" | "MAX_ITERATION";

    const simpleRound = (n: number) => Math.round(n);

    const helper = ({
        previousPoint,
        deltas,
        cursor,
        targetPoints,
        round = simpleRound,
    }: Arg): [Vector[], Result] => {
        if (targetPoints.includes(previousPoint.toString())) {
            return [[], "REACHED_TARGET"];
        }
        const generator = hopStraight({
            previousPoint,
            deltas,
            cursor,
        });
        const points: string[] = [previousPoint.toString()];
        const path: Array<Vector> = [];

        let maxIteration = 100; // Prevent infinite loops
        while (maxIteration > 0) {
            maxIteration -= 1;
            const next = (generator.next(previousPoint).value?.map(round) || null) as Vector | null;
            if (!next) return [path, "OVERSHOT_POINT"];

            const string = next?.join(",");
            if (points.includes(string)) return [path, "REVISITED_POINT"];

            points.push(string);
            path.push(next);
            if (targetPoints.includes(string)) return [path, "REACHED_TARGET"];

            previousPoint = next;
        }

        return [path, "MAX_ITERATION"];
    };

    const orthogonal: Delta[] = [
        { dx: 0, dy: 2 },
        { dx: 0, dy: -2 },
        { dx: 2, dy: 0 },
        { dx: -2, dy: 0 },
    ];
    const eightAdjacent: Delta[] = [
        ...orthogonal,
        { dx: 2, dy: 2 },
        { dx: 2, dy: -2 },
        { dx: -2, dy: 2 },
        { dx: -2, dy: -2 },
    ];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const knight: Delta[] = [
        { dx: 2, dy: 4 },
        { dx: 2, dy: -4 },
        { dx: -2, dy: 4 },
        { dx: -2, dy: -4 },
        { dx: 4, dy: 2 },
        { dx: 4, dy: -2 },
        { dx: -4, dy: 2 },
        { dx: -4, dy: -2 },
    ];

    it("should find the optimal path with simple deltas", () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.tuple(
                        fc.constant(orthogonal),
                        fc.array(fc.integer({ min: 0, max: 3 }), { maxLength: 99 }),
                    ),
                    fc.tuple(
                        fc.constant(eightAdjacent),
                        fc.array(fc.integer({ min: 0, max: 7 }), { maxLength: 99 }),
                    ),
                ),
                ([moveSet, indexes]) => {
                    const moves = indexes.map((i) => moveSet[i]);

                    const vector = [0, 0] as Vector;
                    for (const { dx, dy } of moves) {
                        vector[0] += dx;
                        vector[1] += dy;
                    }

                    const [vectors, result] = helper({
                        previousPoint: [0, 0],
                        deltas: moveSet,
                        cursor: vector,
                        targetPoints: [vector.toString()],
                    });

                    expect(result).toBe<Result>("REACHED_TARGET");

                    // the path taken to get to a vector cannot be longer
                    expect(vectors.length).toBeLessThanOrEqual(moves.length);

                    // TODO: The sum of the vectors make the original vector. This doesn't work currently
                    // expect(
                    //     vectors.reduce(([x1, y1], [x2, y2]) => [x1 + x2, y1 + y2], [0, 0]),
                    // ).toEqual(vector);
                },
            ),
            // TODO: Make this an option in vitest config or something instead of in the test itself.
            { verbose: true },
        );
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const tall: Delta[] = [
        { dx: -1, dy: 5 },
        { dx: 1, dy: 5 },
        { dx: -1, dy: -5 },
        { dx: 1, dy: -5 },
    ];
    it.todo("should never generate vectors more than 45 degrees from the start-end vector");

    // TODO: Remember that in square grids, there is no difference between cells and corners except that they are offset one (1, 1).
    // TODO: Add relevant tests for non-square grids.
    it.skip("should select a straight line of cells in a square grid", () => {
        // expect(
        //     helper({
        //         cursor: [],
        //         deltas,
        //     }),
        // );
    });

    it.todo("should select a straight line of edges in a square grid");

    it.todo("should select a slightly diagonal line of cells in a square grid");

    it.todo("should select a slightly diagonal line of edges in a square grid");

    it.todo("should select a perfectly diagonal line of cells (and cut corners) in a square grid");

    it.todo(
        "Check that the standard orthogonal move set allows you to cut corners (and then remove that test stub from selection, since that's useless)",
    );
});
