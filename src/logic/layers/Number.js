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

    // TODO: This will be a dynamic object that can be changed by the user
    settings = {
        match: (number) => -16 <= number && number < 16 && number,
    };
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
        } else {
            return (
                match(parseInt(state + event.key.toLowerCase())) ||
                match(parseInt(event.key.toLowerCase(), 36)) ||
                state
            );
        }
    }

    defaultRenderOrder = 6;

    getBlits({ grid, stored }) {
        const ids = stored.renderOrder.filter((id) => stored.objects[id].state);

        const { cells } = grid.getPoints({
            connections: { cells: { svgPoint: true } },
            points: ids,
        });

        const blits = {};
        for (let id of stored.renderOrder) {
            blits[id] = {
                text: stored.objects[id].state,
                point: cells[id].svgPoint,
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
                    size: 60,
                },
            },
        ];
    }
}
