import { interpretPointerEventStopOnFirstPoint } from "./controls/twoPoint";

export class SimpleLineLayer {
    // -- Identification --
    static id = "Line";
    static unique = false;
    hidden = false;

    // -- Controls --
    controls = "twoPoint";
    pointTypes = ["cells"];
    drawMultiple = true;

    constructor() {
        interpretPointerEventStopOnFirstPoint(this, { directional: false });
    }

    settings = {
        selectedState: { fill: "green" },
    };

    // -- Rendering --
    defaultRenderOrder = 6;
    getBlits({ grid, storage }) {
        const objects = storage
            .getLayerObjects({ layer: this })
            .filter(({ state }) => state);

        const blits = {};
        for (let { points, state } of objects) {
            blits[state.fill] = blits[state.fill] ?? {};
            const { cells } = grid.getPoints({
                connections: { cells: { svgPoint: true } },
                points,
            });
            blits[state.fill][points.join(",")] = points.map(
                (p) => cells[p].svgPoint
            );
        }

        return Object.keys(blits).map((key) => ({
            blitter: "line",
            blits: blits[key],
            // TODO: styling includes more than just color...
            style: {
                stroke: key,
                strokeWidth: 2,
                strokeLinecap: "square",
            },
        }));
    }
}
