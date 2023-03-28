import { Vec } from "../utils/math";

type Arg = {
    start?: Vec;
    targets: Vec[];
    cursor: Vec;
    deltas: Vec[];
    toString: (vec: Vec) => string;
};

/**
 * Using a greedy algorithm, pick the deltas that minimize the angle to the cursor and include all points that don't overshoot it by distance
 */
export const prioritizeDirection = ({ start, targets, cursor, deltas, toString }: Arg) => {
    if (!deltas.length) return [];
    const targetStrings = targets.map(toString);
    if (!start) {
        const closest = targets.reduce((prev, next) =>
            prev.minus(cursor).size < next.minus(cursor).size ? prev : next,
        );
        return [toString(closest)];
    }

    let direction = cursor.minus(start);
    let current = start;
    let maxIterations = 100;

    const points = [toString(current)];
    if (targetStrings.includes(points[0])) return [];

    while (direction.dotProduct(cursor.minus(start)) > 0 && --maxIterations > 0) {
        const bestDelta = deltas.reduce((prev, next) =>
            prev.scalarProjectionOnto(direction) >= next.scalarProjectionOnto(direction)
                ? prev
                : next,
        );
        current = current.plus(bestDelta);
        direction = cursor.minus(current);

        const point = toString(current);
        if (points.includes(point)) return points.slice(1);

        points.push(point);
        if (targetStrings.includes(point)) return points.slice(1);
    }

    return points.slice(1);
};
