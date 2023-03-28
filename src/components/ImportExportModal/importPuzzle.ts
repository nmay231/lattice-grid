import { LayerStorage, LayerStorageJSON } from "../../LayerStorage";
import { PuzzleManager } from "../../PuzzleManager";
import { StorageManager } from "../../StorageManager";
import { Layer, LocalStorageData, NeedsUpdating } from "../../types";
import { errorNotification } from "../../utils/DOMUtils";
import { decompressJSON } from "../../utils/string";

export type PuzzleData = {
    version: `alpha-${0 | 1}`;
    params: LocalStorageData;
    objects: Record<Layer["id"], LayerStorageJSON>;
};
export const currentEncodingVersion: PuzzleData["version"] = "alpha-1";

// TODO: Move into a method of PuzzleManager and test
export const importPuzzle = (puzzle: PuzzleManager, text: string) => {
    try {
        // TODO: zod or similar
        const puzzleData = decompressJSON(text) as NeedsUpdating as PuzzleData;
        if (!puzzleData?.version || typeof puzzleData.version !== "string")
            return errorNotification({
                error: null,
                title: "Failed to parse",
                message: "malformed puzzle string",
            });
        else if (puzzleData.version !== currentEncodingVersion) {
            return errorNotification({
                forever: true,
                error: null,
                title: "Old puzzle string",
                message:
                    "The puzzle string is incompatible with the current version." +
                    " Backwards compatibility is not a concern until this software leaves alpha",
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
            const bad = [
                ...storage.groups.getGroup("answer").values(),
                ...storage.groups.getGroup("ui").values(),
            ];

            for (const objectId of bad) {
                storage.objects.delete(objectId);
                storage.groups.deleteKey(objectId);
            }
        }
        puzzle.renderChange({ type: "draw", layerIds: "all" });
    } catch (error) {
        throw errorNotification({
            error: error as NeedsUpdating,
            title: "Failed to parse",
            message: "Bad puzzle data or unknown error",
        });
    }
};
