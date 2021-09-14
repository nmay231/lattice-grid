/* TODO: Convert what's possible to typescript later. It's too annoying to do that now when I just need to iterate quickly. */
import { CellOutlineLayer, SelectionLayer } from "./layers";

export class PuzzleManager {
    settings;
    // TODO: Also store default render layers 1-9 so that if a user reorders some layers, new layers still are inserted in a reasonable spot according to their defaultRenderOrder
    layers = [new CellOutlineLayer(), new SelectionLayer()];
    canvas;
    ctx;
    grid;
    blitter;

    constructor(canvas) {
        this.settings = new Settings();
        this.grid = new SquareGrid(this.settings, { width: 10, height: 10 });

        const { width, height } = this.grid.getCanvasRequirements();
        canvas.width = width;
        canvas.height = height;

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.blitter = new MasterBlitter(this.ctx, this.grid);
        this.blitter.blitToCanvas(this.layers, this.settings, {});
    }
}

/* The main reason this class is necessary is to automatically change defaults stored in localStorage for that seamless experience */
export class Settings {
    cellSize = 30;
    border = 15;
}

const POINT_TYPES = {
    CELL: "cell",
    EDGE: "edge",
    CORNER: "corner",
};

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
            } else {
                const relevantPoints = points
                    ? points.filter((p) => this.pointType(p) === pointType)
                    : this.getAllPoints(pointType);

                for (let p of relevantPoints) {
                    if (result[pointType][p] === "skip") {
                        continue;
                    }

                    const nextPoints = [];
                    if (pointType === POINT_TYPES.CELL) {
                        let [x, y] = p.split(",");
                        x = parseInt(x);
                        y = parseInt(y);
                        if (nextPointType === POINT_TYPES.EDGE) {
                            // prettier-ignore
                            nextPoints.push(
                                x       + "v" + y,
                                (x + 1) + "v" + y,
                                x       + "h" + y,
                                x       + "h" + (y + 1),
                            );
                        } else if (nextPointType === POINT_TYPES.CORNER) {
                            // prettier-ignore
                            nextPoints.push(
                                x       + "c" + y,
                                (x + 1) + "c" + y,
                                x       + "c" + (y + 1),
                                (x + 1) + "c" + (y + 1),
                            );
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
                                    : x       + "," + (y - 1)
                            );
                        } else if (nextPointType === POINT_TYPES.CORNER) {
                            nextPoints.push(
                                x + "c" + y,
                                // prettier-ignore
                                edgeType === "v"
                                    ? x       + "c" + (y + 1)
                                    : (x + 1) + "c" + y
                            );
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
                if (sel[key] === true) {
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
                    x: x * cellSize + halfCell + border,
                    y: y * cellSize + halfCell + border,
                };
            case POINT_TYPES.EDGE:
                [, x, edgeType, y] = point.match(/^(\d+)([vh])(\d+)$/);
                return {
                    x:
                        x * cellSize +
                        border +
                        (edgeType === "v" ? halfCell : 0),
                    y:
                        y * cellSize +
                        border +
                        (edgeType === "h" ? halfCell : 0),
                };
            case POINT_TYPES.CORNER:
                [x, y] = point.split("c");
                return {
                    x: x * cellSize + border,
                    y: y * cellSize + border,
                };
            default:
                console.log("You suck!");
        }
    }
}

/* TODO: Might eventually optimize by storing layers as images and only updating the images that need to be updated. */
// Also, this will eventually manage things like OcclusionTests
export class MasterBlitter {
    blitters = {
        line: {
            blit: ({ ctx, settings, blits, translator }) => {
                ctx.lineWidth = 2;
                ctx.fillStyle = blits[0].color;
                for (let blit of blits) {
                    const start = translator(blit.start);
                    const end = translator(blit.end);
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                }
                ctx.stroke();
            },
        },
    };

    constructor(ctx, grid) {
        this.ctx = ctx;
        this.grid = grid; // TODO: Is this really needed?
    }
    /* change is the object being added or removed. It contains information like which layer it belongs to, which point is relevant (position), if it is hidden or invalid, etc. This will help with optimization in the future; do NOT use it now. */
    blitToCanvas(layers, settings, change) {
        // const layer = layers.filter((layer) => layer.id === change.layerId),

        this.ctx.clearRect(0, 0, this.ctx.width, this.ctx.height);
        for (let layer of layers) {
            // TODO: occlusion stuff needs to happen after
            let objects = layer.getObjectsWithBlits(
                this.grid,
                settings,
                change
            );
            // TODO: This will actually require knowledge of other layers sometimes
            objects = this.occlusionStuff(objects);

            const maxBlitCount = Math.max(
                ...objects.map(({ blits }) => blits.length)
            );
            for (let blitIndex = 0; blitIndex < maxBlitCount; blitIndex++) {
                // TODO: This is not entirely correct. It needs to group blits by blitter type first
                const currentBlitter =
                    this.blitters[objects[0].blits[0].blitter];
                if (!currentBlitter) {
                    console.log(
                        "NONEXISTANT blitter: ",
                        objects[0].blits[0].blitter
                    );
                    return;
                }

                const relevantBlits = [];
                for (let object of objects) {
                    if (blitIndex >= object.blits.length) {
                        continue;
                    }
                    relevantBlits.push(object.blits[blitIndex]);
                }
                currentBlitter.blit({
                    ctx: this.ctx,
                    settings: this.settings,
                    blits: relevantBlits,
                    translator: this.grid.translatePoint.bind(this.grid),
                });
            }
        }
    }

    occlusionStuff(objects) {
        // TODO: Actually do stuff
        // TODO: Better name
        return objects;
    }
}
