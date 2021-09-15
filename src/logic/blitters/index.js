/* TODO: Might eventually optimize by storing layers as images and only updating the images that need to be updated. */
// Also, this will eventually manage things like OcclusionTests

export class MasterBlitter {
    blitters = {
        line: {
            blit: ({ ctx, blits, params }) => {
                ctx.beginPath();
                ctx.lineWidth = params.lineWidth ?? 1;
                ctx.strokeStyle = params.strokeStyle ?? "black";
                ctx.lineCap = params.lineCap ?? "round";
                for (let [start, end] of blits) {
                    ctx.moveTo(start.x + 0, start.y + 0);
                    ctx.lineTo(end.x + 0, end.y + 0);
                }
                ctx.closePath();
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
            let { objects, blitGroups } = layer.getObjectsWithBlits(
                this.grid,
                settings,
                change
            );
            // TODO: This will actually require data from other layers sometimes
            objects = this.occlusionStuff(objects);

            for (let { blitter, blits, params } of blitGroups) {
                if (!this.blitters[blitter]) {
                    // TODO
                    console.log(
                        "NONEXISTANT blitter: ",
                        objects[0].blits[0].blitter
                    );
                    continue;
                }

                blits = blits
                    .map((blitsOfObject) =>
                        blitsOfObject.map((pointsOfBlit) =>
                            pointsOfBlit.map(
                                this.grid.translatePoint.bind(this.grid)
                            )
                        )
                    )
                    .flat(1);

                this.blitters[blitter].blit({
                    ctx: this.ctx,
                    settings: this.settings,
                    blits,
                    params,
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
