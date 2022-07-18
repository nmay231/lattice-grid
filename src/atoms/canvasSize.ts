import { atom } from "jotai";
import { modifiableAtom } from "./modifiableAtom";

// TODO: Combine these both into an object where the keys are the different grids so that grids can be scaled differently, etc.

const { atom: _canvasSizeAtom, setValue: setCanvasSize } = modifiableAtom({
    minX: 0,
    minY: 0,
    width: 0,
    height: 0,
});
export const canvasSizeAtom = atom((get) => get(_canvasSizeAtom));

const {
    atom: _canvasScaleAtom,
    setValue: setCanvasScale,
    getValue: getCanvasScale,
} = modifiableAtom(100);
export const canvasScaleAtom = atom((get) => get(_canvasScaleAtom));

export { setCanvasSize, setCanvasScale, getCanvasScale };
