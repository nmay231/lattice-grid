import { proxy, useSnapshot } from "valtio";
import { PuzzleManager } from "../PuzzleManager";
import { valtioRef } from "../utils/imports/valtio";

export const puzzleProxy = proxy({ puzzle: valtioRef(new PuzzleManager()) });

export const usePuzzle = () => useSnapshot(puzzleProxy).puzzle;

export const useSettings = () => useSnapshot(puzzleProxy.puzzle.settings);
