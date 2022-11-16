import { TextBlits } from "../../components/SVGCanvas/Text";
import { Layer, LayerClass, Vector } from "../../types";
import { errorNotification } from "../../utils/DOMUtils";
import { BaseLayer, methodNotImplemented } from "./baseLayer";
import { handleEventsSelection, KeyDownEventHandler, SelectedProps } from "./controls/selection";

type RawSettings = {
    // caseSwap allows upper- and lower-case letters to be used as separate characters but to be merged if there's no ambiguity.
    caseSwap: Record<string, string>;
    characters: string;
    displayStyle: "center" | "topBottom"; // | "circle" | "tapa",
};

interface ToggleCharactersProps extends SelectedProps {
    Type: "ToggleCharactersLayer";
    ObjectState: { state: string };
    RawSettings: RawSettings;
}

interface IToggleCharactersLayer
    extends Layer<ToggleCharactersProps>,
        KeyDownEventHandler<ToggleCharactersProps> {
    _newSettings: (arg: RawSettings) => RawSettings;
    settings: RawSettings;
}

export class ToggleCharactersLayer
    extends BaseLayer<ToggleCharactersProps>
    implements IToggleCharactersLayer
{
    static ethereal = false;
    static unique = false;
    static type = "ToggleCharactersLayer" as const;
    static displayName = "Toggle Characters";
    static defaultSettings = {
        caseSwap: Object.fromEntries([..."0123456789"].entries()),
        characters: "0123456789",
        displayStyle: "center" as const,
    };

    settings = this.rawSettings;
    handleEvent = methodNotImplemented({ name: "ToggleCharacters.handleEvent" });
    gatherPoints = methodNotImplemented({ name: "ToggleCharacters.gatherPoints" });

    static create: LayerClass<ToggleCharactersProps>["create"] = (puzzle) => {
        return new ToggleCharactersLayer(ToggleCharactersLayer, puzzle);
    };

    static controls = undefined;
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

    _newSettings: IToggleCharactersLayer["_newSettings"] = ({ characters, displayStyle }) => {
        const caseSwap: Record<string, string> = {};
        // TODO: This should be done on the input side of things so that users are not confused
        // Remove duplicates
        characters = [...characters].filter((char, i) => characters.indexOf(char) === i).join("");

        const lower = characters.toLowerCase();
        for (const c of characters) {
            // If there is no ambiguity between an upper- and lower-case letter (aka, only one is present), map them to the same letter
            if (lower.indexOf(c.toLowerCase()) === lower.lastIndexOf(c.toLowerCase())) {
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
    };

    newSettings: IToggleCharactersLayer["newSettings"] = ({ newSettings, grid, storage }) => {
        this.settings = this._newSettings(newSettings);
        this.rawSettings = newSettings;

        handleEventsSelection(this, {});

        const { objects, renderOrder } = storage.getStored<ToggleCharactersProps>({
            grid,
            layer: this,
        });

        const history = [];

        // Exclude disallowed characters
        for (const id of renderOrder) {
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
    };

    handleKeyDown: IToggleCharactersLayer["handleKeyDown"] = ({
        grid,
        storage,
        points,
        keypress,
    }) => {
        const ids = points;
        if (!ids?.length) {
            return {};
        }
        const stored = storage.getStored<ToggleCharactersProps>({
            grid,
            layer: this,
        });

        if (keypress === "Delete") {
            return {
                history: ids
                    .filter((id) => id in stored.objects)
                    .map((id) => ({ id, object: null })),
            };
        }

        const char = this.settings.caseSwap[keypress];
        if (char === undefined) {
            return {};
        }

        const states = ids.map((id) => stored.objects[id]?.state || "");
        const allIncluded = states.reduce((prev, next) => prev && next.indexOf(char) > -1, true);

        let newStates: string[];
        if (allIncluded) {
            newStates = states.map((state) => [...state].filter((c) => c !== char).join(""));
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
                object: !newStates[index] ? null : { id, point: id, state: newStates[index] },
            })),
        };
    };

    getBlits: IToggleCharactersLayer["getBlits"] = ({ storage, grid }) => {
        const stored = storage.getStored<ToggleCharactersProps>({
            grid,
            layer: this,
        });

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

        const blits: TextBlits["blits"] = {};
        let style: TextBlits["style"];
        if (this.settings.displayStyle === "center") {
            style = { originX: "center", originY: "center" };
            for (const id of stored.renderOrder) {
                blits[id] = {
                    text: stored.objects[id].state,
                    point: cells[id].svgPoint,
                    size: Math.min(
                        cells[id].maxRadius / 1.5,
                        (cells[id].maxRadius * 4) / (stored.objects[id].state.length + 1),
                    ),
                };
            }
        } else if (this.settings.displayStyle === "topBottom") {
            style = { originX: "left", originY: "center" };
            for (const id of stored.renderOrder) {
                const text = stored.objects[id].state;
                const split = Math.max(2, Math.ceil(text.length / 2));
                const radius = cells[id].maxRadius as number;
                const point = cells[id].svgPoint as Vector;

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
        } else {
            errorNotification({
                message: `Unknown displayStyle in ToggleCharacters ${this.settings.displayStyle}`,
                forever: true,
            });
            return [];
        }

        return [
            {
                id: "togglecharacters",
                blitter: "text",
                blits,
                style,
            },
        ];
    };
}
