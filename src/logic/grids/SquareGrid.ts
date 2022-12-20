import { Grid, Point, PointType, Vector } from "../../types";
import { errorNotification } from "../../utils/DOMUtils";
import { euclidean, hopStraight } from "../algorithms/hopStraight";
import { PuzzleManager } from "../PuzzleManager";

export type SquareGridParams = {
    type: "square";
    width: number;
    height: number;
    minX: number;
    minY: number;
};

type GridPoint = { x: number; y: number; type: PointType };
type GetPointsArg = Parameters<Grid["getPoints"]>[0];
type InternalGetPointsArg = Parameters<Grid["getPoints"]>[0] & {
    pointType: PointType;
    gridPoints: { point: GridPoint; result: any }[];
    finalResult: any;
};

export class SquareGrid implements Grid {
    id = "TODO: use a uuid generator";
    width = 1;
    height = 1;
    x0 = 0;
    y0 = 0;
    constructor(params?: SquareGridParams) {
        this.setParams(params);
    }

    getParams(): SquareGridParams {
        return {
            type: "square",
            width: this.width,
            height: this.height,
            minX: this.x0,
            minY: this.y0,
        };
    }

    setParams(params?: SquareGridParams) {
        this.width = params?.width ?? 1;
        this.height = params?.height ?? 1;
        this.x0 = params?.minX ?? 0;
        this.y0 = params?.minY ?? 0;
    }

    getCanvasRequirements: Grid["getCanvasRequirements"] = ({ settings }) => {
        const { cellSize, borderPadding } = settings;
        return {
            minX: this.x0 * cellSize - borderPadding,
            minY: this.y0 * cellSize - borderPadding,
            width: this.width * cellSize + 2 * borderPadding,
            height: this.height * cellSize + 2 * borderPadding,
        };
    };

    getCanvasResizers() {
        // TODO: introduce corner resizers that resize two sides at the same time.
        return [
            {
                name: "Top",
                x: 5,
                y: 0,
                rotate: 0,
                resize: (amount: number) => {
                    this.y0 -= amount;
                    this.height += amount;
                },
            },
            {
                name: "Right",
                x: 10,
                y: 5,
                rotate: 90,
                resize: (amount: number) => {
                    this.width += amount;
                },
            },
            {
                name: "Bottom",
                x: 5,
                y: 10,
                rotate: 180,
                resize: (amount: number) => {
                    this.height += amount;
                },
            },
            {
                name: "Left",
                x: 0,
                y: 5,
                rotate: 270,
                resize: (amount: number) => {
                    this.x0 -= amount;
                    this.width += amount;
                },
            },
        ];
    }

    selectPointsWithCursor: Grid["selectPointsWithCursor"] = ({
        settings,
        cursor,
        pointTypes,
        // TODO: implement deltas as Finite State Machines for more capabilities and better cross-compatibility between grid types
        deltas,
        previousPoint = null,
    }) => {
        const { cellSize } = settings;
        const halfCell = cellSize / 2;

        cursor.x /= halfCell;
        cursor.y /= halfCell;

        const firstPoint = [Math.floor(cursor.x), Math.floor(cursor.y)] as Vector;
        const closestPoints = [
            firstPoint,
            [firstPoint[0] + 1, firstPoint[1]],
            [firstPoint[0], firstPoint[1] + 1],
            [firstPoint[0] + 1, firstPoint[1] + 1],
        ]
            .map((p) => this._stringToGridPoint(p.toString()))
            .filter(({ type }) => pointTypes.includes(type));

        if (previousPoint === null) {
            const closestCorrectType = closestPoints.reduce((prev, next) =>
                euclidean(prev.x, prev.y, cursor.x, cursor.y) <
                euclidean(next.x, next.y, cursor.x, cursor.y)
                    ? prev
                    : next,
            );
            return [`${closestCorrectType.x},${closestCorrectType.y}`];
        }

        let previousGridPoint = previousPoint.split(",").map((x) => parseInt(x)) as [
            number,
            number,
        ];
        const nearby = deltas.map(
            ({ dx, dy }) => `${previousGridPoint[0] + dx},${previousGridPoint[1] + dy}`,
        );
        const targetPointsString = closestPoints.map(({ x, y }) => `${x},${y}`);
        const intersection = targetPointsString.filter(
            (targetPoint) => nearby.indexOf(targetPoint) > -1,
        );
        if (intersection.length) {
            // TODO: Technically, not the closest, but whatever.
            return intersection.slice(0, 1);
        }

        const generator = hopStraight({
            previousPoint: previousGridPoint,
            deltas,
            cursor: [cursor.x, cursor.y],
        });
        const points = [previousGridPoint.toString()];

        let maxIteration = 100; // Prevent infinite loops
        while (maxIteration > 0) {
            const next = generator.next(previousGridPoint).value?.map((v) => Math.round(v)) as
                | [number, number]
                | null;
            const string = previousGridPoint.toString();
            if (!next || points.includes(string)) {
                return [];
            }
            previousGridPoint = next;
            points.push(string);
            if (targetPointsString.includes(string)) {
                // Exclude starting point.
                return points.slice(1);
            }
            maxIteration -= 1;
        }
        return [];
    };

    getPoints({
        settings,
        points: stringPoints = [],
        connections,
        includeOutOfBounds = false,
    }: GetPointsArg) {
        const finalResult: any = {};
        const points = stringPoints.map(this._stringToGridPoint.bind(this));

        for (const key in connections) {
            const pointType = key as PointType;
            const justGridPoints = points.length
                ? points.filter(({ type }) => type === pointType)
                : this._getAllGridPoints(pointType);

            finalResult[pointType] = {};
            const gridPoints = [];
            for (const point of justGridPoints) {
                const result = {};
                finalResult[pointType][`${point.x},${point.y}`] = result;
                gridPoints.push({ point, result });
            }

            this._getPoints({
                settings,
                pointType,
                connections: connections[pointType],
                gridPoints,
                finalResult,
                includeOutOfBounds,
            });
        }

        return finalResult;
    }

    _outOfBounds(gridPoint: GridPoint) {
        const x = gridPoint.x / 2 - this.x0;
        const y = gridPoint.y / 2 - this.y0;
        return x < 0 || x > this.width || y < 0 || y > this.height;
    }

    _getPoints({
        settings,
        pointType,
        connections,
        gridPoints,
        finalResult,
        includeOutOfBounds,
    }: InternalGetPointsArg) {
        for (const key in connections) {
            const nextType = key as PointType;
            let deltas;
            switch (`${pointType}->${nextType}`) {
                case "corners->cells":
                case "cells->corners":
                    deltas = [
                        { dx: 1, dy: 1 },
                        { dx: -1, dy: 1 },
                        { dx: 1, dy: -1 },
                        { dx: -1, dy: -1 },
                    ];
                // eslint-disable-next-line no-fallthrough
                case "cells->edges":
                case "corners->edges": {
                    deltas = deltas ?? [
                        { dx: 0, dy: 1 },
                        { dx: 0, dy: -1 },
                        { dx: 1, dy: 0 },
                        { dx: -1, dy: 0 },
                    ];

                    const newGridPoints = [];
                    for (const { point, result } of gridPoints) {
                        result[nextType] = result[nextType] ?? {};

                        for (const { dx, dy } of deltas) {
                            const nextPoint = {
                                x: point.x + dx,
                                y: point.y + dy,
                                type: nextType,
                            };
                            const nextString = `${nextPoint.x},${nextPoint.y}`;
                            if (!includeOutOfBounds && this._outOfBounds(nextPoint)) {
                                continue;
                            }

                            const nextResult =
                                result[nextType][nextString] ||
                                (connections[nextType] === true ? null : {});
                            result[nextType][nextString] = nextResult;
                            newGridPoints.push({
                                point: nextPoint,
                                result: nextResult,
                            });
                        }
                    }
                    this._getPoints({
                        settings,
                        pointType: nextType,
                        connections: connections[nextType],
                        gridPoints: newGridPoints,
                        includeOutOfBounds,
                        finalResult,
                    });
                    break;
                }
                case "edges->cells":
                case "edges->corners": {
                    const upDown = [
                        { dx: 0, dy: -1 },
                        { dx: 0, dy: 1 },
                    ];
                    const leftRight = [
                        { dx: -1, dy: 0 },
                        { dx: 1, dy: 0 },
                    ];

                    const newGridPoints = [];
                    for (const { point, result } of gridPoints) {
                        // (connection === edges->cells) XOR (x is even) ? upDown : leftRight
                        const neighbors =
                            (nextType === "cells") !== (point.x === (point.x >> 1) << 1)
                                ? upDown
                                : leftRight;

                        result[nextType] = result[nextType] ?? {};

                        for (const { dx, dy } of neighbors) {
                            const nextPoint = {
                                x: point.x + dx,
                                y: point.y + dy,
                                type: nextType,
                            };
                            const nextString = `${nextPoint.x},${nextPoint.y}`;
                            if (!includeOutOfBounds && this._outOfBounds(nextPoint)) {
                                continue;
                            }

                            const nextResult =
                                result[nextType][nextString] ||
                                (connections[nextType] === true ? null : {});
                            result[nextType][nextString] = nextResult;
                            newGridPoints.push({
                                point: nextPoint,
                                result: nextResult,
                            });
                        }
                    }
                    this._getPoints({
                        settings,
                        pointType: nextType,
                        connections: connections[nextType],
                        gridPoints: newGridPoints,
                        includeOutOfBounds,
                        finalResult,
                    });
                    break;
                }
                case "cells->svgPoint":
                case "edges->svgPoint":
                case "corners->svgPoint": {
                    if (connections[nextType] !== true) {
                        // TODO
                        throw errorNotification({
                            error: null,
                            message: "Params for svgPoint are not supported!",
                            forever: true,
                        });
                    }

                    const { cellSize } = settings;
                    const halfCell = cellSize / 2;
                    for (const { point, result } of gridPoints) {
                        result[nextType] = [point.x * halfCell, point.y * halfCell];
                    }
                    break;
                }
                case "cells->svgOutline": {
                    if (connections[nextType] !== true) {
                        // TODO
                        throw errorNotification({
                            error: null,
                            message: "Params for svgOutline are not supported!",
                            forever: true,
                        });
                    }

                    const { cellSize } = settings;
                    const halfCell = cellSize / 2;
                    for (const { point, result } of gridPoints) {
                        result[nextType] = [
                            [(point.x - 1) * halfCell, (point.y - 1) * halfCell],
                            [(point.x + 1) * halfCell, (point.y - 1) * halfCell],
                            [(point.x + 1) * halfCell, (point.y + 1) * halfCell],
                            [(point.x - 1) * halfCell, (point.y + 1) * halfCell],
                        ];
                    }
                    break;
                }
                case "cells->shrinkwrap": {
                    const result: any = {};
                    const { key, svgPolygons, edgePoints } = connections[nextType];
                    finalResult[key || "shrinkwrap"] = result;

                    if (svgPolygons) {
                        result.svgPolygons = this._shrinkwrap({
                            settings,
                            gridPoints: gridPoints.map(({ point }) => point),
                            inset: svgPolygons.inset ?? 0,
                        });
                    }
                    if (edgePoints) {
                        // TODO
                    }
                    break;
                }
                case "cells->sorted":
                case "corners->sorted":
                case "edges->sorted": {
                    const { key, direction } = connections[nextType];

                    if (typeof direction !== "string" || direction.length !== 2) {
                        throw errorNotification({
                            error: null,
                            message: `param direction required to be string of length two instead of "${direction}"`,
                            forever: true,
                        });
                    }
                    const [primary, secondary] = direction.toUpperCase();

                    type XYPoint = { x: number; y: number };
                    const sorts: Record<string, (a: XYPoint, b: XYPoint) => number> = {
                        N: (a, b) => a.y - b.y,
                        S: (a, b) => b.y - a.y,
                        E: (a, b) => b.x - a.x,
                        W: (a, b) => a.x - b.x,
                    };
                    finalResult[key || "sorted"] = gridPoints
                        .map(({ point }) => point)
                        // Yes, we sort by the secondary direction before the primary.
                        .sort(sorts[secondary])
                        .sort(sorts[primary])
                        .map((point) => `${point.x},${point.y}`);
                    break;
                }
                case "corners->rows":
                case "cells->rows": {
                    const { types } =
                        connections[nextType] === true ? { types: "all" } : connections[nextType];

                    const horizontal = types === "all" || types?.indexOf("horizontal") > -1;
                    const vertical = types === "all" || types?.indexOf("vertical") > -1;

                    for (const { point, result } of gridPoints) {
                        const isCell = point.type === "cells";
                        const rows = [];
                        if (horizontal) {
                            const horRow = [];
                            for (
                                let x = this.x0 * 2 + Number(isCell);
                                x <= 2 * this.width;
                                x += 2
                            ) {
                                horRow.push(`${x},${point.y}`);
                            }
                            rows.push(horRow);
                        }
                        if (vertical) {
                            const verRow = [];
                            for (
                                let y = this.y0 * 2 + Number(isCell);
                                y <= 2 * this.height;
                                y += 2
                            ) {
                                verRow.push(`${point.x},${y}`);
                            }
                            rows.push(verRow);
                        }
                        result[nextType] = rows;
                    }
                    break;
                }
                case "cells->maxRadius":
                case "corners->maxRadius":
                case "edges->maxRadius": {
                    const { shape, size } = connections[nextType];
                    let radius = settings.cellSize / 2;

                    // I'm literally making up these values as I go along...
                    const shapeMap: Record<PointType, Record<string, number>> = {
                        cells: { square: 1, circle: 1 },
                        corners: { square: 0.9, circle: 1 },
                        edges: { square: 0.8, circle: 0.8 },
                    };
                    const sizeMap: Record<PointType, Record<string, number>> = {
                        cells: { large: 0.9, medium: 0.5, small: 0.2 },
                        corners: { large: 0.8, medium: 0.4, small: 0.1 },
                        edges: { large: 0.8, medium: 0.4, small: 0.2 },
                    };

                    radius *= shapeMap[pointType][shape] * sizeMap[pointType][size];

                    for (const { result } of gridPoints) {
                        // For some other grids, the radius will be different for different cells, etc.
                        result[nextType] = radius;
                    }

                    break;
                }
                default:
                    throw errorNotification({ error: null, message: "", forever: true });
            }
        }
    }

    _shrinkwrap({
        settings,
        gridPoints,
        inset,
    }: {
        settings: PuzzleManager["settings"];
        gridPoints: GridPoint[];
        inset?: number;
    }) {
        inset = inset || 0;
        const cellPoints: [number, number][] = [];
        const edgesLeft: Record<string, [number, number]> = {};
        let [dx, dy] = [0, -1];
        for (const cell of gridPoints) {
            const { x, y } = cell;
            for (let i = 0; i < 4; i++) {
                const edge = `${x + dx},${y + dy}`;
                if (edge in edgesLeft) {
                    delete edgesLeft[edge];
                } else {
                    edgesLeft[edge] = [x, y];
                }
                [dx, dy] = [-dy, dx];
            }
            cellPoints.push([x, y]);
        }

        // Points are converted to strings to allow easy comparison
        const cells = cellPoints.map((cell) => cell.toString());
        let maxIteration = 100 * cells.length; // Prevent infinite loops
        const result = [];

        while (Object.keys(edgesLeft).length && maxIteration > 0) {
            maxIteration--;

            const edgeKey = Object.keys(edgesLeft)[0];
            const firstEdge = edgeKey.split(",").map((i) => parseInt(i));

            let next: [number, number];
            let current = edgesLeft[edgeKey];
            [dx, dy] = [firstEdge[0] - current[0], firstEdge[1] - current[1]];

            let cellAcrossBoundary = (cell: [number, number]) => !cells.includes(cell.toString());

            // If the inset is negative, we traverse around the outside instead of the inside.
            // Otherwise, lines would overlap on touching corners
            if (inset < 0) {
                cellAcrossBoundary = (cell) => cells.includes(cell.toString());
                current = [current[0] + 2 * dx, current[1] + 2 * dy];
                [dx, dy] = [-dx, -dy];
            }

            let edge: [number, number] | "asdf" = "asdf";
            const edgeLoop = [];

            // Collect the edges around a contiguous group of cells
            while (edge.toString() !== edgeLoop[0]?.toString() && maxIteration > 0) {
                maxIteration--;
                next = [current[0] + 2 * dx, current[1] + 2 * dy];

                if (cellAcrossBoundary(next)) {
                    // Add the edge to the loop and rotate clockwise
                    edge = [current[0] + dx, current[1] + dy];
                    edgeLoop.push(edge);
                    [dx, dy] = [-dy, dx];

                    if (edgeLoop.length === 1) {
                        edge = "asdf"; // Prevent a premature stop
                    }
                } else {
                    // Move forward and rotate counter-clockwise
                    current = next;
                    [dx, dy] = [dy, -dx];
                }
            }
            if (maxIteration <= 0) {
                throw errorNotification({
                    error: null,
                    message: "Reached iteration limit in shrinkwrap inner loop",
                    forever: true,
                });
            }

            edgeLoop.pop();

            // Convert the edges of the loop to corners and add the inset
            const cornerLoop = [];
            const { cellSize } = settings;
            const absInset = Math.abs(inset);

            for (let i = 0; i < edgeLoop.length; i++) {
                edge = edgeLoop[i];
                const nextEdge = edgeLoop[(i + 1) % edgeLoop.length];

                const corner = [edge[0] + dx, edge[1] + dy];
                const insetCorner = [
                    (cellSize * corner[0]) / 2 + absInset * -dy,
                    (cellSize * corner[1]) / 2 + absInset * dx,
                ];

                const vectorProjection = [dx ** 2, dy ** 2]; // Needed later
                [dx, dy] = [nextEdge[0] - corner[0], nextEdge[1] - corner[1]];
                // If the edges are perpendicular, adjust the corner loop appropriately.
                insetCorner[0] += vectorProjection[0] * -dy * absInset;
                insetCorner[1] += vectorProjection[1] * dx * absInset;
                cornerLoop.push(insetCorner);

                delete edgesLeft[edge.toString()];
            }
            result.push(cornerLoop);
        }
        if (maxIteration <= 0) {
            throw errorNotification({
                error: null,
                message: "Reached iteration limit in shrinkwrap outer loop",
                forever: true,
            });
        }

        return result;
    }

    _stringToGridPoint(point: Point): GridPoint {
        const [, x_, y_] = /^(-?\d+),(-?\d+)$/.exec(point) || [];
        const x = parseInt(x_);
        const y = parseInt(y_);
        const xEven = (x >> 1) << 1 === x,
            yEven = (y >> 1) << 1 === y;
        if (xEven && yEven) {
            return { x, y, type: "corners" };
        } else if (!xEven && !yEven) {
            return { x, y, type: "cells" };
        } else {
            return { x, y, type: "edges" };
        }
    }

    _getAllGridPoints(type: PointType): GridPoint[] {
        if (type === "cells") {
            const arr = [];
            for (let x = this.x0; x < this.x0 + this.width; x += 1) {
                for (let y = this.y0; y < this.y0 + this.height; y += 1) {
                    arr.push({ x: 2 * x + 1, y: 2 * y + 1, type });
                }
            }
            return arr;
        } else if (type === "corners") {
            const arr = [];
            for (let x = this.x0; x <= this.x0 + this.width; x += 1) {
                for (let y = this.y0; y <= this.y0 + this.height; y += 1) {
                    arr.push({ x: 2 * x, y: 2 * y, type });
                }
            }
            return arr;
        } else if (type === "edges") {
            const arr = [];
            for (let x = this.x0; x <= this.x0 + this.width; x += 1) {
                for (let y = this.y0; y <= this.y0 + this.height; y += 1) {
                    if (x < this.x0 + this.width) arr.push({ x: 2 * x + 1, y: 2 * y, type });

                    if (y < this.y0 + this.height) arr.push({ x: 2 * x, y: 2 * y + 1, type });
                }
            }
            return arr;
        } else {
            throw errorNotification({
                error: null,
                message: `Unrecognized point type=${type}`,
                forever: true,
            });
        }
    }

    getAllPoints(type: PointType) {
        return this._getAllGridPoints(type).map(({ x, y }) => `${x},${y}`);
    }
}
