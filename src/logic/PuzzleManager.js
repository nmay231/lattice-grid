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
        this.grid = new SquareGrid(this.settings, { width: 3, height: 3 });

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
    cellSize = 20;
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
                this.width * (this.settings.cellSize + 1) +
                2 * this.settings.border,
            height:
                this.height * (this.settings.cellSize + 1) +
                2 * this.settings.border,
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

    getPoints({ referencePoints, selection, batch = false }) {
        // TODO: handle values out of range (a cell outside the boundaries)
        selection = this.parseSelection(selection);

        if (!referencePoints) {
            // TODO: reduce to one value (instead of array) and optionally flatten the nested object to an array of values
            return Object.keys(selection).map((pointType) =>
                this.getPoints({
                    referencePoints: this.getAllPoints(pointType),
                    selection: selection[pointType],
                    batch: true,
                })
            );
        }

        const result = {};
        for (let p of referencePoints) {
            if (typeof p !== "string") {
                // TODO: handle more than 1 layer deep
                throw Error("Not implemented");
            }
            result[p] = result[p] ?? {};

            switch (this.pointType(p)) {
                case POINT_TYPES.CELL:
                    for (let type in selection) {
                        if (
                            selection[type] === true &&
                            type === POINT_TYPES.EDGE
                        ) {
                            let [x, y] = p.split(",");
                            x = parseInt(x);
                            y = parseInt(y);
                            result[p][POINT_TYPES.EDGE] = [
                                x + "v" + y,
                                x + 1 + "v" + y,
                                x + "h" + y,
                                x + "h" + (y + 1),
                            ];
                        }
                    }
                    break;
                case POINT_TYPES.EDGE:
                    break;
                case POINT_TYPES.CORNER:
                    break;
                default:
                    throw Error("Unknown selection");
            }
        }
        return result;
    }

    pointType(point) {
        if (point.match(/^\d+,\d+$/)) {
            return POINT_TYPES.CELL;
        } else if (point.match(/^\d+e\d+$/)) {
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

    // TODO
    parseSelection(selection) {
        return selection;
    }
}

/* TODO: Might eventually optimize by storing layers as images and only updating the images that need to be updated. */
// Also, this will eventually manage things like OcclusionTests
export class MasterBlitter {
    blitters = {
        // line: lineBlitter
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
                const currentBlitter = this.blitters[objects[0].blits.blitter];
                if (!currentBlitter) {
                    console.log(
                        "NONEXISTANT blitter:",
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
                currentBlitter.blit(this.ctx, this.settings, relevantBlits);
            }
            console.log(objects);
        }
    }

    occlusionStuff(objects) {
        // TODO: Actually do stuff
        // TODO: Better name
        return objects;
    }
}
