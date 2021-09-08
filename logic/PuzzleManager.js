/* TODO: Convert what's possible to typescript later. It's too annoying to do that now when I just need to iterate quickly. */

export class PuzzleManager {
    settings;
    // TODO: Also store default render layers 1-9 so that if a user reorders some layers, new layers still are inserted in a reasonable spot according to their defaultRenderOrder
    layers = [];
    grid;
    blitter;
}

/* The main reason this class is necessary is to automatically change defaults stored in localStorage for that seamless experience */
export class Settings {}

export class SquareGrid {
    constructor(params) {
        this.width = params.width;
        this.height = params.height;

        /* Maps objectId to object */
        this.objects = {};
        /* For now, a simple array of object metadata that I might want to search by */
        this.objectIndex = [];
    }
    encode(settings) {
        // Delegate encoding to each layer or preset
    }
    decode(settings) {
        // Delegate decoding to each layer or preset
    }
    // E.g. getObjects({ point: "x=0,y=0", latticeType: "center", layerId: myLayerId, objectId: myObjectId })
    // Any and all parameters are optional. Multiple params are AND'ed, not OR'ed.
    getObjects({ point, latticeType, layerId, objectId }) {
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

        return Array(ids).map((id) => this.objects[id]);
    }
}

/* TODO: Might eventually optimize by storing layers as images and only updating the images that need to be updated. */
export class MasterBlitter {
    constructor(ctx) {
        this.ctx = ctx;
    }
    /* change is the object being added or removed. It contains information like which layer it belongs to, which point is relevant (position), if it is hidden or invalid, etc. This will help with optimization in the future; do NOT use it now. */
    blitToCanvas(layers, settings, change) {
        // const layer = layers.filter((layer) => layer.id === change.layerId),

        this.ctx.clearRect(0, 0, this.ctx.width, this.ctx.height);
        for (let layer of layers) {
            layer.blitToCanvas(settings, change);
        }
    }
}
