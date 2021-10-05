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

    interpretKeyDown({ event, layer, storage }) {
        if (!layer.interpretKeyDown) {
            return;
        }
        const { state, interpreted } = layer.interpretKeyDown({ event }) || {};
        if (interpreted) {
            const points = storage
                .getLayerObjects({ layer: this })
                .filter(({ state }) => state)
                .map(({ point }) => point);

            storage.addObject({ layer, points, state });
        }
    }

    defaultRenderOrder = 9;

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
