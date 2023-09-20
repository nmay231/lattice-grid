import { Vec } from "../utils/math";

type Arg = {
    start?: Vec;
    targets: Vec[];
    cursor: Vec;
    deltas: Vec[];
    toString: (vec: Vec) => string;
};

export const hopStraight = ({ start, targets, cursor, deltas, toString }: Arg) => {
    if (!deltas.length) return [];
    if (!start) {
        const closest = targets.reduce((prev, next) =>
            prev.minus(cursor).size < next.minus(cursor).size ? prev : next,
        );
        return [toString(closest)];
    }
    const targetStrings = targets.map(toString);

    let direction = start.drawTo(cursor);
    let current = start;
    let maxIterations = 100;

    // We include the starting point only to prevent revisiting it
    const points = [toString(start)];
    if (targetStrings.includes(points[0])) return [];

    while (direction.positiveAngleTo(start.drawTo(cursor)) < Math.PI / 2 && --maxIterations > 0) {
        const bestDelta = deltas.reduce((prev, next) =>
            prev.positiveAngleTo(direction) < next.positiveAngleTo(direction) ? prev : next,
        );
        current = current.plus(bestDelta);
        direction = current.drawTo(cursor);

        const point = toString(current);
        if (points.includes(point)) return points.slice(1);

        points.push(point);
        if (targetStrings.includes(point)) return points.slice(1);
    }

    return points.slice(1);
};
