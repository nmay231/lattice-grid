// TODO: Temporary solution until I figure out how ToggleCharacters will work with being only meant for answer, but must not be put into answer check (at least by default), and how I will handle non-number ToggleCharacter's

import { FormSchema, LayerClass } from "../types";
import { ToggleCharactersLayer, ToggleCharactersProps } from "./ToggleCharacters";

interface TopBottomMarksProps extends ToggleCharactersProps {}

export class TopBottomMarksLayer extends ToggleCharactersLayer {
    static ethereal = false;
    // static type = "ToggleCharactersLayer";
    static type = "TopBottomMarksLayer";
    static displayName = "Top/Bottom Pencil Marks";
    static defaultSettings: LayerClass<TopBottomMarksProps>["defaultSettings"] = {
        currentCharacter: "1",
        gridOrObjectFirst: "grid",
        characters: "0123456789",
        caseSwap: Object.fromEntries([..."0123456789"].entries()),
        displayStyle: "topBottom",
    };

    static create = ((puzzle): TopBottomMarksLayer => {
        return new TopBottomMarksLayer(TopBottomMarksLayer, puzzle);
    }) satisfies LayerClass<TopBottomMarksProps>["create"];

    static settingsDescription: LayerClass<TopBottomMarksProps>["settingsDescription"] = {
        currentCharacter: { type: "controls" },
        gridOrObjectFirst: { type: "controls" },
        displayStyle: { type: "constraints", derived: true },
        characters: { type: "constraints", derived: true },
        caseSwap: { type: "constraints", derived: true },
    };
    static controls?: FormSchema<TopBottomMarksProps> = { elements: {}, numpadControls: true };
    static constraints?: FormSchema<TopBottomMarksProps> = undefined;

    static isValidSetting<K extends keyof TopBottomMarksProps["Settings"]>(
        key: K | string,
        value: unknown,
    ): value is TopBottomMarksProps["Settings"][K] {
        if (key === "gridOrObjectFirst") {
            return value === "grid" || value === "object";
        } else if (key === "currentCharacter") {
            // TODO: Change this when key presses are switched from `ctrl-a` to `ctrl+a`
            return value === null || (typeof value === "string" && value.length === 1);
        }
        return false;
    }
}
