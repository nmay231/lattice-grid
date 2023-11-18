import { LayerStorage } from "./LayerStorage";
import {
    Grid,
    History,
    HistoryAction,
    Layer,
    LayerProps,
    PartialHistoryAction,
    PuzzleForStorage,
    StorageFilter,
} from "./types";
import { PUT_AT_END } from "./utils/OrderedMap";
import { notify } from "./utils/notifications";
import { stringifyAnything } from "./utils/string";

type GridAndLayer = { grid: Pick<Grid, "id">; layer: Pick<Layer, "id"> };

export class StorageManager {
    objects: Record<Grid["id"], Record<Layer["id"], LayerStorage>> = {};

    histories: Record<Grid["id"], History> = {};

    addStorage({ grid, layer }: GridAndLayer) {
        this.objects[grid.id] = this.objects[grid.id] ?? {};
        this.objects[grid.id][layer.id] = new LayerStorage();

        this.histories[grid.id] = this.histories[grid.id] || {
            actions: [],
            index: 0,
        };
    }

    removeStorage({ grid, layer }: GridAndLayer) {
        delete this.objects[grid.id][layer.id];
    }

    getStored<LP extends LayerProps>({ grid, layer }: GridAndLayer) {
        return this.objects[grid.id][layer.id] as LayerStorage<LP>;
    }

    layersByFilters: Map<StorageFilter, { layerIds: Layer["id"][] }> = new Map();
    filtersByLayer: Record<Layer["id"], StorageFilter[]> = {};

    addStorageFilters(
        filters: Array<{ filter: StorageFilter; layerIds?: Layer["id"][] }>,
        defaultLayer: Layer["id"],
    ) {
        if (!filters.length) return;
        for (const { filter, layerIds } of filters) {
            const ids = layerIds ?? [defaultLayer];
            if (this.layersByFilters.has(filter)) {
                continue;
            }
            this.layersByFilters.set(filter, { layerIds: ids });
            for (const id of ids) {
                this.filtersByLayer[id] = this.filtersByLayer[id] ?? [];
                this.filtersByLayer[id].push(filter);
            }
        }
    }

    removeStorageFilters(filters: StorageFilter[]) {
        if (!filters.length) return;
        for (const filter of filters) {
            const result = this.layersByFilters.get(filter);
            if (!result) {
                throw notify.error({
                    message: `Storage: Failed to remove a filter ${stringifyAnything(
                        filter,
                    )}. Reducer was never added or already removed!`,
                });
            }
            this.layersByFilters.delete(filter);

            for (const id of result.layerIds) {
                this.filtersByLayer[id].push(filter);
                const index = this.filtersByLayer[id].indexOf(filter);
                if (index > -1) {
                    this.filtersByLayer[id].splice(index, 1);
                } else {
                    throw notify.error({
                        title: "removeStorageReducer",
                        message: `layer ${id} was not subscribed to a filter it was supposed to be to`,
                    });
                }
            }
        }
    }

    masterHistoryActionFilter: StorageFilter = (puzzle, firstAction) => {
        let action: HistoryAction | null = firstAction;
        if (!(action.layerId in this.filtersByLayer)) {
            return [action];
        }
        const extraActions: HistoryAction[] = [];
        let tmp: HistoryAction[];
        for (const reducer of this.filtersByLayer[action.layerId]) {
            if (!action) continue;
            [action, ...tmp] = reducer(puzzle, action);
            extraActions.push(...tmp);
        }
        return [action, ...extraActions];
    };

    addToHistory(arg: {
        puzzle: Parameters<StorageFilter>[0];
        layerId: Layer["id"];
        actions?: PartialHistoryAction[];
    }) {
        const { puzzle, layerId: defaultLayerId, actions: partialActions } = arg;

        if (!partialActions?.length) {
            return;
        }
        const gridId = puzzle.grid.id;
        const currentEditMode = puzzle.settings.editMode;

        for (const partialAction of partialActions) {
            const layerId = partialAction.layerId ?? defaultLayerId;
            const storageMode = partialAction.storageMode ?? currentEditMode;
            if (storageMode === "ui") {
                if (partialAction.batchId !== "ignore") {
                    notify.error({ message: `Forgot to explicitly ignore UI input ${layerId}}` });
                }
                continue; // Do not include in history
            }

            const stored = this.objects[gridId][layerId];
            const history = this.histories[gridId];

            const actions = this.masterHistoryActionFilter(puzzle, {
                objectId: partialAction.id,
                layerId,
                batchId:
                    typeof partialAction.batchId === "number" ? partialAction.batchId : undefined,
                object: partialAction.object,
                prevObjectId: PUT_AT_END,
                storageMode,
            }).filter(Boolean);

            if (partialAction.batchId === "ignore") {
                // TODO: Do I really want to not track any extra actions provided by filters in history? I can't think of a valid instance where a filter needs to keep actions when the original one is ignored, I guess...
                for (const action of actions) {
                    this._applyHistoryAction({ stored, action });
                }
                continue;
            }

            for (const action of actions) {
                const undoAction = this._applyHistoryAction({ stored, action });

                const lastAction = history.actions[history.index - 1];

                // Merge two actions if they are batched and affecting the same object
                if (
                    lastAction?.batchId &&
                    lastAction.objectId === action.objectId &&
                    lastAction.layerId === action.layerId &&
                    lastAction.storageMode === action.storageMode &&
                    lastAction.batchId === action.batchId
                ) {
                    // By not pushing the undo action to history, the actions are merged

                    if (action.object === null && lastAction.object === null) {
                        // We can even remove the last action since it is a no-op
                        history.actions.splice(history.index - 1, 1);
                        history.index--;
                    }
                } else {
                    // Prune redo actions placed after the current index, if there are any.
                    history.actions.splice(history.index);

                    history.actions.push(undoAction);
                    history.index++;
                }
            }
        }
    }

    _applyHistoryAction(arg: { stored: LayerStorage; action: HistoryAction }) {
        const { action, stored } = arg;

        const object = stored.getObject(action.storageMode, action.objectId) || null;
        const undoAction: HistoryAction = {
            ...action,
            object,
            prevObjectId:
                object === null
                    ? PUT_AT_END
                    : stored.prevObjectId(action.storageMode, action.objectId),
        };
        stored.setObject(action.storageMode, action.objectId, action.object, action.prevObjectId);

        return undoAction;
    }

    undoHistory(puzzle: PuzzleForStorage) {
        const gridId = puzzle.grid.id;
        const history = this.histories[gridId];
        if (history.index <= 0) {
            return [];
        }

        let action: HistoryAction;
        const returnedActions: HistoryAction[] = [];
        do {
            history.index--;
            action = history.actions[history.index];
            const stored = this.objects[gridId][action.layerId];

            const redo = this._applyHistoryAction({ stored, action });
            // Replace the action with its opposite
            history.actions.splice(history.index, 1, redo);

            returnedActions.push(action);
        } while (action.batchId && action.batchId === history.actions[history.index - 1]?.batchId);

        return returnedActions;
    }

    redoHistory(puzzle: PuzzleForStorage) {
        const gridId = puzzle.grid.id;
        const history = this.histories[gridId];
        if (history.index >= history.actions.length) {
            return [];
        }

        let action: HistoryAction;
        const returnedActions: HistoryAction[] = [];
        do {
            action = history.actions[history.index];
            const stored = this.objects[gridId][action.layerId];

            const undo = this._applyHistoryAction({ stored, action });
            // Replace the action with its opposite
            history.actions.splice(history.index, 1, undo);
            history.index++;

            returnedActions.push(action);
        } while (action.batchId && action.batchId === history.actions[history.index]?.batchId);

        return returnedActions;
    }

    canUndo(puzzle: PuzzleForStorage): boolean {
        const history = this.histories[puzzle.grid.id];
        return history && history.index > 0;
    }

    canRedo(puzzle: PuzzleForStorage): boolean {
        const history = this.histories[puzzle.grid.id];
        return history && history.index < history.actions.length;
    }

    _batchId = 1;
    getNewBatchId() {
        return this._batchId++;
    }
}
