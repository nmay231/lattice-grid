import { handleEventsCurrentSetting } from "./controls/onePoint";

export class BackgroundColorLayer {
    static id = "Background Color";
    static unique = false;
    ethereal = false;

    static defaultSettings = { selectedState: "blue" };

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
    }

    getBlits({ grid, stored }) {
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
    }
}
