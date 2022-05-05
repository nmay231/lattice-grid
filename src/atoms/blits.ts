import { atom } from "jotai";
import { modifiableAtom } from "./modifiableAtom";

type LayerId = string;
export type BlitGroup = object;

const {
    atom: baseAtom,
    setValue,
    getValue,
} = modifiableAtom({} as Record<LayerId, BlitGroup[]>);

// Make it read only by not including a setter function
export const blitsAtom = atom((get) => get(baseAtom));
export const getBlitGroups = getValue;
export const setBlitGroups = setValue;
