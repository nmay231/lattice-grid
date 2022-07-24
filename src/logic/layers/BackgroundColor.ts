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
        for (let id of stored.renderOrder) {
            const { state } = stored.objects[id];
            objectsByColor[state] = objectsByColor[state] ?? {};
            objectsByColor[state][id] = { points: cells[id].svgOutline };
        }

        return Object.keys(objectsByColor).map((color) => ({
            id: color,
            blitter: "polygon",
            style: { fill: color },
            blits: objectsByColor[color],
        }));
    },
};
