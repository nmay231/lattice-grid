import { modifiableAtom } from "./modifiableAtom";

// TODO: Make this an object where the keys are the different grids so that grids can have different sizes, be scaled independently, etc.

export const {
    atom: canvasSizeAtom,
    setValue: setCanvasSize,
    getValue: getCanvasSize,
} = modifiableAtom({
    minX: 0,
    minY: 0,
    width: 0,
    height: 0,
    zoom: 0,
});
