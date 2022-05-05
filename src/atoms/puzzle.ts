import { useAtomValue } from "jotai";
import { PuzzleManager } from "../logic/PuzzleManager";
import { modifiableAtom } from "./modifiableAtom";

const { atom: baseAtom, getValue } = modifiableAtom(new PuzzleManager());

export const usePuzzle = () => useAtomValue(baseAtom);

export const getPuzzle = getValue;
