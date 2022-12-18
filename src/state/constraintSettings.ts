import { atom } from "jotai";
import { UnknownObject } from "../types";

export const constraintSettingsAtom = atom<null | UnknownObject>(null);
