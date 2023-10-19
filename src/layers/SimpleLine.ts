import { FormSchema, Layer, LayerClass, ObjectId, Point, PointType, SVGGroup } from "../types";
import { concat } from "../utils/data";
import { BaseLayer } from "./BaseLayer";
import { TwoPointProps, handleEventsCurrentSetting } from "./controls/twoPoint";
import styles from "./layers.module.css";

type Color = string;
const GREEN: Color = "var(--user-light-green)";

const pointTypes = {
    "Cell to Cell": "cells",
    "Corner to Corner": "corners",
} as const;

export interface SimpleLineProps extends TwoPointProps {
    ObjectState: {
        id: ObjectId;
        state: { stroke: Color };
        points: Point[];
    };
    RawSettings: {
        connections: keyof typeof pointTypes;
        stroke: Color;
    };
}

interface ISimpleLineLayer extends Layer<SimpleLineProps> {
    settings: { pointType: PointType; selectedState: { stroke: Color } };
}

export class SimpleLineLayer extends BaseLayer<SimpleLineProps> implements ISimpleLineLayer {
    static ethereal = false;
    static readonly type = "SimpleLineLayer";
    static displayName = "Line";
    static defaultSettings = { stroke: GREEN, connections: "Cell to Cell" as const };

    settings: ISimpleLineLayer["settings"] = {
        pointType: "cells",
        selectedState: { stroke: GREEN },
    };

    static create = ((puzzle): SimpleLineLayer => {
        return new SimpleLineLayer(SimpleLineLayer, puzzle);
    }) satisfies LayerClass<SimpleLineProps>["create"];

    static constraints: FormSchema<SimpleLineProps> = {
        elements: [
            {
                type: "dropdown",
                key: "connections",
                label: "Where to draw lines",
                // TODO: Change to label, value and get rid of `pointTypes`
                pairs: Object.keys(pointTypes).map((key) => ({ label: key, value: key })),
                // pairs: Object.entries(pointTypes).map(([label, value]) => ({ label, value })),
            },
        ],
    };

    static controls: FormSchema<SimpleLineProps> = {
        elements: [{ type: "color", key: "stroke", label: "Stroke color" }],
    };

    newSettings: ISimpleLineLayer["newSettings"] = ({ newSettings, storage, grid }) => {
        this.rawSettings = this.rawSettings || {};
        let history = null;
        if (this.rawSettings.connections !== newSettings.connections) {
            // Clear stored if the type of connections allowed changes (because that would allow impossible-to-draw lines otherwise).
            const stored = storage.getStored({ grid, layer: this });
            history = [
                ...concat(stored.groups.getGroup("question"), stored.groups.getGroup("answer")),
            ].map((id) => ({ id, object: null }));
        }

        this.rawSettings = newSettings;
        this.settings = {
            pointType: pointTypes[newSettings.connections] || "cells",
            selectedState: {
                stroke: newSettings.stroke || GREEN,
            },
        };

        handleEventsCurrentSetting<SimpleLineProps>(this, {
            // TODO: Directional true/false is ambiguous. There are three types: lines and arrows with/without overlap
            directional: false,
            pointTypes: [this.settings.pointType],
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

    getSVG: ISimpleLineLayer["getSVG"] = ({ grid, storage, settings }) => {
        const stored = storage.getStored<SimpleLineProps>({
            grid,
            layer: this,
        });
        let allPoints = [...stored.entries(settings.editMode)].flatMap(
            ([, object]) => object.points,
        );
        allPoints = allPoints.filter((point, index) => index === allPoints.indexOf(point));

        const pt = grid.getPointTransformer(settings);
        const [pointMap, gridPoints] = pt.fromPoints(this.settings.pointType, allPoints);
        const toSVG = gridPoints.toSVGPoints();

        const elements: SVGGroup["elements"] = new Map();
        for (const [id, { state, points }] of stored.entries(settings.editMode)) {
            const first = toSVG.get(pointMap.get(points[0]));
            const second = toSVG.get(pointMap.get(points[1]));
            if (!first || !second) continue; // TODO?

            const [x1, y1] = first;
            const [x2, y2] = second;
            elements.set(id, { className: styles.simpleLine, ...state, x1, y1, x2, y2 });
        }

        return [{ id: "lines", type: "line", elements }];
    };
}
