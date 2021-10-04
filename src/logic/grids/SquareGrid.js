import { POINT_TYPES } from "../PuzzleManager";

// TODO: As I finalize APIs, I need to decide what sort of values are going to be passed around (e.g. canvas coords vs grid coords vs point strings)
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
        const { cellSize, border } = this.settings;
        return {
            minX: this.x0 * cellSize - border,
            minY: this.y0 * cellSize - border,
            width: this.width * cellSize + 2 * border,
            height: this.height * cellSize + 2 * border,
        };
    }

    // nearest({to: {x, y}, intersection: IntersectionType, blacklist?: Points[], pointTypes: PointType[]})
    // nearest({to: {x, y}, intersection: IntersectionType, blacklist?: Points[], points: Points[]})
    // TODO: Consider expanding IntersectionType to allow nearest on first click without regard to distance (e.g. with a Voroni diagram)
    // TODO: Consider renaming `intersection` to `distanceMetric` or something like that.
    // TODO: the intersection parameter might be completely unnecessary if I can come up with an automated method to unambiguously determine if a point was selected from a list given a starting point
    // TODO: Consider removing the blacklist in favor of always explicitly listing relevant pointTypes

    /* This function finds the nearest point(s) to a click/tap that satisfies certain conditions. The first example selects any point in the grid of the specified pointType(s), while the second only selects points from the provided list. If points are not close enough to be selected or if the closest one is in the blacklist, this will return null. Arguments `to` and `intersection` are always required. `to` is the raw x,y coordinates from the canvas. `intersection` is "polygon" or "ellipse" which basically, as an example, determines whether you can "squeeze" between two orthogonally adjacent cells to reach a cell diagonally. "polygon" (e.g. using a square trigger) does not allow diagonal selecting while "ellipse" (e.g. using a circle trigger) does. Another issue is if you want to select an adjacent edge OR corner from a cell, the polygon/ellipse has to be slightly smaller. So, if there are more than one pointType in the combination of blacklist and pointTypes/points, the polygon/ellipse is automatically shrunk by half. You might be thinking that for the second API, the `blacklist` argument is unnecessary. You might be right, but I can't prove that to myself atm... Actually, I might have just proved it by the previous statement (multi-pointType shrinks the selection polygon/ellipse). */
    nearest({
        to,
        intersection,
        blacklist = [],
        pointTypes = [],
        points = [],
    }) {
        if (!pointTypes.length === !points.length) {
            throw Error(
                "Either both of pointTypes and points were missing/empty or both" +
                    `were provided: pointTypes=${pointTypes}, points=${points}`
            );
        }

        const allPointTypes = new Set([
            ...blacklist.map(this._stringToGridPoint).map(({ type }) => type),
            ...pointTypes,
            ...points.map(this._stringToGridPoint).map(({ type }) => type),
        ]);

        let getDistance;
        if (intersection === "ellipse") {
            // Manhattan distance
            getDistance = (x1, y1, x2, y2) =>
                Math.abs(x2 - x1) + Math.abs(y2 - y1);
        } else if (intersection === "polygon") {
            // Chebyshev distance
            getDistance = (x1, y1, x2, y2) =>
                Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        } else {
            // The "You're-silly" distance
            throw Error(`Unexpected intersection=${intersection}`);
        }

        const { cellSize } = this.settings;
        const halfCell = cellSize / 2;
        const minimumDistance = allPointTypes.size === 1 ? 1 : 0.5;

        const x = to.x / halfCell,
            y = to.y / halfCell;
        const px = Math.floor(x),
            py = Math.floor(y);

        let nearbyPoints = [
            {
                string: `${px},${py}`,
                distance: getDistance(x, y, px, py),
            },
            {
                string: `${px + 1},${py}`,
                distance: getDistance(x, y, px + 1, py),
            },
            {
                string: `${px},${py + 1}`,
                distance: getDistance(x, y, px, py + 1),
            },
            {
                string: `${px + 1},${py + 1}`,
                distance: getDistance(x, y, px + 1, py + 1),
            },
        ];
        nearbyPoints = nearbyPoints
            .filter(({ distance }) => distance < minimumDistance)
            .map(({ string, distance }) => ({
                // Get the point type of each
                point: this._stringToGridPoint(string),
                string,
                distance,
            }));

        if (pointTypes.length) {
            nearbyPoints = nearbyPoints.filter(({ point: { type } }) =>
                pointTypes.includes(type)
            );
        } else if (points.length) {
            nearbyPoints = nearbyPoints.filter(({ string }) =>
                points.includes(string)
            );
        }

        const nearest = nearbyPoints.sort(
            ({ distance: d1 }, { distance: d2 }) => d1 - d2
        )[0];
        return nearest?.string ?? null;
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
                : this._getAllPoints(pointType).filter(
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
                case "cells->shrinkwrap": {
                    const result = {};
                    const { key, svgPolygon, edgePoints } =
                        connections[nextType];
                    finalResult[key || "shrinkwrap"] = result;

                    if (svgPolygon) {
                        result.svgPolygon = this._shrinkwrap({
                            gridPoints: gridPoints.map(({ point }) => point),
                            inset: svgPolygon.inset ?? 0,
                        });
                    }
                    if (edgePoints) {
                        // TODO
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
        const result = [];

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
                const insetCorner = {
                    x: (cellSize * corner[0]) / 2 + absInset * -dy,
                    y: (cellSize * corner[1]) / 2 + absInset * dx,
                };

                const vectorProjection = [dx ** 2, dy ** 2]; // Needed later
                [dx, dy] = [nextEdge[0] - corner[0], nextEdge[1] - corner[1]];
                // If the edges are orthogonal, adjust the corner loop appropriately.
                insetCorner.x += vectorProjection[0] * -dy * absInset;
                insetCorner.y += vectorProjection[1] * dx * absInset;
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

    _getAllPoints(type) {
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
}
