import { atom } from "jotai";
import { BlitGroup, LayerId } from "../globals";
import { modifiableAtom } from "./modifiableAtom";

const {
    atom: baseAtom,
    setValue,
    getValue,
} = modifiableAtom({} as Record<LayerId, BlitGroup[]>);

// Make it read only by not including a setter function
export const blitsAtom = atom((get) => get(baseAtom));
export const getBlitGroups = getValue;
export const setBlitGroups = setValue;

// TODO: Change this to a Symbol in the future?
export const OVERLAY_LAYER_ID = "OVERLAY_BLITS_KEY";
