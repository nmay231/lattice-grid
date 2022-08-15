import { PolygonBlits } from "../../components/SVGCanvas/Polygon";
import { ILayer } from "../../globals";
import { BaseLayer } from "./baseLayer";
import { handleEventsCurrentSetting, OnePointProps } from "./controls/onePoint";

interface BackgroundColorProps extends OnePointProps {
    ObjectState: { id: string; points: string[]; state: string };
    RawSettings: { selectedState: string };
}

type BackgroundColorExtraProps = {
    settings: BackgroundColorProps["RawSettings"];
};

export const BackgroundColorLayer: ILayer<BackgroundColorProps> & BackgroundColorExtraProps = {
    ...BaseLayer,
    id: "Background Color",
    unique: false,
    ethereal: false,

    defaultSettings: { selectedState: "blue" },
    rawSettings: { selectedState: "blue" },
    settings: { selectedState: "blue" },

    newSettings({ newSettings }) {
        this.rawSettings = newSettings;
        this.settings = {
            selectedState: newSettings.selectedState || "blue",
        };

        handleEventsCurrentSetting(this, {
            pointTypes: ["cells"],
            // TODO: Replace deltas with FSM
            deltas: [
                { dx: 0, dy: 2 },
                { dx: 0, dy: -2 },
                { dx: 2, dy: 0 },
                { dx: -2, dy: 0 },
            ],
        });
    },

    getBlits({ storage, grid }) {
        const stored = storage.getStored<BackgroundColorProps>({
            grid,
            layer: this,
        });
        const { cells } = grid.getPoints({
            connections: { cells: { svgOutline: true } },
            points: [...stored.renderOrder],
        });

        const objectsByColor: Record<string, PolygonBlits["blits"]> = {};
        for (const id of stored.renderOrder) {
            const { state } = stored.objects[id];
            objectsByColor[state] = objectsByColor[state] ?? {};
            objectsByColor[state][id] = { points: cells[id].svgOutline };
        }

        return Object.keys(objectsByColor).map((color) => ({
            id: color,
            blitter: "polygon",
            // TODO: Should I keep stroke(Width) even after I allow putting this layer under the grid? It might be cleaner to keep the border so that it looks okay when placed outside of the grid. In any case, I can always add an option.
            style: { fill: color, strokeWidth: 2, stroke: "black" },
            blits: objectsByColor[color],
        }));
    },
};
