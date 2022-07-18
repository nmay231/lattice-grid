import { atom } from "jotai";
import { modifiableAtom } from "./modifiableAtom";

// TODO: Make this an object where the keys are the different grids so that grids can have different sizes, be scaled independently, etc.

const {
    atom: _canvasSizeAtom,
    setValue,
    getValue,
} = modifiableAtom({
    minX: 0,
    minY: 0,
    width: 0,
    height: 0,
    zoom: 0,
});
export const canvasSizeAtom = atom((get) => get(_canvasSizeAtom));
export const setCanvasSize = setValue;
export const getCanvasSize = getValue;
