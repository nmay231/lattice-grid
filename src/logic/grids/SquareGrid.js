import { POINT_TYPES } from "../PuzzleManager";

export class SquareGrid {
    constructor(settings, params) {
        this.settings = settings;
        this.width = params.width;
        this.height = params.height;
        this.x0 = 0;
        this.y0 = 0;

        /* Maps objectId to object */
        this.objects = {};
        /* For now, a simple array of object metadata that I might want to search by */
        this.objectIndex = [];
    }
    getCanvasRequirements() {
        return {
            width:
                this.width * this.settings.cellSize + 2 * this.settings.border,
            height:
                this.height * this.settings.cellSize + 2 * this.settings.border,
        };
    }
    encode(settings) {
        // Delegate encoding to each layer or preset
        // TODO: this should actually just be the PuzzleManager's job
    }
    decode(settings) {
        // Delegate decoding to each layer or preset
        // TODO: this should actually just be the PuzzleManager's job
    }
    // E.g. getObjects({ point: "x=0,y=0", latticeType: "center", layerId: myLayerId, objectId: myObjectId })
    // Any and all parameters are optional. Multiple params are AND'ed, not OR'ed.
    getObjects({
        point,
        latticeType,
        layerId,
        objectId,
        includeOutOfBounds = false,
    }) {
        // TODO: handle values out of range (a cell outside the boundaries)
        if (objectId ?? this.objectIndex[objectId]) {
            return [this.objectIndex[objectId]];
        }

        // For now, all objects will be stored in a flat array to make things simple. Eventually, I should build an index to make accessing objects a bit faster.
        const ids = new Set(
            this.objectIndex
                .filter(
                    (object) =>
                        (point ?? point === object.point) &&
                        (latticeType ?? latticeType === object.latticeType) &&
                        (layerId ?? layerId === object.layerId)
                )
                .map(({ objectId: id }) => id)
        );

        return Array(...ids).map((id) => this.objects[id]);
    }

    getPoints({ referencePoints, selection: startingSelections }) {
        // TODO: blacklist checked items and flatten finalResult
        const selections = this.parseSelection(startingSelections);
        const finalResult = {};

        const inProgress = [];
        for (let selection of selections) {
            inProgress.push({
                points: referencePoints,
                selection,
                result: finalResult,
            });
        }

        while (inProgress.length) {
            const { points, selection, result } = inProgress.pop();
            const [pointType, nextPointType] = selection;

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
                const importantPoints = points
                    ? points.filter(
                          (p) => this.pointType(p) === POINT_TYPES.CELL
                      )
                    : this.getAllPoints(POINT_TYPES.CELL);
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
                            lastPoint.x -= offset * offsetX;
                            lastPoint.y -= offset * offsetY;
                        }

                        if (startingCorner === null) {
                            startingCorner = corner;
                        } else if (corner === startingCorner) {
                            offsetLoop.splice(0, 1, offsetLoop.pop());
                            result.shrinkwrap.push(offsetLoop);
                            break;
                        } else if (
                            i === 0 &&
                            x - dx + "c" + (y - dy) in cornerCounts
                        ) {
                            // Prevent double counting, except on a corner that's part of two loops
                            cornerCounts[nextCorner] -= 1;
                        } else if (cornerCounts[nextCorner]) {
                            delete cornerCounts[nextCorner];
                        }
                        [dx, dy] = [x - nextX, y - nextY];
                        [x, y] = [nextX, nextY];
                    }
                }
            } else {
                const importantPoints = points
                    ? points.filter((p) => this.pointType(p) === pointType)
                    : this.getAllPoints(pointType);

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
                                        x: borderPadding + x * cellSize,
                                        y: borderPadding + y * cellSize,
                                    };
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
                        points: nextPoints,
                        selection: selection.slice(1),
                        result: result[pointType][p],
                    });
                }
            }
        }

        const todoList = [finalResult];
        while (todoList.length) {
            const todo = todoList.pop();
            for (let key in todo) {
                if (todo[key] === false) {
                    delete todo[key];
                } else if (todo[key] === null) {
                    todo[key] = true;
                } else {
                    todoList.push(todo[key]);
                }
            }
        }

        return finalResult;
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
