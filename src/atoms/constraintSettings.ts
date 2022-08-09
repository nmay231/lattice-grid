import { atom } from "jotai";
import { UnknownObject } from "../globals";

export const constraintSettingsAtom = atom<null | UnknownObject>(null);
