export class NumberLayer {
    static id = "Number";
    static unique = false;
    hidden = false;

    handleKeyDown({ event, grid, storage, settings }) {
        const ids = event.points;
        if (!ids.length) {
            return {};
        }
        const stored = storage.getStored({ grid, layer: this });

        const timeDelay = Date.now() - (stored.lastTime || 0);
        stored.lastTime = Date.now();

        const selectionChanged =
            grid.convertIdAndPoints({ pointsToId: stored.lastIds || [] }) !==
            grid.convertIdAndPoints({ pointsToId: ids });
        stored.lastIds = ids.slice();

        const states = ids.map((id) => stored.objects[id]?.state);
        const theSame =
            states[states.length - 1] ===
            states.reduce((prev, next) => (prev === next ? next : {}));

        let state = theSame ? states[0] : "";
        if (timeDelay > settings.actionWindowMs || selectionChanged) {
            state = this._nextState("", state, event);
        } else {
            state = this._nextState(state, state, event);
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
    }

    _nextState(state, oldState, event) {
        const match = this.settings.match;
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
    }

    static defaultSettings = { min: 1, max: 9 };

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

    _newSettings(min, max) {
        return {
            match: (number, alternate) =>
                min <= number && number <= max ? number.toString() : alternate,
        };
    }

    newSettings({ newSettings, grid, storage, attachSelectionsHandler }) {
        this.settings = this._newSettings(newSettings.min, newSettings.max);
        this.rawSettings = newSettings;

        attachSelectionsHandler(this, {});

        const { objects, renderOrder } = storage.getStored({
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
    }

    getBlits({ grid, stored }) {
        const { cells } = grid.getPoints({
            connections: {
                cells: {
                    svgPoint: true,
                    maxRadius: { shape: "square", size: "large" },
                },
            },
            points: stored.renderOrder,
        });

        const blits = {};
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
    }
}
