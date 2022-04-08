import { atom } from "jotai";
import { modifiableAtom } from "./modifiableAtom";

const { atom: baseAtom, setValue } = modifiableAtom({
    minX: 0,
    minY: 0,
    width: 0,
    height: 0,
});

// Make it read only by not including a setter function
export const canvasSizeAtom = atom((get) => get(baseAtom)),
    setCanvasSize = setValue;
