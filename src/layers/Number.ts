import { TextBlits } from "../components/SVGCanvas/Text";
import { Layer, LayerClass, LayerHandlerResult, Point } from "../types";
import { zip } from "../utils/data";
import { BaseLayer, methodNotImplemented } from "./BaseLayer";
import { numberTyper } from "./controls/numberTyper";
import { handleEventsSelection, KeyDownEventHandler, SelectedProps } from "./controls/selection";

export interface NumberProps extends SelectedProps {
    ObjectState: { state: string; point: Point };
    RawSettings: { max: number; negatives: boolean };
}

interface INumberLayer extends Layer<NumberProps>, KeyDownEventHandler<NumberProps> {
    _numberTyper: ReturnType<typeof numberTyper>;
}

export class NumberLayer extends BaseLayer<NumberProps> implements INumberLayer {
    static ethereal = false;
    static readonly type = "NumberLayer";
    static displayName = "Number";
    static defaultSettings = { max: 9, negatives: false };

    handleEvent = methodNotImplemented({ name: "Number.handleEvent" });
    gatherPoints = methodNotImplemented({ name: "Number.gatherPoints" });
    _numberTyper = methodNotImplemented({
        name: "Number._numberTyper",
    }) as INumberLayer["_numberTyper"];

    static create = ((puzzle): NumberLayer => {
        return new NumberLayer(NumberLayer, puzzle);
    }) satisfies LayerClass<NumberProps>["create"];

    handleKeyDown: INumberLayer["handleKeyDown"] = ({
        points: ids,
        type,
        keypress,
        storage,
        grid,
    }) => {
        const stored = storage.getStored<NumberProps>({ grid, layer: this });
        if (!ids.length) {
            return {};
        }

        const states: Array<string | null> = ids.map((id) => stored.objects.get(id)?.state ?? null);

        const newStates = this._numberTyper(states, { type, keypress });

        if (newStates === "doNothing") return {};

        const history: LayerHandlerResult<NumberProps>["history"] = [];

        for (const [id, old, new_] of zip(ids, states, newStates)) {
            if (old === new_) continue;

            history.push({
                id,
                object: new_ === null ? null : { point: id, state: new_ },
            });
        }
        return { history };
    };

    static controls = undefined;
    static constraints = {
        schema: {
            type: "object",
            properties: { negatives: { type: "boolean" }, max: { type: "integer" } },
        },
        uischemaElements: [
            {
                type: "Control",
                label: "Allow Negatives",
                scope: "#/properties/negatives",
            },
            {
                type: "Control",
                label: "Maximum",
                scope: "#/properties/max",
            },
        ],
    };

    newSettings: INumberLayer["newSettings"] = ({ newSettings, grid, storage }) => {
        this.rawSettings = newSettings;
        this._numberTyper = numberTyper(newSettings);

        handleEventsSelection(this, {});

        const { objects } = storage.getStored<NumberProps>({
            grid,
            layer: this,
        });

        const history = [];

        // Delete numbers that are out of range
        const min = newSettings.negatives ? -newSettings.max : 0;
        const max = newSettings.max;
        for (const [id, object] of objects.entries()) {
            const state = parseInt(object.state);
            if (state < min || state > max) {
                history.push({ object: null, id });
            }
        }

        return { history };
    };

    getBlits: INumberLayer["getBlits"] = ({ grid, storage, settings }) => {
        const stored = storage.getStored<NumberProps>({ grid, layer: this });
        const group = stored.groups.getGroup(settings.editMode);
        const points = stored.objects.keys().filter((id) => group.has(id));

        const pt = grid.getPointTransformer(settings);
        const [cellMap, cells] = pt.fromPoints("cells", points);
        const toSVG = cells.toSVGPoints();
        const maxRadius = pt.maxRadius({ type: "cells", shape: "square", size: "lg" });

        const blits: TextBlits["blits"] = {};
        for (const [id, cell] of cellMap.entries()) {
            const point = toSVG.get(cell);
            if (!point) continue; // TODO?
            blits[id] = {
                text: stored.objects.get(id).state,
                point,
                size: maxRadius * 1.6,
            };
        }

        return [
            {
                id: "number",
                blitter: "text",
                blits,
                style: {
                    originX: "center",
                    originY: "center",
                },
            },
        ];
    };
}
