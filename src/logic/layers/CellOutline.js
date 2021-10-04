export class CellOutlineLayer {
    // -- Identification --
    static id = "Cell Outline";
    static unique = true;
    hidden = true;

    // -- Controls --
    controls = "onePoint";
    pointTypes = ["cells"];
    states = [true, false];
    drawMultiple = true;

    // -- Encoding/decoding --
    // TODO: by the by: https://en.wikipedia.org/wiki/Vigen%C3%A8re_cipher
    encoderPrefix = "o";
    encode(grid, settings) {}
    decode(grid, settings) {}

    // -- Rendering --
    defaultRenderOrder = 2;
    getBlits(grid, storage) {
        const blacklist = storage
            .getLayerObjects({ layer: this })
            .filter(({ state }) => !state)
            .map(({ point }) => point);
        const { cells, gridEdge } = grid.getPoints({
            connections: {
                cells: {
                    edges: { corners: { svgPoint: true } },
                    shrinkwrap: { key: "gridEdge", svgPolygon: { inset: -5 } },
                },
            },
            blacklist,
        });

        const edges = {};
        for (let cell in cells) {
            for (let edge in cells[cell].edges) {
                /* If a cell does not share an edge with another cell, use a thick line. */
                if (edges[edge] === undefined) {
                    edges[edge] = false;
                } else {
                    const corners = cells[cell].edges[edge].corners;
                    edges[edge] = Object.values(corners).map(
                        ({ svgPoint }) => svgPoint
                    );
                }
            }
        }

        const edgeBlits = Object.values(edges).filter((edge) => edge);

        const gridEdgeBlits = gridEdge.svgPolygon.map((loop) =>
            loop.map(({ x, y }) => [x, y])
        );

        return [
            {
                blitter: "line",
                blits: edgeBlits,
                style: {
                    stroke: "black",
                    strokeWidth: 2,
                    strokeLinecap: "square",
                },
            },
            {
                blitter: "polygon",
                blits: gridEdgeBlits,
                style: {
                    stroke: "black",
                    strokeWidth: 10,
                    strokeLinecap: "square",
                    fill: "none",
                },
            },
        ];
    }
}
