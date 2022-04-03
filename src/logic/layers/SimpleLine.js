import { handleEventsCurrentSetting } from "./controls/twoPoint";

const pointTypes = {
    "Cell to Cell": "cells",
    "Corner to Corner": "corners",
};

export class SimpleLineLayer {
    static id = "Line";
    static unique = false;
    hidden = false;

    static defaultSettings = {
        fill: "green",
        connections: "Cell to Cell",
    };
    static settingsSchema = {
        type: "object",
        properties: {
            connections: {
                type: "string",
                enum: Object.keys(pointTypes),
            },
        },
    };
    static settingsUISchemaElements = [
        {
            type: "Control",
            label: "Connections",
            scope: "#/properties/connections",
        },
    ];
    static controlsSchema = {
        type: "object",
        properties: {
            fill: {
                type: "string",
                enum: [
                    "blue",
                    "green",
                    "orange",
                    "pink",
                    "purple",
                    "red",
                    "yellow",
                ],
            },
        },
    };
    static controlsUISchemaElements = [
        {
            type: "Control",
            label: "Color",
            scope: "#/properties/fill",
        },
    ];

    newSettings({ newSettings, storage, grid }) {
        this.rawSettings = this.rawSettings || {};
        let history = null;
        if (this.rawSettings.connections !== newSettings.connections) {
            // Clear stored if the type of connections allowed changes (because that would allow impossible-to-draw lines otherwise).
            const stored = storage.getStored({ grid, layer: this });
            history = stored.renderOrder.map((id) => ({ id, object: null }));
        }

        this.rawSettings = newSettings;
        this.settings = {
            pointType: pointTypes[newSettings.connections] || "cells",
            selectedState: {
                fill: newSettings.fill || "green",
            },
        };

        handleEventsCurrentSetting(this, {
            // TODO: Directional true/false is ambiguous. There are three types: lines and arrows with/without overlap
            directional: false,
            pointTypes: [this.settings.pointType],
            stopOnFirstPoint: false,
            // TODO: Replace deltas with FSM
            deltas: [
                { dx: 0, dy: 2 },
                { dx: 0, dy: -2 },
                { dx: 2, dy: 0 },
                { dx: -2, dy: 0 },
            ],
        });

        if (history) {
            return { history };
        }
    }

    getBlits({ grid, stored }) {
        const blits = {};
        for (let id of stored.renderOrder) {
            const { points, state } = stored.objects[id];
            blits[state.fill] = blits[state.fill] ?? {};

            const { [this.settings.pointType]: pointInfo } = grid.getPoints({
                connections: { [this.settings.pointType]: { svgPoint: true } },
                points,
            });
            blits[state.fill][id] = points.map((p) => pointInfo[p].svgPoint);
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
