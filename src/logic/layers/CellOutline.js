import { handlePointerEventCycleStates } from "./controls/onePoint";

export class CellOutlineLayer {
    // -- Identification --
    static id = "Cell Outline";
    static unique = true;
    hidden = true;

    // -- Controls --
    controls = "onePoint";
    pointTypes = ["cells"];
    states = [true];
    drawMultiple = true;

    constructor() {
        handlePointerEventCycleStates(this, {
            states: this.states,
            pointTypes: this.pointTypes,
        });
    }

    // -- Rendering --
    defaultRenderOrder = 2;
    getBlits({ grid, stored }) {
        const blacklist = stored.renderOrder.filter(
            (key) => stored.objects[key].state
        );
        const { cells, gridEdge } = grid.getPoints({
            connections: {
                cells: {
                    edges: { corners: { svgPoint: true } },
                    shrinkwrap: { key: "gridEdge", svgPolygon: { inset: -4 } },
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

        for (let id in edges) {
            if (!edges[id]) {
                delete edges[id];
            }
        }

        const gridEdgeBlits = {};
        for (let loop of gridEdge.svgPolygon) {
            // TODO: This is stupid. Replace with uuid or something...
            gridEdgeBlits[Math.floor(Math.random() * 100000)] = loop.map(
                ({ x, y }) => [x, y]
            );
        }
        // gridEdge.svgPolygon.map((loop) =>
        //     loop.map(({ x, y }) => [x, y])
        // );

        return [
            {
                blitter: "line",
                blits: edges,
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
