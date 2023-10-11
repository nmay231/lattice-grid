import { LayerStorage, LayerStorageJSON } from "../../LayerStorage";
import { PuzzleManager } from "../../PuzzleManager";
import { StorageManager } from "../../StorageManager";
import { Layer, LocalStorageData, NeedsUpdating } from "../../types";
import { notify } from "../../utils/notifications";
import { decompressJSON } from "../../utils/string";

export type PuzzleData = {
    version: `alpha-${0 | 1 | 2 | 3}`;
    params: LocalStorageData;
    objects: Record<Layer["id"], LayerStorageJSON>;
    answerCheck: Layer["id"][];
};
export const currentEncodingVersion: PuzzleData["version"] = "alpha-3";

// TODO: Move into a method of PuzzleManager and test
export const importPuzzle = (puzzle: PuzzleManager, text: string) => {
    try {
        // TODO: zod or similar
        const puzzleData = decompressJSON(text) as NeedsUpdating as PuzzleData;
        if (!puzzleData?.version || typeof puzzleData.version !== "string")
            return notify.error({
                title: "Failed to parse",
                message: "malformed puzzle string",
            });
        else if (puzzleData.version !== currentEncodingVersion) {
            return notify.error({
                forever: true,
                title: "Old puzzle string",
                message:
                    `The puzzle string is incompatible with the current version (${puzzleData.version} < ${currentEncodingVersion}).` +
                    " Backwards compatibility is not a concern until this software leaves alpha (sorry)",
            });
        }
        puzzle.storage = new StorageManager();
        puzzle.resetLayers();
        puzzle._loadPuzzle(puzzleData.params);
        puzzle.resizeCanvas();
        const gridObjects = puzzle.storage.objects[puzzle.grid.id];
        for (const layerId of puzzle.layers.keys()) {
            if (!(layerId in puzzleData.objects)) continue;
            const storage = LayerStorage.fromJSON(puzzleData.objects[layerId]);
            gridObjects[layerId] = storage;

            if (puzzleData.answerCheck.includes(layerId)) {
                puzzle.answers.set(layerId, storage.getObjectsByGroup("answer").map);
            }

            storage.clearGroup("answer");
            storage.clearGroup("ui");
        }
        puzzle.renderChange({ type: "draw", layerIds: "all" });
    } catch (error) {
        throw notify.error({
            error: error as NeedsUpdating,
            title: "Failed to parse",
            message: "Bad puzzle data or unknown error",
        });
    }
};
