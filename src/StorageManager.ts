import { LayerStorage } from "./LayerStorage";
import {
    HistoryAction,
    Layer,
    LayerProps,
    PartialHistoryAction,
    StorageFilter,
    type ObjectDescription,
    type UnknownObject,
} from "./types";
import { PUT_AT_END } from "./utils/OrderedMap";
import { filterUnique, reversed } from "./utils/data";
import { debugFormat } from "./utils/debugFormat";
import { notify } from "./utils/notifications";

export class StorageManager {
    objects: Record<Layer["id"], LayerStorage> = {};

    history: HistoryAction[] = [];
    index = 0;

    addStorage(layerId: Layer["id"]) {
        this.objects[layerId] = new LayerStorage();
    }

    removeStorage(layerId: Layer["id"]) {
        this.removeStorageFilters([...this.filtersByLayer[layerId]]);
        delete this.objects[layerId];

        for (let i = this.history.length - 1; i >= 0; i--) {
            const action = this.history[i];
            if (action.layerId === layerId) {
                this.history.splice(i, 1);
                if (i < this.index) {
                    this.index--;
                }
            }
        }
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

        if (Object.keys(newFiltersByLayer).length === 0 || this.history.length === 0) return;

        const filtered = [] as typeof this.history;
        // Scrub history going newest-to-oldest since it's better to keep the latest version if valid rather than only allowing what was valid in the past.
        for (const undo of reversed(this.history)) {
            const stored = this.getObjects(undo.layerId);
            const redo = this._applyHistoryAction({ stored, action: undo });

            if (!(undo.layerId in newFiltersByLayer)) {
                filtered.push(redo);
                continue;
            }

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

        for (this.index = 0; this.index < this.history.length; this.index++) {
            const action = this.history[this.index];
            const stored = this.objects[action.layerId];

            const undo = this._applyHistoryAction({ stored, action });
            this.history[this.index] = undo;
        }
    }

    removeStorageFilters(filters: StorageFilter[]) {
        if (filters.length === 0) return;

        for (const filter of filters) {
            const result = this.layersByFilters.get(filter);
            if (!result) {
                throw notify.error({
                    message: debugFormat`Storage: Failed to remove a filter ${
                        filter
                    }. Reducer was never added or already removed!`,
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

    /**
     * Used to remove objects outside the grid after resizing. In the future,
     * might also handle direction objects (arrows or half-cell triangles) being
     * transformed on grid rotation. */
    applyGlobalTransformations(arg: {
        layers: Record<Layer["id"], Pick<Layer, "describeObject">>;
        transforms: Record<
            Layer["id"],
            (desc: ObjectDescription) => null | { obj: null | UnknownObject }
        >;
    }) {
        while (this.canUndo()) {
            this.undoHistory();
        }

        const { layers, transforms } = arg;
        for (const action of this.history) {
            if (action.layerId in layers && action.object !== null) {
                const { layerId } = action;
                const transformed = transforms[layerId](
                    layers[layerId].describeObject({ id: action.objectId, obj: action.object }),
                );
                if (transformed) {
                    action.object = transformed.obj;
                }
            }

            const stored = this.objects[action.layerId];
            const object = stored.getObject(action.storageMode, action.objectId) || null;
            if (object === null && action.object === null) {
                // TODO: This definitely will mess with prevObjectId, but that's probably gonna be obsolete before it's useful anyways...
                continue;
            }

            this.history[this.index] = this._applyHistoryAction({ stored, action });
            this.index++;
        }

        this.history.splice(this.index, this.history.length - this.index);
    }

    /** Returns layerIds of which layers to rerender; mostly needed for storage filters */
    addToHistory(arg: {
        puzzle: Parameters<StorageFilter>[0];
        layerId: Layer["id"];
        actions?: PartialHistoryAction[];
    }): { layerIds: Layer["id"][] } {
        const { puzzle, layerId: defaultLayerId, actions: partialActions } = arg;
        const changedLayerIds = [defaultLayerId];

        if (!partialActions?.length) {
            return { layerIds: changedLayerIds };
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
                // TODO: Layers that are not the current layer and only have ui actions will not be rerendered. Is that even a likely possibility? If so, I need to add layerid to changedLayerIds here, but exclude phantom layers like Selection.
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

            changedLayerIds.push(...actions.map(({ layerId }) => layerId));

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

        return { layerIds: changedLayerIds.filter(filterUnique) };
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
            this.history[this.index] = redo;

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
            this.history[this.index] = undo;
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
