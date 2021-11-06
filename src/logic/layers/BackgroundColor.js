import { interpretPointerEventCurrentSetting } from "./controls/onePoint";

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
        this.interpretPointerEvent =
            interpretPointerEventCurrentSetting.bind(this);
    }

    // -- Rendering --
    defaultRenderOrder = 1;
    getBlits({ grid, storage }) {
        const objects = storage.getLayerObjects({ layer: this });
        const { cells } = grid.getPoints({
            connections: { cells: { svgOutline: true } },
            points: objects.map((ob) => ob.point),
        });

        const objectsByColor = {};
        for (let { state, point } of objects) {
            objectsByColor[state] = objectsByColor[state] ?? {};
            objectsByColor[state][point] = cells[point].svgOutline;
        }

        return Object.keys(objectsByColor).map((color) => ({
            blitter: "polygon",
            style: { fill: color },
            blits: objectsByColor[color],
        }));
    }
}
