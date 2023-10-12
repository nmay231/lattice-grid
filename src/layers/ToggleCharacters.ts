import { FormSchema, Layer, LayerClass, SVGGroup } from "../types";
import { notify } from "../utils/notifications";
import { BaseLayer } from "./BaseLayer";
import { KeyDownEventHandler, SelectedProps, handleEventsSelection } from "./controls/selection";
import styles from "./layers.module.css";

type RawSettings = {
    // caseSwap allows upper- and lower-case letters to be used as separate characters but to be merged if there's no ambiguity.
    caseSwap: Record<string, string>;
    characters: string;
    displayStyle: "center" | "topBottom"; // | "circle" | "tapa",
};

interface ToggleCharactersProps extends SelectedProps {
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
    static readonly type = "ToggleCharactersLayer";
    static displayName = "Toggle Characters";
    static defaultSettings = {
        caseSwap: Object.fromEntries([..."0123456789"].entries()),
        characters: "0123456789",
        displayStyle: "center" as const,
    };

    settings = this.rawSettings;

    static create = ((puzzle): ToggleCharactersLayer => {
        return new ToggleCharactersLayer(ToggleCharactersLayer, puzzle);
    }) satisfies LayerClass<ToggleCharactersProps>["create"];

    static controls = undefined;
    static constraints: FormSchema<ToggleCharactersProps> = {
        elements: [
            {
                type: "string",
                key: "characters",
                label: "Allowed characters",
            },
            {
                type: "dropdown",
                key: "displayStyle",
                label: "How values are displayed",
                pairs: [
                    { label: "Centered", value: "center" }, // Middle across the center
                    { label: "Top and bottom", value: "topBottom" }, // Two rows, top and bottom
                    // { label: "Clockface", value: "clock" }, // Placed in a circle according spacing equally apart regardless of the chars placed
                    // { label: "Tapa", value: "tapa" }, // Morphs into a circle depending on how many chars are placed
                ],
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

        const { objects } = storage.getStored<ToggleCharactersProps>({ grid, layer: this });

        const history = [];

        // Exclude disallowed characters
        for (const [id, { state }] of objects.entries()) {
            const newState = [...state]
                .filter((char) => this.settings.characters.indexOf(char) > -1)
                .join("");
            if (newState !== state) {
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
        const stored = storage.getStored<ToggleCharactersProps>({ grid, layer: this });

        if (keypress === "Delete") {
            return {
                history: ids
                    .filter((id) => stored.objects.has(id))
                    .map((id) => ({ id, object: null })),
            };
        }

        const char = this.settings.caseSwap[keypress];
        if (char === undefined) {
            return {};
        }

        const states = ids.map((id) => stored.objects.get(id)?.state || "");
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

    getSVG: IToggleCharactersLayer["getSVG"] = ({ grid, storage, settings }) => {
        const stored = storage.getStored<ToggleCharactersProps>({ grid, layer: this });
        const group = stored.groups.getGroup(settings.editMode);
        const ids = stored.objects.keys().filter((id) => group.has(id));

        const pt = grid.getPointTransformer(settings);
        const [cellMap, cells] = pt.fromPoints("cells", ids);
        const toSVG = cells.toSVGPoints();
        const maxRadius = pt.maxRadius({ type: "cells", shape: "square", size: "lg" });

        const elements: SVGGroup["elements"] = new Map();
        if (this.settings.displayStyle === "center") {
            const className = [styles.textHorizontalCenter, styles.textVerticalCenter].join(" ");
            for (const [id, { state }] of stored.objects.entries()) {
                const point = toSVG.get(cellMap.get(id));
                if (!point) continue; // TODO?
                elements.set(id, {
                    className,
                    children: state,
                    x: point[0],
                    y: point[1],
                    fontSize: Math.min(maxRadius / 1.5, (maxRadius * 4) / (state.length + 1)),
                });
            }
        } else if (this.settings.displayStyle === "topBottom") {
            const className = [styles.textLeft, styles.textVerticalCenter].join(" ");
            for (const [id, { state: text }] of stored.objects.entries()) {
                const split = Math.max(2, Math.ceil(text.length / 2));
                const point = toSVG.get(cellMap.get(id));
                if (!point) continue; // TODO?

                elements.set(`${id}-top`, {
                    className,
                    children: text.slice(0, split),
                    x: point[0] - maxRadius / 1.2,
                    y: point[1] - maxRadius / 1.5,
                    fontSize: maxRadius / 2,
                    textLength: 1.8 * maxRadius,
                    lengthAdjust: "spacing",
                });
                elements.set(`${id}-bottom`, {
                    className,
                    children: text.slice(split),
                    x: point[0] - maxRadius / 1.2,
                    y: point[1] + maxRadius / 1.5,
                    fontSize: maxRadius / 2,
                    textLength: 1.8 * maxRadius,
                    lengthAdjust: "spacing",
                });
            }
        } else {
            notify.error({
                message: `Unknown displayStyle in ToggleCharacters ${this.settings.displayStyle}`,
                forever: true,
            });
            return [];
        }

        return [{ id: "toggleCharacters", type: "text", elements }];
    };
}
