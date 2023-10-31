import {
    Color,
    FormSchema,
    Layer,
    LayerClass,
    ObjectId,
    PartialHistoryAction,
    Point,
    PointType,
    SVGGroup,
} from "../types";
import { DEFAULT_COLORS, isValidColor } from "../utils/colors";
import { concat } from "../utils/data";
import { BaseLayer } from "./BaseLayer";
import { TwoPointProps, handleEventsCurrentSetting } from "./controls/twoPoint";
import styles from "./layers.module.css";

type LineState = { stroke: Color };
export interface SimpleLineProps extends TwoPointProps<LineState> {
    ObjectState: {
        id: ObjectId;
        stroke: Color;
        points: Point[];
    };
    Settings: {
        pointType: PointType;
        stroke: Color;
        /** Derived from stroke, and any future styles */
        selectedState: `${Color}`;
    };
}

interface ISimpleLineLayer extends Layer<SimpleLineProps> {}

export class SimpleLineLayer extends BaseLayer<SimpleLineProps> implements ISimpleLineLayer {
    static ethereal = false;
    static readonly type = "SimpleLineLayer";
    static displayName = "Line";
    static defaultSettings: SimpleLineProps["Settings"] = {
        pointType: "cells",
        stroke: DEFAULT_COLORS.LIGHT_GREEN,
        selectedState: DEFAULT_COLORS.LIGHT_GREEN,
    };

    static create = ((puzzle): SimpleLineLayer => {
        return new SimpleLineLayer(SimpleLineLayer, puzzle);
    }) satisfies LayerClass<SimpleLineProps>["create"];

    static controls: FormSchema<SimpleLineProps> = {
        elements: { stroke: { type: "color", label: "Stroke color" } },
    };

    static constraints: FormSchema<SimpleLineProps> = {
        elements: {
            pointType: {
                type: "dropdown",
                label: "Where to draw lines",
                pairs: [
                    { label: "Cell to Cell", value: "cells" },
                    { label: "Corner to Corner", value: "corners" },
                ],
            },
        },
    };

    static settingsDescription: LayerClass<SimpleLineProps>["settingsDescription"] = {
        pointType: { type: "constraints" },
        stroke: { type: "controls" },
        selectedState: { type: "controls", derived: true },
    };

    static isValidSetting<K extends keyof SimpleLineProps["Settings"]>(
        key: K | string,
        value: unknown,
    ): value is SimpleLineProps["Settings"][K] {
        if (key === "pointType") {
            return value === "cells" || value === "corners";
        } else if (key === "stroke") {
            return typeof value === "string" && isValidColor(value);
        }
        return false;
    }

    updateSettings: ISimpleLineLayer["updateSettings"] = ({ grid, storage, oldSettings }) => {
        let history: PartialHistoryAction<SimpleLineProps>[] | undefined = undefined;
        if (oldSettings?.pointType !== this.settings.pointType) {
            // Clear stored if the type of connections allowed changes (because that would allow impossible-to-draw lines otherwise).
            const stored = storage.getStored({ grid, layer: this });
            history = [...concat(stored.keys("question"), stored.keys("answer"))].map((id) => ({
                id,
                object: null,
            }));

            const { gatherPoints, handleEvent } = handleEventsCurrentSetting<
                SimpleLineProps,
                LineState
            >({
                // TODO: Directional true/false is ambiguous. There are three types: lines and arrows with/without overlap (that is, can you draw two arrows on top each other in different directions)
                directional: false,
                pointTypes: [this.settings.pointType],
                // TODO: Replace deltas with FSM
                deltas: [
                    { dx: 0, dy: 2 },
                    { dx: 0, dy: -2 },
                    { dx: 2, dy: 0 },
                    { dx: -2, dy: 0 },
                ],
                stateKeys: ["stroke"],
            });
            this.gatherPoints = gatherPoints;
            this.handleEvent = handleEvent;
        }

        if (oldSettings?.stroke !== this.settings.stroke) {
            this.settings.selectedState = this.settings.stroke;
        }

        return { history };
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
        for (const [id, { points, stroke }] of stored.entries(settings.editMode)) {
            const first = toSVG.get(pointMap.get(points[0]));
            const second = toSVG.get(pointMap.get(points[1]));
            if (!first || !second) continue; // TODO?

            const [x1, y1] = first;
            const [x2, y2] = second;
            elements.set(id, {
                className: styles.simpleLine,
                stroke,
                x1,
                y1,
                x2,
                y2,
            });
        }

        return [{ id: "lines", type: "line", elements }];
    };
}
