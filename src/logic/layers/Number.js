export class NumberLayer {
    // -- Identification --
    static id = "Number";
    static unique = false;
    hidden = false;

    // -- Controls --
    controls = "onePoint";
    pointTypes = ["cells"];
    // TODO: The states api is not the best one for number
    states = [undefined, "0", "1", "2"];
    drawMultiple = true;

    defaultRenderOrder = 6;

    getBlits(grid, storage) {
        const objects = storage
            .getLayerObjects({ layer: this })
            .filter(({ state }) => state !== undefined);

        const { cells } = grid.getPoints({
            connections: { cells: { svgPoint: true } },
            points: objects.map(({ point }) => point),
        });

        return [
            {
                blitter: "text",
                blits: objects.map(({ point, state }) => ({
                    text: state,
                    point: cells[point].svgPoint,
                })),
                style: {
                    vertical: "center",
                    horizontal: "center",
                    size: 60,
                },
            },
        ];
    }
}
