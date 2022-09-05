import { Layer, LayerClass, LayerProps } from "../../types";
import { BaseLayer, methodNotImplemented } from "./baseLayer";
import { KeyDownEventHandler } from "./Selection";

export interface NumberProps extends LayerProps {
    Type: "NumberLayer";
    ObjectState: { state: string; point: string };
    RawSettings: { min: number; max: number };
    ExtraLayerStorageProps: { lastTime: number; lastIds: string[] };
}

type NumberSettings = {
    match: (number: number, alternate?: string | null) => string | null | undefined;
};

interface INumberLayer extends Layer<NumberProps>, KeyDownEventHandler<NumberProps> {
    settings: NumberSettings;
    _newSettings: (arg: { min: number; max: number }) => NumberSettings;
    // TODO: More specific types
    _nextState: (state: any, oldState: any, event: any) => any;
}

export class NumberLayer extends BaseLayer<NumberProps> implements INumberLayer {
    static ethereal = false;
    static unique = false;
    static type = "NumberLayer" as const;
    static displayName = "Number";
    static defaultSettings = { min: 1, max: 9 };

    settings: INumberLayer["settings"] = { match: () => "" };
    handleEvent = methodNotImplemented({ name: "Number.handleEvent" });
    gatherPoints = methodNotImplemented({ name: "Number.gatherPoints" });

    static create: LayerClass<NumberProps>["create"] = (puzzle) => {
        return new NumberLayer(NumberLayer, puzzle);
    };

    handleKeyDown: INumberLayer["handleKeyDown"] = ({
        points: ids,
        keypress,
        storage,
        grid,
        settings,
    }) => {
        const stored = storage.getStored<NumberProps>({ grid, layer: this });
        if (!ids.length) {
            return {};
        }

        const timeDelay = Date.now() - (stored.lastTime || 0);
        stored.lastTime = Date.now();

        const selectionChanged = (stored.lastIds || []).join(";") !== ids.join(";");
        stored.lastIds = ids.slice();

        const states = ids.map((id) => stored.objects[id]?.state);
        const theSame =
            states[states.length - 1] ===
            states.reduce((prev, next) => (prev === next ? next : "DNE"));

        let state = theSame ? states[0] : "";
        if (timeDelay > settings.actionWindowMs || selectionChanged) {
            state = this._nextState("", state, keypress);
        } else {
            state = this._nextState(state, state, keypress);
        }

        if (state === undefined) {
            return {};
        }
        return {
            history: ids.map((id) => ({
                object: state === null ? null : { state, point: id },
                id,
            })),
        };
    };

    _nextState: INumberLayer["_nextState"] = (state, oldState, keypress) => {
        const match = this.settings?.match;
        if (keypress === "Backspace") {
            return match(oldState.toString().slice(0, -1), null);
        } else if (keypress === "Delete") {
            return null;
        } else if (keypress === "-") {
            // TODO: Keep the minus sign as part of an inProgress object and remove it when we deselect things.
            return match(-1 * parseInt(oldState)) ?? "-";
        } else if (keypress === "+" || keypress === "=") {
            return match(oldState && Math.abs(parseInt(oldState)), undefined);
        } else if (/^[0-9]$/.test(keypress)) {
            // TODO: Temporary solution
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            return match(parseInt(state + keypress), oldState);
        } else if (/^[a-fA-F]$/.test(keypress)) {
            return match(parseInt(keypress.toLowerCase(), 36), oldState);
        } else {
            return undefined; // Change nothing
        }
    };

    static constraints = {
        schema: {
            type: "object",
            properties: { min: { type: "integer" }, max: { type: "integer" } },
        },
        uischemaElements: [
            {
                type: "Control",
                label: "Minimum",
                scope: "#/properties/min",
            },
            {
                type: "Control",
                label: "Maximum",
                scope: "#/properties/max",
            },
        ],
    };

    _newSettings: INumberLayer["_newSettings"] = ({ min, max }) => {
        return {
            match: (number, alternate) =>
                min <= number && number <= max ? number.toString() : alternate,
        };
    };

    newSettings: INumberLayer["newSettings"] = ({
        newSettings,
        grid,
        storage,
        attachSelectionHandler,
    }) => {
        this.settings = this._newSettings(newSettings);
        this.rawSettings = newSettings;

        attachSelectionHandler(this, {});

        const { objects, renderOrder } = storage.getStored<NumberProps>({
            grid,
            layer: this,
        });

        const history = [];

        // Delete numbers that are out of range
        for (const id of renderOrder) {
            const object = objects[id];
            if (
                parseInt(object.state) < newSettings.min ||
                parseInt(object.state) > newSettings.max
            ) {
                history.push({ object: null, id });
            }
        }

        return { history };
    };

    getBlits: INumberLayer["getBlits"] = ({ grid, storage }) => {
        const stored = storage.getStored<NumberProps>({ grid, layer: this });
        const { cells } = grid.getPoints({
            connections: {
                cells: {
                    svgPoint: true,
                    maxRadius: { shape: "square", size: "large" },
                },
            },
            points: stored.renderOrder,
        });

        const blits: Record<string, unknown> = {};
        for (const id of stored.renderOrder) {
            blits[id] = {
                text: stored.objects[id].state,
                point: cells[id].svgPoint,
                size: cells[id].maxRadius * 1.6,
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
