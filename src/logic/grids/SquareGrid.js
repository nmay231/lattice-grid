import { hopStraight } from "../algorithms/hopStraight";
import { POINT_TYPES } from "../PuzzleManager";

export class SquareGrid {
    onePointLayers = {};

    constructor(settings, params) {
        this.settings = settings;
        this.width = params.width;
        this.height = params.height;
        this.x0 = 0;
        this.y0 = 0;
    }

    getCanvasRequirements() {
        const { cellSize, borderPadding } = this.settings;
        return {
            minX: this.x0 * cellSize - borderPadding,
            minY: this.y0 * cellSize - borderPadding,
            width: this.width * cellSize + 2 * borderPadding,
            height: this.height * cellSize + 2 * borderPadding,
        };
    }

    selectPointsWithCursor({
        cursor,
        pointTypes = [],
        // TODO: implement deltas as Finite State Machines for more capabilities and better cross-compatibility between grid types
        deltas,
        lastPoint = null,
    }) {
        const { cellSize } = this.settings;
        const halfCell = cellSize / 2;

        cursor.x /= halfCell;
        cursor.y /= halfCell;

        const firstPoint = [Math.floor(cursor.x), Math.floor(cursor.y)];
        let targetPoints = [];
        const gridPoint = this._stringToGridPoint(firstPoint.toString());
        if (gridPoint.type === POINT_TYPES.EDGE) {
            targetPoints.push(
                [firstPoint[0] + 1, firstPoint[1]],
                [firstPoint[0], firstPoint[1] + 1],
                cursor.y - firstPoint[1] < cursor.x - firstPoint[0]
                    ? [firstPoint[0] + 1, firstPoint[1] + 1]
                    : firstPoint
            );
        } else {
            targetPoints.push(
                firstPoint,
                [firstPoint[0] + 1, firstPoint[1] + 1],
                1 + firstPoint[1] - cursor.y < cursor.x - firstPoint[0]
                    ? [firstPoint[0], firstPoint[1] + 1]
                    : [firstPoint[0] + 1, firstPoint[1]]
            );
        }

        if (lastPoint === null) {
            // TODO: This is stupid, but will do for now
            return targetPoints
                .map((p) => this._stringToGridPoint(p.toString()))
                .filter(({ type }) => pointTypes.indexOf(type) > -1)
                .map(({ x, y }) => `${x},${y}`);
        }

        lastPoint = lastPoint.split(",").map((x) => parseInt(x));
        const nearby = deltas.map(
            ({ dx, dy }) => `${lastPoint[0] + dx},${lastPoint[1] + dy}`
        );
        const intersection = targetPoints
            .map((p) => p.toString())
            .filter((targetPoint) => nearby.indexOf(targetPoint) > -1);
        if (intersection.length) {
            return intersection.slice(0, 1);
        }

        const generator = hopStraight({
            lastPoint,
            deltas,
            cursor: [cursor.x, cursor.y],
        });
        targetPoints = targetPoints.map((p) => p.toString());
        const points = [];

        let maxIteration = 100; // Prevent infinite loops
        while (maxIteration > 0) {
            lastPoint = generator
                .next(lastPoint)
                .value?.map((v) => Math.round(v));
            const string = lastPoint?.join(",");
            if (!lastPoint || points.indexOf(string) > -1) {
                return [];
            }
            points.push(string);
            if (targetPoints.indexOf(string) > -1) {
                return points;
            }
            maxIteration -= 1;
        }
        return [];
    }

    /**
     * @description Select points and certain attributes depending on how they are connected to other points
     * @param {Object} args - Arguments are passed as an object
     * @param {Object} args.connections - A nested object used to select neighboring points in a chain similar to a graph network. See examples in existing layers.
     * @param {string[]} [args.points] - Optionally specify from which points are neighbors selected. If not provided, all points of the relevant type are used.
     * @param {string[]} [args.blacklist] - Optionally prevent certain points from being selecting.
     * @param {boolean} [args.includeOutOfBounds] - If true, include points outside the range of the current grid. Default: false
     * @param {boolean} [args.excludePreviousPoints] - If true, add previously selected points to the blacklist as you go down the chain. Default: true
     */
    getPoints({
        points = [],
        connections,
        blacklist = [],
        includeOutOfBounds = false,
        excludePreviousPoints = true,
    }) {
        const finalResult = {};
        points = points.map(this._stringToGridPoint);

        for (let pointType in connections) {
            const justGridPoints = points.length
                ? points.filter(({ type }) => type === pointType)
                : this._getAllGridPoints(pointType).filter(
                      ({ x, y }) => !blacklist.includes(`${x},${y}`)
                  );

            finalResult[pointType] = {};
            const gridPoints = [];
            for (let point of justGridPoints) {
                const result = {};
                finalResult[pointType][`${point.x},${point.y}`] = result;
                gridPoints.push({ point, result });
            }

            this._getPoints({
                pointType,
                connections: connections[pointType],
                blacklist,
                gridPoints,
                finalResult,
                includeOutOfBounds,
                excludePreviousPoints,
            });
        }

        return finalResult;
    }

    _outOfBounds(gridPoint) {
        const x = gridPoint.x / 2 - this.x0;
        const y = gridPoint.y / 2 - this.y0;
        return x < 0 || x > this.width || y < 0 || y > this.height;
    }

    _getPoints({
        pointType,
        connections,
        blacklist,
        gridPoints,
        finalResult,
        includeOutOfBounds,
        excludePreviousPoints,
    }) {
        const nextBlacklist = [...blacklist];
        for (let nextType in connections) {
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
                    for (let { point, result } of gridPoints) {
                        result[nextType] = result[nextType] ?? {};

                        for (let { dx, dy } of deltas) {
                            const nextPoint = {
                                x: point.x + dx,
                                y: point.y + dy,
                                type: nextType,
                            };
                            const nextString = `${nextPoint.x},${nextPoint.y}`;
                            if (
                                blacklist.includes(nextString) ||
                                (!includeOutOfBounds &&
                                    this._outOfBounds(nextPoint))
                            ) {
                                continue;
                            }
                            if (excludePreviousPoints) {
                                nextBlacklist.push(nextString);
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
                        pointType: nextType,
                        connections: connections[nextType],
                        gridPoints: newGridPoints,
                        blacklist: nextBlacklist,
                        excludePreviousPoints,
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
                    for (let { point, result } of gridPoints) {
                        // (connection === edges->cells) XOR (x is even) ? upDown : leftRight
                        const neighbors =
                            (nextType === POINT_TYPES.CELL) !==
                            (point.x === (point.x >> 1) << 1)
                                ? upDown
                                : leftRight;

                        result[nextType] = result[nextType] ?? {};

                        for (let { dx, dy } of neighbors) {
                            const nextPoint = {
                                x: point.x + dx,
                                y: point.y + dy,
                                type: nextType,
                            };
                            const nextString = `${nextPoint.x},${nextPoint.y}`;
                            if (
                                blacklist.includes(nextString) ||
                                (!includeOutOfBounds &&
                                    this._outOfBounds(nextPoint))
                            ) {
                                continue;
                            }
                            if (excludePreviousPoints) {
                                nextBlacklist.push(nextString);
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
                        pointType: nextType,
                        connections: connections[nextType],
                        gridPoints: newGridPoints,
                        blacklist: nextBlacklist,
                        excludePreviousPoints,
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
                        throw Error("Params for svgPoint are not supported!");
                    }

                    const { cellSize } = this.settings;
                    const halfCell = cellSize / 2;
                    for (let { point, result } of gridPoints) {
                        result[nextType] = [
                            point.x * halfCell,
                            point.y * halfCell,
                        ];
                    }
                    break;
                }
                case "cells->svgOutline": {
                    if (connections[nextType] !== true) {
                        // TODO
                        throw Error("Params for svgOutline are not supported!");
                    }

                    const { cellSize } = this.settings;
                    const halfCell = cellSize / 2;
                    for (let { point, result } of gridPoints) {
                        result[nextType] = [
                            [
                                (point.x - 1) * halfCell,
                                (point.y - 1) * halfCell,
                            ],
                            [
                                (point.x + 1) * halfCell,
                                (point.y - 1) * halfCell,
                            ],
                            [
                                (point.x + 1) * halfCell,
                                (point.y + 1) * halfCell,
                            ],
                            [
                                (point.x - 1) * halfCell,
                                (point.y + 1) * halfCell,
                            ],
                        ];
                    }
                    break;
                }
                case "cells->shrinkwrap": {
                    const result = {};
                    const { key, svgPolygons, edgePoints } =
                        connections[nextType];
                    finalResult[key || "shrinkwrap"] = result;

                    if (svgPolygons) {
                        result.svgPolygons = this._shrinkwrap({
                            gridPoints: gridPoints.map(({ point }) => point),
                            inset: svgPolygons.inset ?? 0,
                        });
                    }
                    if (edgePoints) {
                        // TODO
                    }
                    break;
                }
                case "corners->rows":
                case "cells->rows": {
                    const { types } =
                        connections[nextType] === true
                            ? { types: "all" }
                            : connections[nextType];

                    const horizontal =
                        types === "all" || types?.indexOf("horizontal") > -1;
                    const vertical =
                        types === "all" || types?.indexOf("vertical") > -1;

                    for (let { point, result } of gridPoints) {
                        const isCell = point.type === POINT_TYPES.CELL;
                        const rows = [];
                        if (horizontal) {
                            const horRow = [];
                            for (
                                let x = this.x0 * 2 + isCell;
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
                                let y = this.y0 * 2 + isCell;
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
                    let radius = this.settings.cellSize / 2;

                    // I'm literally making up these values as I go along...
                    const shapeMap = {
                        cells: { square: 1, circle: 1 },
                        corners: { square: 0.9, circle: 1 },
                        edges: { square: 0.8, circle: 0.8 },
                    };
                    const sizeMap = {
                        cells: { large: 0.9, medium: 0.5, small: 0.2 },
                        corners: { large: 0.8, medium: 0.4, small: 0.1 },
                        edges: { large: 0.8, medium: 0.4, small: 0.2 },
                    };

                    radius *=
                        shapeMap[pointType][shape] * sizeMap[pointType][size];

                    for (let { result } of gridPoints) {
                        // For some other grids, the radius will be different for different cells, etc.
                        result[nextType] = radius;
                    }

                    break;
                }
                default:
                    throw Error(
                        `Unsupported connection in getPoints: "${pointType}" -> "${nextType}"`
                    );
            }
        }
    }

    _shrinkwrap({ gridPoints, inset }) {
        let cells = [];
        const edgesLeft = {};
        let [dx, dy] = [0, -1];
        for (let cell of gridPoints) {
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
            cells.push([x, y]);
        }

        // Points are converted to strings to allow easy comparison
        cells = cells.map((cell) => cell.toString());
        const result = [];

        while (Object.keys(edgesLeft).length) {
            const edgeKey = Object.keys(edgesLeft)[0];
            const firstEdge = edgeKey.split(",").map((i) => parseInt(i));

            let next;
            let current = edgesLeft[edgeKey];
            [dx, dy] = [firstEdge[0] - current[0], firstEdge[1] - current[1]];

            let cellAcrossBoundary = (cell) => !cells.includes(cell.toString());

            // If the inset is negative, we traverse around the outside instead of the inside.
            // Otherwise, lines would overlap on touching corners
            if (inset < 0) {
                cellAcrossBoundary = (cell) => cells.includes(cell.toString());
                current = [current[0] + 2 * dx, current[1] + 2 * dy];
                [dx, dy] = [-dx, -dy];
            }

            let edge = "asdf";
            const edgeLoop = [];

            // Collect the edges around a contiguous group of cells
            while (edge.toString() !== edgeLoop[0]?.toString()) {
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
            edgeLoop.pop();

            // Convert the edges of the loop to corners and add the inset
            const cornerLoop = [];
            const { cellSize } = this.settings;
            const absInset = Math.abs(inset);

            for (let index in edgeLoop) {
                edge = edgeLoop[index];
                const nextEdge = edgeLoop[(index * 1 + 1) % edgeLoop.length];

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
        return result;
    }

    _stringToGridPoint(string) {
        let [, x, y] = string.match(/^(-?\d+),(-?\d+)$/);
        x = parseInt(x);
        y = parseInt(y);
        const xEven = (x >> 1) << 1 === x,
            yEven = (y >> 1) << 1 === y;
        if (xEven && yEven) {
            return { x, y, type: POINT_TYPES.CORNER };
        } else if (!xEven && !yEven) {
            return { x, y, type: POINT_TYPES.CELL };
        } else {
            return { x, y, type: POINT_TYPES.EDGE };
        }
    }

    _getAllGridPoints(type) {
        if (type === POINT_TYPES.CELL) {
            let arr = [];
            for (let x = this.x0; x < this.x0 + this.width; x += 1) {
                for (let y = this.y0; y < this.y0 + this.height; y += 1) {
                    arr.push({ x: 2 * x + 1, y: 2 * y + 1, type });
                }
            }
            return arr;
        } else {
            throw Error("Not implemented yet: " + type);
        }
    }

    getAllPoints(type) {
        return this._getAllGridPoints(type).map(({ x, y }) => `${x},${y}`);
    }

    convertIdAndPoints({ pointsToId, idToPoints }) {
        if (pointsToId) {
            return pointsToId.join(",");
        } else if (idToPoints) {
            const nums = idToPoints.split(",");
            const points = [];
            while (nums.length) {
                points.push(nums.splice(0, 2).join(","));
            }
            return points;
        }
    }
}
