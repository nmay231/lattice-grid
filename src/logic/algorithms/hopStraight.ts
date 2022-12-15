import { Delta, Vector } from "../../types";

const atan = (x: number, y: number) => (x < 0 ? -1 : 1) * Math.atan(y / x);
// TODO: Move to separate file and test more.
export const euclidean = (x1: number, y1: number, x2: number, y2: number) =>
    ((x1 - x2) ** 2 + (y1 - y2) ** 2) ** 0.5;

type Arg = {
    cursor: [number, number];
    previousPoint: [number, number];
    deltas: Delta[];
};

/**
 *
 * @param {Object} args
 * @param {[number, number]} args.cursor - The cursor position (scaled to grid coordinates)
 * @param {[number, number]} args.previousPoint - The previous selected point, i.e. the target point from last time
 * @param {{dx: number, dy: number}[]} args.deltas - The path must use these set of "hops" or vectors
 * @yields {null | [number, number]}
 */
export function* hopStraight({
    cursor,
    previousPoint,
    deltas,
}: Arg): Generator<[number, number] | null, void, [number, number]> {
    const [startX, startY] = previousPoint;
    const [targetX, targetY] = cursor;

    const vectors = deltas
        .filter(
            ({ dx, dy }) =>
                Math.abs(atan(dx, dy) - atan(startX - targetX, startY - targetY)) <= Math.PI,
        )
        .map(({ dx, dy }) => [dx, dy]);
    if (!vectors.length) {
        yield null;
        return;
    }
    const toMinimize = (x: number, y: number) => {
        const bx = targetX - startX;
        const by = targetY - startY;
        const ax = x - startX;
        const ay = y - startY;

        const coefficient = (ax * bx + ay * by) / (bx ** 2 + by ** 2);
        const vec = [coefficient * bx, coefficient * by];
        const distanceToLine = euclidean(ax, ay, vec[0], vec[1]);
        const distanceToTarget = euclidean(x, y, targetX, targetY);
        return distanceToTarget + distanceToLine;
    };

    const cursorDistance = euclidean(startX, startY, targetX, targetY);
    let newX = startX,
        newY = startY;

    while (euclidean(newX, newY, startX, startY) < cursorDistance) {
        const bestDelta = vectors.reduce(([dx1, dy1], [dx2, dy2]) =>
            toMinimize(newX + dx1, newY + dy1) < toMinimize(newX + dx2, newY + dy2)
                ? [dx1, dy1]
                : [dx2, dy2],
        );

        newX += bestDelta[0];
        newY += bestDelta[1];

        // Doing this will (hopefully) help with floating point errors for non-square grids.
        [newX, newY] = yield [newX, newY] as Vector;
    }
    yield null;
}
