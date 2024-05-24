import { fromUint8Array } from "js-base64";
import { PuzzleManager } from "../PuzzleManager";
import type { availableLayers } from "../layers";
import type { Layer, NeedsUpdating } from "../types";
import { PuzzleEncoder, type EncodedLayer } from "./puzzleEncoder";

export const exportPuzzleData = (
    puzzle: Pick<PuzzleManager, "grid" | "settings" | "storage" | "layers">,
    layersInAnswerCheck: Array<Layer["id"]>,
): string => {
    const { grid, settings, storage } = puzzle;

    const layers: EncodedLayer[] = [];
    for (const [, layer] of puzzle.layers.entries()) {
        if (
            (
                [
                    "CellOutlineLayer",
                    "DebugSelectPointsLayer",
                    "OverlayLayer",
                    "ToggleCharactersLayer",
                ] satisfies Array<keyof typeof availableLayers>
            ).includes(layer.id)
        ) {
            continue;
        }
        const answerCheck = layersInAnswerCheck.includes(layer.id);
        layers.push(layer.encode({ grid: grid as NeedsUpdating, settings, storage, answerCheck }));
    }

    const { width, height } = puzzle.grid.getParams();
    const bytes = PuzzleEncoder.encode({
        uncompressedV1: { squareGridParams: { width, height }, layers },
    });
    return fromUint8Array(bytes);
};
