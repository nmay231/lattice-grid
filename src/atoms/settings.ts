import { modifiableAtom } from "./modifiableAtom";

// TODO: Consider not defining the initial settings here but somewhere in PuzzleManager
export const initialSettings = {
    borderPadding: 60,
    cellSize: 60,
    // TODO: After I switch to SVG
    // zoom: 100,
    // The time window allowed between parts of a single action, e.g. typing a two-digit number
    actionWindowMs: 600,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { atom, setValue, getValue } = modifiableAtom(initialSettings);

// For use in components
export const settingsAtom = atom;

// For use outside of components
export const setSettings = setValue;
export const getSettings = getValue;

// TODO: have a puzzle.setSettings that will call setAtomSettings that will be defined here using setValue()
