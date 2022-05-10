import { handleEventsCycleStates } from "./controls/onePoint";

export class CellOutlineLayer {
    static id = "Cell Outline";
    static unique = true;
    ethereal = true;

    newSettings() {
        handleEventsCycleStates(this, {
            states: [true],
            pointTypes: ["cells"],
            // TODO: Change deltas to Finite State Machine
            deltas: [
                { dx: 0, dy: 2 },
                { dx: 0, dy: -2 },
                { dx: 2, dy: 0 },
                { dx: -2, dy: 0 },
            ],
        });
    }

    getBlits({ grid, stored }) {
        const blacklist = stored.renderOrder.filter(
            (key) => stored.objects[key].state,
        );
        const { cells, gridEdge } = grid.getPoints({
            connections: {
                cells: {
                    edges: { corners: { svgPoint: true } },
                    shrinkwrap: { key: "gridEdge", svgPolygons: { inset: -4 } },
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
                    const [[x1, y1], [x2, y2]] = Object.values(corners).map(
                        ({ svgPoint }) => svgPoint,
                    );
                    edges[edge] = { x1, y1, x2, y2 };
                }
            }
        }

        for (let id in edges) {
            if (!edges[id]) {
                delete edges[id];
            }
        }

        const outline = {};
        for (let key in gridEdge.svgPolygons) {
            outline[key] = { points: gridEdge.svgPolygons[key] };
        }

        return [
            {
                id: "grid",
                blitter: "line",
                blits: edges,
                style: {
                    stroke: "black",
                    strokeWidth: 2,
                    strokeLinecap: "square",
                },
            },
            {
                id: "outline",
                blitter: "polygon",
                blits: outline,
                style: {
                    stroke: "black",
                    strokeWidth: 10,
                    strokeLinejoin: "square",
                    fill: "none",
                },
            },
        ];
    }
}
