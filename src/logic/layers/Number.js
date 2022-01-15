export class NumberLayer {
    // -- Identification --
    static id = "Number";
    static unique = false;
    hidden = false;

    // -- Controls --
    controls = "onePoint";
    pointTypes = ["cells"];
    controllingLayer = "Selections";

    handleKeyDown({ event, grid, storage, ids }) {
        if (!ids.length) {
            return {};
        }
        const stored = storage.getStored({ grid, layer: this });
        const states = ids.map((id) => stored.objects[id]?.state);
        const theSame =
            states[states.length - 1] ===
            states.reduce((prev, next) => (prev === next ? next : {}));

        const state = this._nextState(theSame ? states[0] : "", event);
        // TODO: This almost fixes the Ctrl-i bug, but I don't know exactly what's going on...
        if (state === undefined) {
            return {};
        }
        return {
            history: ids.map((id) => ({
                action: state === null ? "delete" : "add",
                object: { id, state, point: id },
                id,
            })),
        };
    }

    _nextState(state, event) {
        const match = this.settings.match;
        if (event.code === "Backspace") {
            return match(state.toString().slice(0, -1));
        } else if (event.code === "Delete") {
            return null;
        } else if (event.code === "Minus") {
            // TODO: keep the Minus sign as part of an inProgress object and remove it when we deselect things.
            return match(-1 * state) || "-";
        } else if (event.code === "Plus" || event.code === "Equal") {
            return match(state && Math.abs(state));
        } else if ("1234567890".indexOf(event.key) === -1) {
            return match(parseInt(event.key, 36)) || state;
        } else {
            // TODO: Instead of appending the current key to the end of the number if it simply matches, I could try making it time based.
            return (
                match(parseInt(state + event.key)) ||
                match(parseInt(event.key)) ||
                state
            );
        }
    }

    static defaultSettings = { min: 1, max: 9 };
    static settingsSchema = {
        type: "object",
        properties: {
            min: {
                type: "integer",
                description: "Minimum value allowed",
            },
            max: {
                type: "integer",
                description: "Maximum value allowed",
            },
        },
    };
    static settingsUISchemaElements = [
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
    ];

    rawSettings = {
        min: -16,
        max: 16,
    };
    settings = {
        match: (number) => -16 <= number && number <= 16 && number,
    };

    _newSettings(min, max) {
        return {
            match: (number) => min <= number && number <= max && number,
        };
    }

    newSettings({ newSettings, grid, storage }) {
        this.settings = this._newSettings(newSettings.min, newSettings.max);
        this.rawSettings = newSettings;

        const { objects, renderOrder } = storage.getStored({
            grid,
            layer: this,
        });

        const history = [];

        // Clamp values between the new max and min
        for (let id of renderOrder) {
            const object = objects[id];
            const newValue = Math.max(
                newSettings.min,
                Math.min(newSettings.max, object.state)
            );
            if (newValue !== object.state) {
                history.push({
                    action: "add",
                    object: { id, state: newValue, point: id },
                });
            }
        }

        return { history };
    }

    defaultRenderOrder = 6;

    getBlits({ grid, stored }) {
        const ids = stored.renderOrder.filter((id) => stored.objects[id].state);

        const { cells } = grid.getPoints({
            connections: {
                cells: {
                    svgPoint: true,
                    maxRadius: { shape: "square", size: "large" },
                },
            },
            points: ids,
        });

        const blits = {};
        for (let id of stored.renderOrder) {
            blits[id] = {
                text: stored.objects[id].state,
                point: cells[id].svgPoint,
                size: cells[id].maxRadius * 1.8,
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
    }
}
