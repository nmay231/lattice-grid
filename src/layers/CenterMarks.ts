// TODO: Temporary solution until I figure out how ToggleCharacters will work with being only meant for answer, but must not be put into answer check (at least by default), and how I will handle non-number ToggleCharacter's

import { FormSchema, LayerClass } from "../types";
import { ToggleCharactersLayer, ToggleCharactersProps } from "./ToggleCharacters";

interface CenterMarksProps extends ToggleCharactersProps {}

export class CenterMarksLayer extends ToggleCharactersLayer {
    static ethereal = false;
    // static type = "ToggleCharactersLayer";
    static type = "CenterMarksLayer";
    static displayName = "Center Pencil Marks";
    static defaultSettings: LayerClass<CenterMarksProps>["defaultSettings"] = {
        currentCharacter: "1",
        gridOrObjectFirst: "grid",
        characters: "0123456789",
        caseSwap: Object.fromEntries([..."0123456789"].entries()),
        displayStyle: "center",
    };

    static create = ((puzzle): CenterMarksLayer => {
        return new CenterMarksLayer(CenterMarksLayer, puzzle);
    }) satisfies LayerClass<CenterMarksProps>["create"];

    static settingsDescription: LayerClass<CenterMarksProps>["settingsDescription"] = {
        currentCharacter: { type: "controls" },
        gridOrObjectFirst: { type: "controls" },
        displayStyle: { type: "constraints", derived: true },
        characters: { type: "constraints", derived: true },
        caseSwap: { type: "constraints", derived: true },
    };
    static controls?: FormSchema<CenterMarksProps> = { elements: {}, numpadControls: true };
    static constraints?: FormSchema<CenterMarksProps> = undefined;

    static isValidSetting<K extends keyof CenterMarksProps["Settings"]>(
        key: K | string,
        value: unknown,
    ): value is CenterMarksProps["Settings"][K] {
        if (key === "gridOrObjectFirst") {
            return value === "grid" || value === "object";
        } else if (key === "currentCharacter") {
            // TODO: Change this when key presses are switched from `ctrl-a` to `ctrl+a`
            return value === null || (typeof value === "string" && value.length === 1);
        }
        return false;
    }
}
