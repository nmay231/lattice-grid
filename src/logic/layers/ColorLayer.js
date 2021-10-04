export class ColorLayer {
    static id = "Background Color";
    static unique = false;

    hidden = false;
    controls = "onePoint";
    pointTypes = ["cells"];
    drawMultiple = true;

    defaultRenderOrder = 1;
    encoderPrefix = "c";

    getBlits(grid, settings, change) {
        const points = grid
            .getObjects({ layerId: this.id })
            .map(({ points }) => points[0]);
        const { cell: cells } = grid.getPoints({
            selection: { cell: { self: { svgOutline: true } } },
            points,
        });
        return [
            {
                blitter: "svgPath",
                style: { fillStyle: "blue" },
                blits: Object.keys(cells).map((key) => cells[key].svgOutline),
            },
        ];
    }
}
