import { handleEventsCurrentSetting } from "./controls/twoPoint";

export class SimpleLineLayer {
    static id = "Line";
    static unique = false;
    hidden = false;

    static defaultSettings = { fill: "green" };

    newSettings({ newSettings }) {
        this.rawSettings = newSettings;
        this.settings = {
            selectedState: { fill: newSettings.fill || "green" },
        };

        handleEventsCurrentSetting(this, {
            // TODO: Directional true/false is ambiguous. There are three types: lines and arrows with/without overlap
            directional: false,
            pointTypes: ["cells"],
            stopOnFirstPoint: false,
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
            id: key,
            blitter: "line",
            blits: blits[key],
            // TODO: styling includes more than just color...
            style: {
                stroke: key,
                strokeWidth: 4,
                strokeLinecap: "round",
            },
        }));
    }
}
