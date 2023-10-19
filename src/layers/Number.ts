import { Layer, LayerClass, LayerHandlerResult, SVGGroup } from "../types";
import { concat, zip } from "../utils/data";
import { notify } from "../utils/notifications";
import { BaseLayer } from "./BaseLayer";
import { numberTyper } from "./controls/numberTyper";
import { KeyDownEventHandler, SelectedProps, handleEventsSelection } from "./controls/selection";
import styles from "./layers.module.css";

export interface NumberProps extends SelectedProps {
    ObjectState: { state: string };
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

    _numberTyper: INumberLayer["_numberTyper"] = () => {
        throw notify.error({
            message: `${this.type}._numberTyper() called before implementing!`,
            forever: true,
        });
    };

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

        const states: Array<string | null> = ids.map((id) => {
            const object = stored.getObject(id);
            return object?.state ?? null;
        });

        const newStates = this._numberTyper(states, { type, keypress });

        if (newStates === "doNothing") return {};

        const history: LayerHandlerResult<NumberProps>["history"] = [];

        for (const [id, old, new_] of zip(ids, states, newStates)) {
            if (old === new_) continue;

            history.push({
                id,
                object: new_ === null ? null : { state: new_ },
            });
        }
        return { history };
    };

    static controls: NumberLayer["controls"] = { elements: [], numpadControls: true };
    static constraints: NumberLayer["constraints"] = {
        elements: [
            { type: "number", key: "max", label: "Max", min: 0 },
            { type: "boolean", key: "negatives", label: "Allow negatives" },
        ],
    };

    newSettings: INumberLayer["newSettings"] = ({ newSettings, grid, storage }) => {
        this.rawSettings = newSettings;
        this._numberTyper = numberTyper(newSettings);

        handleEventsSelection(this, {});

        const stored = storage.getStored<NumberProps>({
            grid,
            layer: this,
        });

        const history = [];

        // Delete numbers that are out of range
        const min = newSettings.negatives ? -newSettings.max : 0;
        const max = newSettings.max;
        for (const [id, object] of concat(stored.entries("answer"), stored.entries("question"))) {
            const state = parseInt(object.state);
            if (state < min || state > max) {
                history.push({ object: null, id });
            }
        }

        return { history };
    };

    getSVG: INumberLayer["getSVG"] = ({ grid, storage, settings }) => {
        const stored = storage.getStored<NumberProps>({ grid, layer: this });
        const group = stored.groups.getGroup(settings.editMode);

        const pt = grid.getPointTransformer(settings);
        const [cellMap, cells] = pt.fromPoints("cells", [...group]);
        const toSVG = cells.toSVGPoints();
        const maxRadius = pt.maxRadius({ type: "cells", shape: "square", size: "lg" });

        const className = [styles.textHorizontalCenter, styles.textVerticalCenter].join(" ");
        const elements: SVGGroup["elements"] = new Map();
        for (const [id, object] of stored.entries(settings.editMode)) {
            const point = toSVG.get(cellMap.get(id));
            if (!point) continue; // TODO?

            elements.set(id, {
                className,
                children: object.state,
                x: point[0],
                y: point[1],
                fontSize: maxRadius * 1.6,
            });
        }

        return [{ id: "number", type: "text", elements }];
    };
}
