import { ILayer } from "../../globals";
import { BaseLayer } from "./baseLayer";
import { handleEventsCycleStates, OnePointProps } from "./controls/onePoint";

export interface CellOutlineProps extends OnePointProps {
    ObjectState: { id: string; points: string[]; state: true };
}

export const CellOutlineLayer: ILayer<CellOutlineProps> = {
    ...BaseLayer,
    id: "Cell Outline",
    unique: true,
    ethereal: true,

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
    },

    getBlits({ storage, grid }) {
        const stored = storage.getStored<CellOutlineProps>({
            grid,
            layer: this,
        });

        const blacklist = stored.renderOrder.filter((key) => stored.objects[key].state);
        const { cells, gridEdge } = grid.getPoints({
            connections: {
                cells: {
                    edges: { corners: { svgPoint: true } },
                    shrinkwrap: { key: "gridEdge", svgPolygons: { inset: -4 } },
                },
            },
            blacklist,
        });

        const Nothing = { x1: 0, x2: 0, y1: 0, y2: 0 };
        const edges: Record<string, typeof Nothing> = {};
        for (let cell in cells) {
            for (let edge in cells[cell].edges) {
                /* If a cell does not share an edge with another cell, use a thick line. */
                if (edges[edge] === undefined) {
                    edges[edge] = Nothing;
                } else {
                    const corners = cells[cell].edges[edge].corners;
                    const [[x1, y1], [x2, y2]] = Object.values(corners).map(
                        ({ svgPoint }: any) => svgPoint,
                    );
                    edges[edge] = { x1, y1, x2, y2 };
                }
            }
        }

        for (let id in edges) {
            if (edges[id] === Nothing) {
                delete edges[id];
            }
        }

        const outline: Record<string, any> = {};
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
                    strokeLinejoin: "miter",
                    fill: "none",
                },
            },
        ];
    },
};
