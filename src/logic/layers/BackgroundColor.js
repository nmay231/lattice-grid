import { handlePointerEventCurrentSetting } from "./controls/onePoint";

export class BackgroundColorLayer {
    // -- Identification --
    static id = "Background Color";
    static unique = false;
    hidden = false;

    // -- Controls --
    controls = "onePoint";
    pointTypes = ["cells"];
    drawMultiple = true;

    // TODO: allow user to select current state :P
    settings = {
        selectedState: "blue",
    };
    constructor() {
        // TODO: don't mix constructor and outside constructor syntax (?)
        handlePointerEventCurrentSetting(this, { pointTypes: ["cells"] });
    }

    // -- Rendering --
    defaultRenderOrder = 1;
    getBlits({ grid, stored }) {
        const { cells } = grid.getPoints({
            connections: { cells: { svgOutline: true } },
            points: [...stored.renderOrder],
        });

        const objectsByColor = {};
        for (let id of stored.renderOrder) {
            const { state } = stored.objects[id];
            objectsByColor[state] = objectsByColor[state] ?? {};
            objectsByColor[state][id] = cells[id].svgOutline;
        }

        return Object.keys(objectsByColor).map((color) => ({
            blitter: "polygon",
            style: { fill: color },
            blits: objectsByColor[color],
        }));
    }
}
