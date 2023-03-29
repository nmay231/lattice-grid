import fc from "fast-check";
import { TupleVector } from "../types";
import { parseIntBase, zip } from "../utils/data";
import { Vec } from "../utils/math";
import { given } from "../utils/testing/fcArbitraries";
import { hopStraight } from "./hopStraight";

describe("hopStraight", () => {
    const orthogonal: Vec[] = [new Vec(0, 2), new Vec(0, -2), new Vec(2, 0), new Vec(-2, 0)];
    const eightAdjacent: Vec[] = [
        ...orthogonal,
        new Vec(2, 2),
        new Vec(2, -2),
        new Vec(-2, 2),
        new Vec(-2, -2),
    ];
    const knight: Vec[] = [
        new Vec(2, 4),
        new Vec(2, -4),
        new Vec(-2, 4),
        new Vec(-2, -4),
        new Vec(4, 2),
        new Vec(4, -2),
        new Vec(-4, 2),
        new Vec(-4, -2),
    ];

    it.todo("will be replaced with FSM anyways, so I don't care too much about tests");

    it("takes a shorter path than a random walk", () => {
        given([
            fc.constantFrom(orthogonal, eightAdjacent, knight).chain((moveSet) =>
                fc.tuple(
                    fc.constant(moveSet),
                    fc.array(fc.integer({ min: 0, max: moveSet.length - 1 }), {
                        maxLength: 95,
                    }),
                ),
            ),
        ]).assertProperty(([moveSet, indexes]) => {
            const moves = indexes.map((i) => moveSet[i]);

            const start = new Vec(0, 0);
            let target = start;
            for (const move of moves) {
                target = target.plus(move);
            }

            const vecToString = (vec: Vec) => vec.xy.join(",");
            const points = hopStraight({
                start,
                cursor: target,
                deltas: moveSet,
                targets: [target],
                toString: vecToString,
            });

            expect(points.length).toBeLessThanOrEqual(moves.length);

            const vecPoints = points.map((string) =>
                Vec.from(string.split(",").map(parseIntBase(10)) as TupleVector),
            );

            const vecMoves = Array.from(zip([start].concat(vecPoints.slice(0, -1)), vecPoints)).map(
                ([prev, next]) => next.minus(prev),
            );

            const moveSetStrings = moveSet.map(vecToString);

            for (const move of vecMoves.map(vecToString)) {
                expect(moveSetStrings).includes(move);
            }

            if (moveSet !== knight && points.length) {
                expect(points.at(-1)).toEqual(vecToString(target));
            }
        });
    });
});
