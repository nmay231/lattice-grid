export class ToggleCharactersLayer {
    static id = "Toggle Characters";
    static unique = false;
    hidden = false;

    static defaultSettings = {
        // caseSwap allows upper- and lower-case letters to be used as separate characters but to be merged if there's no ambiguity.
        caseSwap: [..."0123456789"],
        characters: "0123456789",
        // "center", "topBottom", "circle", "tapa"
        displayStyle: "center",
    };

    static constraints = {
        schema: {
            type: "object",
            properties: {
                characters: {
                    type: "string",
                    description: "Allowed characters",
                },
                displayStyle: {
                    type: "string",
                    description: "How values are displayed",
                    enum: [
                        "center", // Middle across the center
                        "topBottom", // Two rows, top and bottom
                        // "clock", // Placed in a circle according spacing equally apart regardless of the chars placed
                        // "tapa", // Morphs into a circle depending on how many chars are placed
                    ],
                },
            },
        },
        uischemaElements: [
            {
                type: "Control",
                label: "Allowed Characters",
                scope: "#/properties/characters",
            },
            {
                type: "Control",
                label: "Positioning",
                scope: "#/properties/displayStyle",
            },
        ],
    };

    _newSettings({ characters, displayStyle }) {
        const caseSwap = {};
        // TODO: This should be done on the input side of things so that users are not confused
        // Remove duplicates
        characters = [...characters]
            .filter((char, i) => characters.indexOf(char) === i)
            .join("");

        const lower = characters.toLowerCase();
        for (let c of characters) {
            // If there is no ambiguity between an upper- and lower-case letter (aka, only one is present), map them to the same letter
            if (
                lower.indexOf(c.toLowerCase()) ===
                lower.lastIndexOf(c.toLowerCase())
            ) {
                caseSwap[c.toLowerCase()] = c;
                caseSwap[c.toUpperCase()] = c;
            } else {
                caseSwap[c] = c;
            }
        }
        return {
            caseSwap,
            characters,
            displayStyle,
        };
    }

    newSettings({ newSettings, grid, storage, attachSelectionsHandler }) {
        this.settings = this._newSettings(newSettings);
        this.rawSettings = newSettings;

        attachSelectionsHandler(this, {});

        const { objects, renderOrder } = storage.getStored({
            grid,
            layer: this,
        });

        const history = [];

        // Exclude disallowed characters
        for (let id of renderOrder) {
            const object = objects[id];
            const newState = [...object.state]
                .filter((char) => this.settings.characters.indexOf(char) > -1)
                .join("");
            if (newState !== object.state) {
                history.push({
                    object: { state: newState, point: id },
                    id,
                });
            }
        }

        return { history };
    }

    handleKeyDown({ event, grid, storage }) {
        const ids = event.points;
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
            true,
        );

        let newStates;
        if (allIncluded) {
            newStates = states.map((state) =>
                [...state].filter((c) => c !== char).join(""),
            );
        } else {
            newStates = states.map((state) =>
                state.indexOf(char) > -1
                    ? state
                    : [...this.settings.characters]
                          .filter((c) => c === char || state.indexOf(c) > -1)
                          .join(""),
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
                            (stored.objects[id].state.length + 1),
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
