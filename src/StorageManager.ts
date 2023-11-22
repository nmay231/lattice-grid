import { LayerStorage } from "./LayerStorage";
import { HistoryAction, Layer, LayerProps, PartialHistoryAction, StorageFilter } from "./types";
import { PUT_AT_END } from "./utils/OrderedMap";
import { reversed } from "./utils/data";
import { notify } from "./utils/notifications";
import { stringifyAnything } from "./utils/string";

export class StorageManager {
    objects: Record<Layer["id"], LayerStorage> = {};

    history: HistoryAction[] = [];
    index = 0;

    addStorage(layerId: Layer["id"]) {
        this.objects[layerId] = new LayerStorage();
    }

    removeStorage(layerId: Layer["id"]) {
        delete this.objects[layerId];

        this.removeStorageFilters([...this.filtersByLayer[layerId]]);
    }

    getObjects<LP extends LayerProps>(layerId: Layer["id"]) {
        return this.objects[layerId] as LayerStorage<LP>;
    }

    layersByFilters: Map<StorageFilter, { layerIds: Layer["id"][] }> = new Map();
    filtersByLayer: Record<Layer["id"], StorageFilter[]> = {};

    addStorageFilters(
        puzzle: Parameters<StorageFilter>[0],
        filters: Array<{ filter: StorageFilter; layerIds?: Layer["id"][] }>,
        defaultLayer: Layer["id"],
    ) {
        const newFiltersByLayer: typeof this.filtersByLayer = {};

        for (const { filter, layerIds } of filters) {
            const ids = layerIds ?? [defaultLayer];
            if (this.layersByFilters.has(filter)) {
                continue;
            }
            this.layersByFilters.set(filter, { layerIds: ids });
            for (const id of ids) {
                this.filtersByLayer[id] = this.filtersByLayer[id] ?? [];
                this.filtersByLayer[id].push(filter);

                newFiltersByLayer[id] = newFiltersByLayer[id] ?? [];
                newFiltersByLayer[id].push(filter);
            }
        }

        if (!Object.keys(newFiltersByLayer).length || !this.history.length) return;

        const filtered = [] as typeof this.history;
        // Scrub history going right-to-left since it's better to keep the latest version if valid rather than only allowing what was valid in the past.
        for (const undo of reversed(this.history)) {
            const stored = this.getObjects(undo.layerId);
            const redo = this._applyHistoryAction({ stored, action: undo });

            if (!(undo.layerId in newFiltersByLayer)) continue;

            const extra = [] as HistoryAction[];
            let kept = true;
            for (const filter of newFiltersByLayer[undo.layerId]) {
                const { keep, extraActions } = filter(puzzle, redo);

                if (!keep) {
                    kept = false;
                    break;
                }
                if (extraActions) extra.push(...extraActions);
            }
            if (!kept) continue;
            extra.reverse();
            filtered.push(...extra, redo);
        }

        filtered.reverse();
        this.history = filtered;
        this.index = 0;

        while (this.redoHistory().length);
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

    masterHistoryActionFilter: StorageFilter = (puzzle, action) => {
        if (!(action.layerId in this.filtersByLayer)) {
            return { keep: true };
        }
        const extras: HistoryAction[] = [];
        for (const reducer of this.filtersByLayer[action.layerId]) {
            if (!action) continue;
            const { keep, extraActions } = reducer(puzzle, action);
            if (!keep) return { keep: false };

            if (extraActions) extras.push(...extraActions);
        }
        return { keep: true, extraActions: extras };
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
        const currentEditMode = puzzle.settings.editMode;

        for (const partialAction of partialActions) {
            const layerId = partialAction.layerId ?? defaultLayerId;
            const storageMode = partialAction.storageMode ?? currentEditMode;

            const constructedAction: HistoryAction = {
                objectId: partialAction.id,
                layerId,
                batchId:
                    typeof partialAction.batchId === "number" ? partialAction.batchId : undefined,
                object: partialAction.object,
                prevObjectId: PUT_AT_END,
                storageMode,
            };

            if (storageMode === "ui") {
                if (partialAction.batchId !== "ignore") {
                    notify.error({ message: `Forgot to explicitly ignore UI input ${layerId}}` });
                }
                this._applyHistoryAction({
                    stored: this.getObjects(layerId),
                    action: constructedAction,
                });
                continue; // Do not include in history or filters
            }

            const { keep, extraActions } = this.masterHistoryActionFilter(
                puzzle,
                constructedAction,
            );
            const actions = extraActions ?? [];
            if (keep) actions.unshift(constructedAction);

            if (partialAction.batchId === "ignore") {
                // TODO: Do I really want to not track any extra actions provided by filters in history? I can't think of a valid instance where a filter needs to keep actions when the original one is ignored, I guess...
                for (const action of actions) {
                    this._applyHistoryAction({ stored: this.getObjects(action.layerId), action });
                }
                continue;
            }

            for (const action of actions) {
                const undoAction = this._applyHistoryAction({
                    stored: this.getObjects(action.layerId),
                    action,
                });

                const lastAction = this.history[this.index - 1];

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
                        this.history.splice(this.index - 1, 1);
                        this.index--;
                    }
                } else {
                    // Prune redo actions placed after the current index, if there are any.
                    this.history.splice(this.index);

                    this.history.push(undoAction);
                    this.index++;
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

    undoHistory() {
        if (this.index <= 0) {
            return [];
        }

        let action: HistoryAction;
        const returnedActions: HistoryAction[] = [];
        do {
            this.index--;
            action = this.history[this.index];
            const stored = this.objects[action.layerId];

            const redo = this._applyHistoryAction({ stored, action });
            // Replace the action with its opposite
            this.history.splice(this.index, 1, redo);

            returnedActions.push(action);
        } while (action.batchId && action.batchId === this.history[this.index - 1]?.batchId);

        return returnedActions;
    }

    redoHistory() {
        if (this.index >= this.history.length) {
            return [];
        }

        let action: HistoryAction;
        const returnedActions: HistoryAction[] = [];
        do {
            action = this.history[this.index];
            const stored = this.objects[action.layerId];

            const undo = this._applyHistoryAction({ stored, action });
            // Replace the action with its opposite
            this.history.splice(this.index, 1, undo);
            this.index++;

            returnedActions.push(action);
        } while (action.batchId && action.batchId === this.history[this.index]?.batchId);

        return returnedActions;
    }

    canUndo(): boolean {
        return this.index > 0;
    }

    canRedo(): boolean {
        return this.index < this.history.length;
    }

    _batchId = 1;
    getNewBatchId() {
        return this._batchId++;
    }
}
