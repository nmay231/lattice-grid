import { proxy, ref, useSnapshot } from "valtio";
import { PuzzleManager } from "../logic/PuzzleManager";

const puzzleProxy = proxy({ puzzle: ref(new PuzzleManager()) });

export const usePuzzle = () => useSnapshot(puzzleProxy).puzzle;
