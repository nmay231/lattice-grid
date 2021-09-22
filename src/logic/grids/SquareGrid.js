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
        return {
            width:
                this.width * this.settings.cellSize + 2 * this.settings.border,
            height:
                this.height * this.settings.cellSize + 2 * this.settings.border,
        };
    }

    addLayer(layer) {
        if (layer.controls === "onePoint") {
            const layerData = {};
            this.onePointLayers[layer.id] = layerData;
            // TODO: Handle a defaultState that's an object or array
            const defaultState = layer.defaultState ?? layer.states?.[0];
            if (defaultState === undefined) {
                return;
            }

            for (let pointType of layer.pointTypes) {
                const points = this.getAllPoints(pointType);
                for (let p of points) {
                    layerData[p] = defaultState;
                }
            }
        } else {
            throw Error(`Layer controls not implemented: ${layer.controls}`);
        }
    }

    // TODO: This exact API should be temporary
    cycleState({ layer, point }) {
        if (layer.controls !== "onePoint") {
            throw Error(`Layer controls not supported: ${layer.controls}`);
        }

        if (!(point in this.onePointLayers[layer.id])) {
            throw Error("your face asdf");
        }

        const current = this.onePointLayers[layer.id][point];
        const index = layer.states.indexOf(current);
        this.onePointLayers[layer.id][point] =
            layer.states[(index + 1) % layer.states.length];
    }

    addObject({ layerId, points, object }) {
        const objectId = Symbol();
        this.objects[objectId] = { objectId, layerId, points, object };
        for (let point of points) {
            this.objectIndex.push({ objectId, layerId, point });
        }
    }

    removeObjects({ objectId, replaceWith }) {
        const allIds = this.objectIndex.map(({ objectId }) => objectId);
        this.objectIndex.splice(allIds.indexOf(objectId), 1);
        delete this.objects[objectId];
        if (replaceWith) {
            // TODO: This was just shoehorned in...
            this.addObject(replaceWith);
        }
    }

    getObject(objectId) {
        return this.object[objectId];
    }

    // E.g. getObjects({ point: "0,0", latticeType: "cell", layerId: myLayerId })
    // Any and all parameters are optional. Multiple params are AND'ed, not OR'ed.
    getObjects({ point, latticeType, layerId, includeOutOfBounds = false }) {
        // TODO: handle values out of range (a cell outside the boundaries)
        if (layerId in this.onePointLayers) {
            if (point) {
                return {
                    layerId,
                    point,
                    state: this.onePointLayers[layerId][point],
                };
            } else {
                return Object.keys(this.onePointLayers[layerId]).map(
                    (point) => ({
                        layerId,
                        point,
                        state: this.onePointLayers[layerId][point],
                    })
                );
            }
        }
        // For now, all objects will be stored in a flat array to make things simple. Eventually, I should build an index to make accessing objects a bit faster.
        const ids = new Set(
            this.objectIndex
                .filter(
                    (object) =>
                        (point ? point === object.point : true) &&
                        (latticeType
                            ? latticeType === object.latticeType
                            : true) &&
                        (layerId ? layerId === object.layerId : true)
                )
                .map(({ objectId: id }) => id)
        );

        return [...ids].map((id) => this.objects[id]);
    }

    // nearest({to: {x, y}, intersection: IntersectionType, blacklist?: Points[], pointTypes: PointType[]})
    // nearest({to: {x, y}, intersection: IntersectionType, blacklist?: Points[], points: Points[]})
    // TODO: Consider expanding IntersectionType to allow nearest on first click without regard to distance (e.g. with a Voroni diagram)
    // TODO: Consider renaming `intersection` to `distanceMetric` or something like that.
    /* This function finds the nearest point(s) to a click/tap that satisfies certain conditions. The first example selects any point in the grid of the specified pointType(s), while the second only selects points from the provided list. If points are not close enough to be selected or if the closest one is in the blacklist, this will return null. Arguments `to` and `intersection` are always required. `to` is the raw x,y coordinates from the canvas. `intersection` is "polygon" or "ellipse" which basically, as an example, determines whether you can "squeeze" between two orthogonally adjacent cells to reach a cell diagonally. "polygon" (e.g. using a square trigger) does not allow diagonal selecting while "ellipse" (e.g. using a circle trigger) does. Another issue is if you want to select an adjacent edge OR corner from a cell, the polygon/ellipse has to be slightly smaller. So, if there are more than one pointType in the combination of blacklist and pointTypes/points, the polygon/ellipse is automatically shrunk by half. You might be thinking that for the second API, the `blacklist` argument is unnecessary. You might be right, but I can't prove that to myself atm... Actually, I might have just proved it by the previous statement (multi-pointType shrinks the selection polygon/ellipse). */
    nearest({ to, intersection, blacklist = [], pointTypes, points }) {
        if (!!pointTypes?.length === !!points?.length) {
            throw Error(
                "Either both of pointTypes and points were missing/empty or both" +
                    `were provided: pointTypes=${pointTypes}, points=${points}`
            );
        }

        const allPointTypes = new Set([
            ...blacklist,
            ...(pointTypes ?? []),
            ...(points ?? []).map(this.pointType),
        ]);

        let getDistance;
        if (intersection === "ellipse") {
            // Manhattan distance
            getDistance = ({ x: x1, y: y1 }, { x: x2, y: y2 }) =>
                Math.abs(x2 - x1) + Math.abs(y2 - y1);
        } else if (intersection === "polygon") {
            // Chebyshev distance
            getDistance = ({ x: x1, y: y1 }, { x: x2, y: y2 }) =>
                Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        } else {
            // The "You're-silly" distance
            throw Error(`Unexpected intersection=${intersection}`);
        }

        const { cellSize, border: borderPadding } = this.settings;
        const minimumDistance = allPointTypes.size === 1 ? 0.5 : 0.25;

        const x = (to.x - borderPadding) / cellSize,
            y = (to.y - borderPadding) / cellSize;
        let nearbyPoints = [];
        for (let type of allPointTypes) {
            if (type === "cell") {
                const cellX = Math.floor(x),
                    cellY = Math.floor(y);
                nearbyPoints.push({
                    point: `${cellX},${cellY}`,
                    distance: getDistance(
                        { x, y },
                        { x: cellX + 0.5, y: cellY + 0.5 }
                    ),
                });
                break;
            } else if (type === "corner") {
                const cornerX = Math.floor(x + 0.5),
                    cornerY = Math.floor(y + 0.5);
                nearbyPoints.push({
                    point: `${cornerX}c${cornerY}`,
                    distance: getDistance({ x, y }, { x: cornerX, y: cornerY }),
                });
                break;
                // TODO: edges are annoying...
                // } else if (type === "edge") {
            } else {
                throw Error(`Unexpected pointType=${type}`);
            }
        }

        if (pointTypes?.length) {
            for (let { point, distance } of nearbyPoints) {
                if (distance < minimumDistance) {
                    return point;
                }
            }
            return null;
        } else if (points?.length) {
            for (let { point, distance } of nearbyPoints) {
                if (
                    distance < minimumDistance &&
                    point in points &&
                    !(point in blacklist)
                ) {
                    return point;
                }
            }
            return null;
        }
    }

    // TODO: This could be really simplified if I just used a planar graph. I doubt it costs much memory, and it makes everyone's lives easier...
    // TODO: I can also simply pluralize cell->cells, edge->edges, etc. It's simple, and I have to do edgeStraight->edges anyways.
    getPoints({
        points: referencePoints,
        selection: startingSelections,
        blacklist,
    }) {
        // TODO: blacklist checked items and flatten finalResult
        const selections = this.parseSelection(startingSelections);
        const finalResult = {};

        blacklist = blacklist ?? [];
        const inProgress = [];
        for (let selection of selections) {
            inProgress.push({
                selection,
                points: referencePoints,
                result: finalResult,
            });
        }

        while (inProgress.length) {
            const { points, selection, result } = inProgress.pop();
            const [pointType, nextPointType] = selection;
            if (points) {
                blacklist.push(...points);
            }

            result[pointType] = result[pointType] ?? {};
            if (nextPointType === false) {
                for (let p of points) {
                    result[pointType][p] = "skip";
                }
            } else if (nextPointType === true) {
                for (let p of points) {
                    result[pointType][p] = null;
                }
            } else if (
                nextPointType === "cellStraight" ||
                nextPointType === "cornerStraight"
            ) {
                console.log(
                    "Not implemented. Requires doing two layers at once!"
                );
            } else if (pointType === "shrinkwrap") {
                const importantPoints = (
                    points
                        ? points.filter(
                              (p) => this.pointType(p) === POINT_TYPES.CELL
                          )
                        : this.getAllPoints(POINT_TYPES.CELL)
                ).filter((p) => blacklist.indexOf(p) === -1);
                if (!importantPoints.length) {
                    continue;
                }
                result.shrinkwrap = [];
                const offset = nextPointType.offset ?? 0;

                const cornerCounts = {};
                for (let p of importantPoints) {
                    let [x, y] = p.split(",");
                    x = parseInt(x);
                    y = parseInt(y);
                    // prettier-ignore
                    const corners = [
                        x + "c" + y,
                        (x + 1) + "c" + y,
                        x + "c" + (y + 1),
                        (x + 1) + "c" + (y + 1),
                    ];
                    for (let c of corners) {
                        cornerCounts[c] = (cornerCounts[c] ?? 0) + 1;
                        if (cornerCounts[c] === 4) {
                            delete cornerCounts[c];
                        }
                    }
                }

                while (true) {
                    const c0 = Object.keys(cornerCounts)[0];
                    if (!c0) {
                        break;
                    }

                    let [x, y] = c0.split("c");
                    x = parseInt(x);
                    y = parseInt(y);

                    const SE = importantPoints.indexOf(x + "," + y) > -1,
                        SW = importantPoints.indexOf(x - 1 + "," + y) > -1,
                        NW =
                            importantPoints.indexOf(x - 1 + "," + (y - 1)) > -1,
                        NE = importantPoints.indexOf(x + "," + (y - 1)) > -1;

                    let dx, dy;
                    if (SE && !NE) {
                        [dx, dy] = [1, 0];
                    } else if (SW && !NW) {
                        [dx, dy] = [0, 1];
                    } else if (NW && !NE) {
                        [dx, dy] = [-1, 0];
                    } else {
                        [dx, dy] = [0, -1];
                    }

                    const { border: borderPadding, cellSize } = this.settings;
                    let offsetLoop = [];
                    const rotate =
                        offset >= 0
                            ? (dx, dy) => [dy, -dx]
                            : (dx, dy) => [-dy, dx];
                    let startingCorner = null;
                    //
                    while (true) {
                        const corner = x + "c" + y;
                        let i, nextCorner, nextX, nextY;
                        for (i = 0; i < 3; i++) {
                            [dx, dy] = rotate(dx, dy);
                            nextX = x + dx;
                            nextY = y + dy;
                            nextCorner = nextX + "c" + nextY;
                            if (nextCorner in cornerCounts) {
                                break;
                            }
                        }

                        if (i !== 3) {
                            // Add the next point to the shrinkwrap
                            [dx, dy] = rotate(dx, dy);
                            offsetLoop.push({
                                x: borderPadding + x * cellSize - offset * dx,
                                y: borderPadding + y * cellSize - offset * dy,
                            });
                        }

                        // If in a corner or on an elbow, shorten or length the previous line segment, respectively
                        if (i !== 1 && offsetLoop.length > 1) {
                            const lastPoint = offsetLoop[offsetLoop.length - 1];
                            const [offsetX, offsetY] = rotate(dx, dy);
                            lastPoint.x += (i < 1 ? -1 : 1) * offset * offsetX;
                            lastPoint.y += (i < 1 ? -1 : 1) * offset * offsetY;
                        }

                        if (startingCorner === null) {
                            startingCorner = corner;
                        } else if (
                            i === 0 &&
                            cornerCounts[x - dx + "c" + (y - dy)] === 2
                        ) {
                            // Prevent double counting, except on a corner that's part of two loops
                            cornerCounts[nextCorner] -= 1;
                        } else if (cornerCounts[nextCorner]) {
                            delete cornerCounts[nextCorner];
                        } else if (corner === startingCorner) {
                            offsetLoop.splice(0, 1, offsetLoop.pop());
                            result.shrinkwrap.push(offsetLoop);
                            break;
                        }
                        [dx, dy] = [x - nextX, y - nextY];
                        [x, y] = [nextX, nextY];
                    }
                }
            } else {
                const importantPoints = points
                    ? points.filter((p) => this.pointType(p) === pointType)
                    : this.getAllPoints(pointType).filter(
                          (p) => blacklist.indexOf(p) === -1
                      );

                for (let p of importantPoints) {
                    if (result[pointType][p] === "skip") {
                        continue;
                    }

                    const nextPoints = [];
                    const { border: borderPadding, cellSize } = this.settings;
                    if (pointType === POINT_TYPES.CELL) {
                        let [x, y] = p.split(",");
                        x = parseInt(x);
                        y = parseInt(y);
                        if (nextPointType === POINT_TYPES.EDGE) {
                            // prettier-ignore
                            nextPoints.push(
                                x + "v" + y,
                                (x + 1) + "v" + y,
                                x + "h" + y,
                                x + "h" + (y + 1)
                            );
                        } else if (nextPointType === POINT_TYPES.CORNER) {
                            // prettier-ignore
                            nextPoints.push(
                                x + "c" + y,
                                (x + 1) + "c" + y,
                                x + "c" + (y + 1),
                                (x + 1) + "c" + (y + 1)
                            );
                        } else if (typeof nextPointType !== "string") {
                            result[pointType][p] = result[pointType][p] ?? {};
                            for (let key in nextPointType) {
                                if (key === "points") {
                                    result[pointType][p].points = {
                                        x:
                                            borderPadding +
                                            x * (cellSize + 0.5) +
                                            0.5,
                                        y:
                                            borderPadding +
                                            y * (cellSize + 0.5) +
                                            0.5,
                                    };
                                } else if (key === "svgOutline") {
                                    const svgPath = `M${
                                        borderPadding + x * cellSize + 1
                                    } ${borderPadding + y * cellSize + 1}h${
                                        cellSize - 2
                                    }v${cellSize - 2}h${2 - cellSize}Z`;
                                    result[pointType][p].svgOutline = svgPath;
                                }
                            }
                            continue;
                        } else {
                            console.log("your face");
                        }
                    } else if (pointType === POINT_TYPES.EDGE) {
                        let [, x, edgeType, y] = p.match(/^(\d+)([vh])(\d+)$/);
                        x = parseInt(x);
                        y = parseInt(y);
                        if (nextPointType === POINT_TYPES.CELL) {
                            nextPoints.push(
                                x + "," + y,
                                // prettier-ignore
                                edgeType === "v"
                                    ? (x - 1) + "," + y
                                    : x + "," + (y - 1)
                            );
                        } else if (nextPointType === POINT_TYPES.CORNER) {
                            nextPoints.push(
                                x + "c" + y,
                                // prettier-ignore
                                edgeType === "v"
                                    ? x + "c" + (y + 1)
                                    : (x + 1) + "c" + y
                            );
                        } else if (typeof nextPointType !== "string") {
                            result[pointType][p] = result[pointType][p] ?? {};
                            for (let key in nextPointType) {
                                if (key === "points") {
                                    result[pointType][p].points = [
                                        {
                                            x: borderPadding + x * cellSize,
                                            y: borderPadding + y * cellSize,
                                        },
                                        {
                                            x:
                                                borderPadding +
                                                (x + (edgeType === "h")) *
                                                    cellSize,
                                            y:
                                                borderPadding +
                                                (y + (edgeType === "v")) *
                                                    cellSize,
                                        },
                                    ];
                                }
                            }
                            continue;
                        } else {
                            console.log("your face");
                        }
                    } else {
                        throw Error("Not implemented...");
                    }
                    result[pointType][p] = result[pointType][p] ?? {};
                    inProgress.push({
                        points: nextPoints.filter(
                            (p) => blacklist.indexOf(p) === -1
                        ),
                        selection: selection.slice(1),
                        result: result[pointType][p],
                    });
                }
            }
        }

        // const todoList = [finalResult];
        // while (todoList.length) {
        //     const todo = todoList.pop();
        //     for (let key in todo) {
        //         if (todo[key] === false) {
        //             delete todo[key];
        //         } else if (todo[key] === null) {
        //             todo[key] = true;
        //         } else {
        //             todoList.push(todo[key]);
        //         }
        //     }
        // }

        return finalResult;
    }

    parseSelection(selection) {
        if (Array.isArray(selection)) {
            // TODO: check that the unparsed array is valid
            return selection;
        }
        const final = [];
        const recurse = (sel, path = []) => {
            for (let key in sel) {
                if (key === "self") {
                    final.splice(0, 0, [...path, sel[key]]);
                } else if (sel[key] === true) {
                    final.splice(0, 0, [...path, key, true]);
                } else if (sel[key] === false) {
                    final.push([...path, key, false]);
                } else {
                    recurse(sel[key], [...path, key]);
                }
            }
        };
        recurse(selection);
        return final;
    }

    pointType(point) {
        if (point.match(/^\d+,\d+$/)) {
            return POINT_TYPES.CELL;
        } else if (point.match(/^\d+[vh]\d+$/)) {
            return POINT_TYPES.EDGE;
        } else if (point.match(/^\d+c\d+$/)) {
            return POINT_TYPES.CORNER;
        } else {
            throw Error("Unknown point type: " + point);
        }
    }

    getAllPoints(type) {
        if (type === POINT_TYPES.CELL) {
            let arr = [];
            for (let x = this.x0; x < this.width; x += 1) {
                for (let y = this.y0; y < this.height; y += 1) {
                    arr.push(x + "," + y);
                }
            }
            return arr;
        } else {
            throw Error("Not implemented yet: " + type);
        }
    }

    translatePoint(point) {
        if (
            typeof point !== "string" &&
            typeof point.x === "number" &&
            typeof point.y === "number"
        ) {
            return point;
        }

        let x, y, edgeType;
        const { cellSize, border } = this.settings;
        const halfCell = Math.floor(cellSize / 2);
        switch (this.pointType(point)) {
            case POINT_TYPES.CELL:
                [x, y] = point.split(",");
                return {
                    x: x * cellSize + halfCell + border + 0.5,
                    y: y * cellSize + halfCell + border + 0.5,
                };
            case POINT_TYPES.EDGE:
                [, x, edgeType, y] = point.match(/^(\d+)([vh])(\d+)$/);
                return {
                    x:
                        x * cellSize +
                        border +
                        (edgeType === "v" ? halfCell : 0) +
                        0.5,
                    y:
                        y * cellSize +
                        border +
                        (edgeType === "h" ? halfCell : 0) +
                        0.5,
                };
            case POINT_TYPES.CORNER:
                [x, y] = point.split("c");
                return {
                    x: x * cellSize + border + 0.5,
                    y: y * cellSize + border + 0.5,
                };
            default:
                console.log("You suck!");
        }
    }
}
