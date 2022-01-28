export class ToggleCharactersLayer {
    // -- Identification --
    static id = "Toggle Characters";
    static unique = false;
    hidden = false;

    // -- Controls --
    controls = "onePoint";
    pointTypes = ["cells"];
    controllingLayer = "Selections";

    // TODO: This will be a dynamic object that can be changed by the user
    settings = {
        // caseSwap allows upper- and lower-case letters to be used as separate characters but to be swapped if there's no ambiguity. For now, it's just annoying :)
        caseSwap: [..."0123456789"],
        characters: "0123456789",
        // "center", "topBottom", "circle", "tapa"
        displayStyle: "center",
    };

    handleKeyDown({ event, grid, storage, ids }) {
        if (!ids?.length) {
            return {};
        }
        const stored = storage.getStored({ grid, layer: this });

        if (event.code === "Delete") {
            return {
                history: ids
                    .filter((id) => id in stored.objects)
                    .map((id) => ({ id, object: null })),
            };
        }

        const char = this.settings.caseSwap[event.key];
        if (char === undefined) {
            return {};
        }

        const states = ids.map((id) => stored.objects[id]?.state || "");
        const allIncluded = states.reduce(
            (prev, next) => prev && next.indexOf(char) > -1,
            true
        );

        let newStates;
        if (allIncluded) {
            newStates = states.map((state) =>
                [...state].filter((c) => c !== char).join("")
            );
        } else {
            newStates = states.map((state) =>
                state.indexOf(char) > -1
                    ? state
                    : [...this.settings.characters]
                          .filter((c) => c === char || state.indexOf(c) > -1)
                          .join("")
            );
        }

        return {
            history: ids.map((id, index) => ({
                id,
                object: !newStates[index]
                    ? null
                    : { id, point: id, state: newStates[index] },
            })),
        };
    }

    // -- Render --
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
        let style = {};
        if (this.settings.displayStyle === "center") {
            style = { originX: "center", originY: "center" };
            for (let id of stored.renderOrder) {
                blits[id] = {
                    text: stored.objects[id].state,
                    point: cells[id].svgPoint,
                    size: Math.min(
                        cells[id].maxRadius / 1.5,
                        (cells[id].maxRadius * 4) /
                            (stored.objects[id].state.length + 1)
                    ),
                };
            }
        } else if (this.settings.displayStyle === "topBottom") {
            style = { originX: "left", originY: "center" };
            for (let id of stored.renderOrder) {
                const text = stored.objects[id].state;
                const split = Math.max(2, Math.ceil(text.length / 2));
                const radius = cells[id].maxRadius;
                const point = cells[id].svgPoint;

                blits[`${id}-top`] = {
                    text: text.slice(0, split),
                    point: [point[0] - radius / 1.2, point[1] - radius / 1.5],
                    size: radius / 2,
                    textLength: 1.8 * radius,
                    lengthAdjust: "spacing",
                };
                blits[`${id}-bottom`] = {
                    text: text.slice(split),
                    point: [point[0] - radius / 1.2, point[1] + radius / 1.5],
                    size: radius / 2,
                    textLength: 1.8 * radius,
                    lengthAdjust: "spacing",
                };
            }
        }

        return [
            {
                id: "togglecharacters",
                blitter: "text",
                blits,
                style,
            },
        ];
    }
}
