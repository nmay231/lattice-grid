import { ILayer } from "../../globals";
import { BaseLayer } from "./baseLayer";
import { handleEventsCurrentSetting } from "./controls/onePoint";

export const BackgroundColorLayer: ILayer = {
    ...BaseLayer,
    id: "Background Color",
    unique: false,
    ethereal: false,

    defaultSettings: { selectedState: "blue" },

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
        const stored = storage.getStored({ grid, layer: this });
        const { cells } = grid.getPoints({
            connections: { cells: { svgOutline: true } },
            points: [...stored.renderOrder],
        });

        const objectsByColor = {};
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
