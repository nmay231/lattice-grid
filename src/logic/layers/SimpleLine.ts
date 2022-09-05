import { LineBlits } from "../../components/SVGCanvas/Line";
import { Layer, LayerClass, PointType } from "../../types";
import { BaseLayer, methodNotImplemented } from "./baseLayer";
import { handleEventsCurrentSetting, TwoPointProps } from "./controls/twoPoint";

const pointTypes = {
    "Cell to Cell": "cells",
    "Corner to Corner": "corners",
} as const;

export interface SimpleLineProps extends TwoPointProps {
    Type: "SimpleLineLayer";
    ObjectState: {
        id: string;
        state: { fill: string };
        points: string[];
    };
    RawSettings: {
        connections: keyof typeof pointTypes;
        fill: string;
    };
}

interface ISimpleLineLayer extends Layer<SimpleLineProps> {
    settings: { pointType: PointType; selectedState: { fill: string } };
}

export class SimpleLineLayer extends BaseLayer<SimpleLineProps> implements ISimpleLineLayer {
    static ethereal = false;
    static unique = false;
    static type = "SimpleLineLayer" as const;
    static displayName = "Line";
    static defaultSettings = { fill: "green", connections: "Cell to Cell" as const };

    settings = { pointType: "cells" as PointType, selectedState: { fill: "green" } };
    handleEvent = methodNotImplemented({ name: "SimpleLine.handleEvent" });
    gatherPoints = methodNotImplemented({ name: "SimpleLine.gatherPoints" });

    static create: LayerClass<SimpleLineProps>["create"] = (puzzle) => {
        return new SimpleLineLayer(SimpleLineLayer, puzzle);
    };

    static constraints = {
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
    };

    static controls = {
        schema: {
            type: "object",
            properties: {
                fill: {
                    type: "string",
                    enum: ["blue", "green", "orange", "pink", "purple", "red", "yellow"],
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
    };

    newSettings: ISimpleLineLayer["newSettings"] = ({ newSettings, storage, grid }) => {
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

        handleEventsCurrentSetting<SimpleLineProps>(this, {
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

        return { history: history || undefined };
    };

    getBlits: ISimpleLineLayer["getBlits"] = ({ storage, grid }) => {
        const stored = storage.getStored<SimpleLineProps>({
            grid,
            layer: this,
        });

        let allPoints = stored.renderOrder.flatMap((id) => stored.objects[id].points);
        allPoints = allPoints.filter((point, index) => index === allPoints.indexOf(point));
        const { [this.settings.pointType]: pointInfo } = grid.getPoints({
            connections: { [this.settings.pointType]: { svgPoint: true } },
            points: allPoints,
        });

        const blits: LineBlits["blits"] = {};
        for (const id of stored.renderOrder) {
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
    };
}
