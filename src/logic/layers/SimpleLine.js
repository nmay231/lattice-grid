import { handlePointerEventCurrentSetting } from "./controls/twoPoint";

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
        handlePointerEventCurrentSetting(this, {
            // TODO: Directional true/false is ambiguous. There are three types: lines and arrows with/without overlap
            directional: false,
            pointTypes: ["cells"],
            stopOnFirstPoint: false,
        });
    }

    settings = {
        selectedState: { fill: "green" },
    };

    // -- Rendering --
    defaultRenderOrder = 6;
    getBlits({ grid, stored }) {
        const blits = {};
        for (let id of stored.renderOrder) {
            const { points, state } = stored.objects[id];
            blits[state.fill] = blits[state.fill] ?? {};

            const { cells } = grid.getPoints({
                connections: { cells: { svgPoint: true } },
                points,
            });
            blits[state.fill][id] = points.map((p) => cells[p].svgPoint);
        }

        return Object.keys(blits).map((key) => ({
            blitter: "line",
            blits: blits[key],
            // TODO: styling includes more than just color...
            style: {
                stroke: key,
                strokeWidth: 4,
                strokeLinecap: "square",
            },
        }));
    }
}