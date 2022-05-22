import { BaseLayer, ILayer } from "./baseLayer";
import { handleEventsCurrentSetting } from "./controls/twoPoint";

export type SimpleLineSettings = {
    pointType: string;
    selectedState: { fill: string };
};
type SimpleLineProps = {
    settings: SimpleLineSettings;
};

export type ObjectState = {
    state: { fill: string };
    points: string[];
};
export type RawSettings = {
    connections: keyof typeof pointTypes;
    fill: string;
};

const pointTypes = {
    "Cell to Cell": "cells",
    "Corner to Corner": "corners",
};

export const SimpleLineLayer: ILayer<ObjectState, RawSettings> &
    SimpleLineProps = {
    ...BaseLayer,
    id: "Line",
    unique: false,
    ethereal: false,

    rawSettings: {
        fill: "green",
        connections: "Cell to Cell",
    },
    defaultSettings: {
        fill: "green",
        connections: "Cell to Cell",
    },

    constraints: {
        schema: {
            type: "object",
            properties: {
                connections: {
                    type: "string",
                    enum: Object.keys(pointTypes),
                },
            },
        },
        uischemaElements: [
            {
                type: "Control",
                label: "Connections",
                scope: "#/properties/connections",
            },
        ],
    },

    controls: {
        schema: {
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
        },
        uischemaElements: [
            {
                type: "Control",
                label: "Color",
                scope: "#/properties/fill",
            },
        ],
    },

    settings: { pointType: "cells", selectedState: { fill: "green" } },

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

        handleEventsCurrentSetting<ObjectState, RawSettings>(this, {
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
    },

    getBlits({ grid, stored }) {
        let allPoints = stored.renderOrder.flatMap(
            (id) => stored.objects[id].points,
        );
        allPoints = allPoints.filter(
            (point, index) => index === allPoints.indexOf(point),
        );
        const { [this.settings.pointType]: pointInfo } = grid.getPoints({
            connections: { [this.settings.pointType]: { svgPoint: true } },
            points: allPoints,
        });

        const blits: Record<string, object> = {};
        for (let id of stored.renderOrder) {
            const {
                state: { fill },
                points,
            } = stored.objects[id];
            blits[id] = {
                style: {
                    stroke: fill, // Yes, this is a misnomer. Oh well
                },
                x1: pointInfo[points[0]].svgPoint[0],
                y1: pointInfo[points[0]].svgPoint[1],
                x2: pointInfo[points[1]].svgPoint[0],
                y2: pointInfo[points[1]].svgPoint[1],
            };
        }

        return [
            {
                id: "lines",
                blitter: "line",
                blits,
                // TODO: styling includes more than just color...
                style: {
                    strokeWidth: 4,
                    strokeLinecap: "round",
                },
            },
        ];
    },
};