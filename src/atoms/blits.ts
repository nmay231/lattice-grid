import { atom } from "jotai";
import { modifiableAtom } from "./modifiableAtom";

export type BlitGroup = object;

const { atom: baseAtom, setValue } = modifiableAtom({
    renderOrder: [] as string[],
    groups: {} as Record<string, BlitGroup>,
});

// Make it read only by not including a setter function
export const blitsAtom = atom((get) => get(baseAtom));
export const setBlitGroups = setValue;
