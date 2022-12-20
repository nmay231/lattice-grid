import { proxy, useSnapshot } from "valtio";
import { PuzzleManager } from "../logic/PuzzleManager";
import { valtioRef } from "../utils/imports";

const puzzleProxy = proxy({ puzzle: valtioRef(new PuzzleManager()) });

export const usePuzzle = () => useSnapshot(puzzleProxy).puzzle;
