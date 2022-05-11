import { BaseLayer, ILayer } from "./baseLayer";
import { KeyDownEventHandler } from "./Selection";

type ObjectState = {
    state: number;
};
type RawSettings = { min: number; max: number };

type NumberSettings = {
    match: (
        number: number,
        alternate?: string | null,
    ) => string | null | undefined;
};
type NumberProps = {
    settings: NumberSettings;
    _newSettings: (arg: { min: number; max: number }) => NumberSettings;
    _nextState: (state: any, oldState: any, event: any) => any;
};

export const NumberLayer: ILayer<ObjectState, RawSettings> &
    KeyDownEventHandler<ObjectState> &
    NumberProps = {
    ...BaseLayer,
    id: "Number",
    unique: false,
    ethereal: false,

    handleKeyDown({ points: ids, keypress, stored, settings }) {
        if (!ids.length) {
            return {};
        }

        const timeDelay = Date.now() - (stored.lastTime || 0);
        stored.lastTime = Date.now();

        const selectionChanged =
            (stored.lastIds || []).join(";") !== ids.join(";");
        stored.lastIds = ids.slice();

        const states = ids.map((id) => stored.objects[id]?.state);
        const theSame =
            states[states.length - 1] ===
            // Floating point numbers are not allowed in the NumberLayer
            states.reduce((prev, next) => (prev === next ? next : 0.1));

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
    },

    _nextState(state, oldState, event) {
        const match = this.settings?.match;
        if (event.code === "Backspace") {
            return match(oldState.toString().slice(0, -1), null);
        } else if (event.code === "Delete") {
            return null;
        } else if (event.code === "Minus") {
            // TODO: keep the Minus sign as part of an inProgress object and remove it when we deselect things.
            return match(-1 * parseInt(oldState)) ?? "-";
        } else if (event.code === "Plus" || event.code === "Equal") {
            return match(oldState && Math.abs(parseInt(oldState)), undefined);
        } else if ("1234567890".indexOf(event.key) !== -1) {
            return match(parseInt(state + event.key), oldState);
        } else if (/^[a-fA-F]$/.test(event.key)) {
            return match(parseInt(event.key.toLowerCase(), 36), oldState);
        } else {
            return undefined; // Change nothing
        }
    },

    defaultSettings: { min: 1, max: 9 },
    rawSettings: { min: 1, max: 9 },

    constraints: {
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
    },

    settings: {
        match: () => "",
    },

    _newSettings({ min, max }) {
        return {
            match: (number, alternate) =>
                min <= number && number <= max ? number.toString() : alternate,
        };
    },

    newSettings({ newSettings, grid, storage, attachSelectionsHandler }) {
        this.settings = this._newSettings(newSettings);
        this.rawSettings = newSettings;

        attachSelectionsHandler(this, {});

        const { objects, renderOrder } = storage.getStored<ObjectState>({
            grid,
            layer: this,
        });

        const history = [];

        // Delete numbers that are out of range
        for (let id of renderOrder) {
            const object = objects[id];
            if (
                object.state < newSettings.min ||
                object.state > newSettings.max
            ) {
                history.push({ object: null, id });
            }
        }

        return { history };
    },

    getBlits({ grid, storage }) {
        const stored = storage.getStored<ObjectState>({ grid, layer: this });
        const { cells } = grid.getPoints({
            connections: {
                cells: {
                    svgPoint: true,
                    maxRadius: { shape: "square", size: "large" },
                },
            },
            points: stored.renderOrder,
        });

        const blits: Record<string, object> = {};
        for (let id of stored.renderOrder) {
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
    },
};
