export class SelectionLayer {
    // -- Identification --
    static id = "Selections";
    static unique = true;
    hidden = true;

    // -- Controls --
    controls = "onePoint";
    pointTypes = ["cells"];
    states = [false, true];
    drawMultiple = true;

    defaultRenderOrder = 9;

    // TODO: Implement interpretPointer so that the SelectionLayer can remove all other objects and stuff
    // TODO: Implement interpretKeyDown
    // TODO: Do I need keyUp, for anything? Maybe just put it on the todolist?
    // TODO: Also, why was it REALLY slow to react to things sometimes....
    // So, the storageManager handles occlusion tests, etc. right before storage.
    // However, since individual objects can have custom styles, I need to somehow apply that to different blits. This is difficult because, for example, celloutline doesn't have a one-to-one object to blit relationship. The edgeBlit is shared by all cell objects on the edge.
    getBlits(grid, storage) {
        const points = storage
            .getLayerObjects({ layer: this })
            .filter(({ state }) => state)
            .map(({ point }) => point);

        let blits = [];
        if (points.length) {
            const { selectionCage } = grid.getPoints({
                connections: {
                    cells: {
                        shrinkwrap: {
                            key: "selectionCage",
                            svgPolygon: { inset: 5 },
                        },
                    },
                },
                points,
            });

            blits = selectionCage.svgPolygon.map((loop) =>
                loop.map(({ x, y }) => [x, y])
            );
        }
        return [
            {
                blitter: "polygon",
                blits,
                style: {
                    stroke: "#00F9",
                    strokeWidth: 8,
                    strokeLinecap: "round",
                    fill: "none",
                },
            },
        ];
    }
}
