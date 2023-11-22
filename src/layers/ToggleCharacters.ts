import {
    FormSchema,
    HistoryAction,
    Layer,
    LayerClass,
    PartialHistoryAction,
    SVGGroup,
    StorageFilter,
} from "../types";
import { notify } from "../utils/notifications";
import { BaseLayer } from "./BaseLayer";
import { KeyDownEventHandler, SelectedProps, handleEventsSelection } from "./controls/selection";
import styles from "./layers.module.css";
import { CurrentCharacterProps, LayerCurrentCharacter } from "./traits/currentCharacterSetting";
import { GOOFyProps, LayerGOOFy } from "./traits/gridOrObjectFirst";

type Settings = {
    currentCharacter: CurrentCharacterProps["Settings"]["currentCharacter"];
    // TODO: This is currently kinda broken because there is no keyboard for mobile controls yet.
    gridOrObjectFirst: GOOFyProps["Settings"]["gridOrObjectFirst"];
    characters: string;
    displayStyle: "center" | "topBottom"; // | "circle" | "tapa",
    // caseSwap allows upper- and lower-case letters to be used as separate characters but to be merged if there's no ambiguity.
    /** Derived from .characters */
    caseSwap: Record<string, string>;
};

export interface ToggleCharactersProps extends SelectedProps, CurrentCharacterProps, GOOFyProps {
    ObjectState: { state: string };
    Settings: Settings;
    TempStorage: SelectedProps["TempStorage"];
}

interface IToggleCharactersLayer
    extends Layer<ToggleCharactersProps>,
        KeyDownEventHandler<ToggleCharactersProps>,
        LayerCurrentCharacter<ToggleCharactersProps>,
        LayerGOOFy<ToggleCharactersProps> {
    _generateCaseSwap: (chars: string) => Settings["caseSwap"];
}

const obj = <LP extends ToggleCharactersProps>({
    id,
    object,
}: {
    id: string;
    object: LP["ObjectState"] | null;
}): PartialHistoryAction<LP> => ({
    id,
    object,
    storageMode: "answer",
});

export class ToggleCharactersLayer
    extends BaseLayer<ToggleCharactersProps>
    implements IToggleCharactersLayer
{
    static ethereal = true; // TODO: Temporary until I replace PencilMarks
    static type = "ToggleCharactersLayer";
    static displayName = "Toggle Characters";
    static defaultSettings: LayerClass<ToggleCharactersProps>["defaultSettings"] = {
        currentCharacter: "1",
        gridOrObjectFirst: "grid",
        characters: "0123456789",
        caseSwap: Object.fromEntries([..."0123456789"].entries()),
        displayStyle: "center",
    };

    static create = ((puzzle): ToggleCharactersLayer => {
        return new ToggleCharactersLayer(ToggleCharactersLayer, puzzle);
    }) satisfies LayerClass<ToggleCharactersProps>["create"];

    eventPlaceSinglePointObjects: IToggleCharactersLayer["eventPlaceSinglePointObjects"] =
        () => ({});

    static settingsDescription: LayerClass<ToggleCharactersProps>["settingsDescription"] = {
        currentCharacter: { type: "controls" },
        gridOrObjectFirst: { type: "controls" },
        displayStyle: { type: "constraints" },
        characters: { type: "constraints" },
        caseSwap: { type: "constraints", derived: true },
    };
    // TODO: The grid or object first toggle doesn't show unless controls is not undefined. But I'm gonna leave it as undefined right now since toggle characters is kinda broken on mobile with object first anyways (numpad is not shown, and non-number characters can't be typed at all).
    // static controls: FormSchema<ToggleCharactersProps> = { elements: {} };
    static controls?: FormSchema<ToggleCharactersProps> = undefined;
    static constraints?: FormSchema<ToggleCharactersProps> = {
        elements: {
            characters: {
                type: "string",
                label: "Allowed characters",
            },
            displayStyle: {
                type: "dropdown",
                label: "How values are displayed",
                pairs: [
                    { label: "Centered", value: "center" }, // Middle across the center
                    { label: "Top and bottom", value: "topBottom" }, // Two rows, top and bottom
                    // { label: "Clockface", value: "clock" }, // Placed in a circle according spacing equally apart regardless of the chars placed
                    // { label: "Tapa", value: "tapa" }, // Morphs into a circle depending on how many chars are placed
                ],
            },
        },
    };

    static isValidSetting<K extends keyof ToggleCharactersProps["Settings"]>(
        key: K | string,
        value: unknown,
    ): value is ToggleCharactersProps["Settings"][K] {
        if (key === "displayStyle") {
            return value === "center" || value === "topBottom";
        } else if (key === "characters") {
            return typeof value === "string";
        } else if (key === "gridOrObjectFirst") {
            return value === "grid" || value === "object";
        } else if (key === "currentCharacter") {
            // TODO: Change this when key presses are switched from `ctrl-a` to `ctrl+a`
            return value === null || (typeof value === "string" && value.length === 1);
        }
        return false;
    }

    updateSettings: IToggleCharactersLayer["updateSettings"] = ({ oldSettings }) => {
        const removeFilters = [] as StorageFilter[];
        if (oldSettings?.characters !== this.settings.characters) {
            removeFilters.push(this.filterInvalidCharacters);
            // Remove duplicates
            // TODO: Do this as part of validation somewhere else
            this.settings.characters = [...this.settings.characters]
                .filter((char, i) => this.settings.characters.indexOf(char) === i)
                .join("");
            this.settings.caseSwap = this._generateCaseSwap(this.settings.characters);
        }
        if (!oldSettings || oldSettings.gridOrObjectFirst !== this.settings.gridOrObjectFirst) {
            const { gatherPoints, handleEvent, getOverlaySVG, eventPlaceSinglePointObjects } =
                handleEventsSelection<ToggleCharactersProps>({});
            this.gatherPoints = gatherPoints;
            this.handleEvent = handleEvent;
            this.getOverlaySVG =
                this.settings.gridOrObjectFirst === "grid" ? getOverlaySVG : undefined;
            this.eventPlaceSinglePointObjects = eventPlaceSinglePointObjects;
        }

        // TODO: This is only needed when characters change and that doesn't happen right now because ToggleCharacters is temporarily hidden in favor of CenterMarks and TopBottomMarks, and they don't allow changing settings.characters
        return {};
        // return { filters: [{ filter: this.filterInvalidCharacters }], removeFilters };
    };

    // TODO: This filter only needs to run after updateSettings is called. Do I need another field to provide this behavior?
    filterInvalidCharacters: StorageFilter = ({ storage }, _action) => {
        const action = _action as HistoryAction<ToggleCharactersProps>;
        if (action.object === null) return { keep: true };

        let valid = true;
        for (const char of action.object.state) {
            if (!(char in this.settings.caseSwap)) {
                valid = false;
                break;
            }
        }
        if (valid) return { keep: true };

        if (action.batchId) {
            const state = [...action.object.state]
                .filter((char) => char in this.settings.caseSwap)
                .join("");

            const stored = storage.getObjects<ToggleCharactersProps>(this.id);
            // If forcing the object to be valid reverts it to the existing object, don't bother adding the action to history
            if (state === stored.getObject("answer", action.objectId)?.state) {
                return { keep: false };
            }

            return { keep: true, extraActions: [{ ...action, object: { state } }] };
        }

        return { keep: false };
    };

    _generateCaseSwap: IToggleCharactersLayer["_generateCaseSwap"] = (chars) => {
        const lower = chars.toLowerCase();
        const caseSwap: Settings["caseSwap"] = {};
        for (const c of chars) {
            // If there is no ambiguity between an upper- and lower-case letter (aka, only one is present), map them to the same letter
            if (lower.indexOf(c.toLowerCase()) === lower.lastIndexOf(c.toLowerCase())) {
                caseSwap[c.toLowerCase()] = c;
                caseSwap[c.toUpperCase()] = c;
            } else {
                caseSwap[c] = c;
            }
        }
        return caseSwap;
    };

    handleKeyDown: IToggleCharactersLayer["handleKeyDown"] = ({ storage, points }) => {
        const ids = points;
        if (!ids?.length) {
            return {};
        }
        const stored = storage.getObjects<ToggleCharactersProps>(this.id);

        if (this.settings.currentCharacter === null) {
            const allIds = new Set(stored.keys("answer"));
            return {
                history: ids.filter((id) => allIds.has(id)).map((id) => obj({ id, object: null })),
            };
        }

        const char = this.settings.caseSwap[this.settings.currentCharacter];
        if (char === undefined) {
            return {};
        }

        const states = ids.map((id) => {
            const object = stored.getObject("answer", id);
            return object?.state || "";
        });
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
            history: ids.map((id, index) =>
                obj({
                    id,
                    object: !newStates[index] ? null : { state: newStates[index] },
                }),
            ),
        };
    };

    getSVG: IToggleCharactersLayer["getSVG"] = ({ grid, storage, settings }) => {
        const stored = storage.getObjects<ToggleCharactersProps>(this.id);

        const pt = grid.getPointTransformer(settings);
        const [cellMap, cells] = pt.fromPoints("cells", stored.keys(settings.editMode));
        const toSVG = cells.toSVGPoints();
        const maxRadius = pt.maxRadius({ type: "cells", shape: "square", size: "lg" });

        const elements: SVGGroup["elements"] = new Map();
        if (this.settings.displayStyle === "center") {
            const className = `${styles.textHorizontalCenter} ${styles.textVerticalCenter}`;
            for (const [id, { state }] of stored.entries(settings.editMode)) {
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
            const className = `${styles.textLeft} ${styles.textVerticalCenter}`;
            for (const [id, { state: text }] of stored.entries(settings.editMode)) {
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
            });
            return [];
        }

        return [{ id: "toggleCharacters", type: "text", elements }];
    };

    getOverlaySVG: IToggleCharactersLayer["getOverlaySVG"];
}
