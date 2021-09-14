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
