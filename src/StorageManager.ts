import { LayerStorage } from "./LayerStorage";
import {
    Grid,
    History,
    HistoryAction,
    Layer,
    LayerProps,
    PartialHistoryAction,
    PuzzleForStorage,
    StorageReducer,
} from "./types";
import { notify } from "./utils/notifications";
import { stringifyAnything } from "./utils/string";

type GridAndLayer = { grid: Pick<Grid, "id">; layer: Pick<Layer, "id"> };

export class StorageManager {
    objects: Record<Grid["id"], Record<Layer["id"], LayerStorage>> = {};

    histories: Record<Grid["id"], History> = {};

    masterReducer: StorageReducer<HistoryAction | null> = (puzzle, action) => action;
    storageReducers: Array<typeof this.masterReducer> = [];

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

    // TODO: Have storageReducers subscribe to the layers they need, allow controlling the order they run, etc.
    addStorageReducer(reducer: typeof this.masterReducer) {
        this.storageReducers.push(reducer);
        this.masterReducer = (puzzle, action) =>
            this.storageReducers.reduce((prev, reduce) => reduce(puzzle, prev), action);
    }

    removeStorageReducer(reducer: typeof this.masterReducer) {
        const index = this.storageReducers.indexOf(reducer);
        if (index > -1) {
            this.storageReducers.splice(index, 1);
            this.masterReducer = (puzzle, action) =>
                this.storageReducers.reduce((prev, reduce) => reduce(puzzle, prev), action);
        } else {
            notify.error({
                message: `Storage: Failed to remove a reducer ${stringifyAnything(
                    reducer,
                )}. Reducer was never added or already removed!`,
            });
        }
    }

    addToHistory(arg: {
        puzzle: PuzzleForStorage;
        layerId: Layer["id"];
        actions?: PartialHistoryAction[];
    }) {
        const { puzzle, layerId: defaultLayerId, actions } = arg;

        if (!actions?.length) {
            return;
        }
        const gridId = puzzle.grid.id;
        const currentEditMode = puzzle.settings.editMode;

        for (const partialAction of actions) {
            const layerId = partialAction.layerId ?? defaultLayerId;
            const storageMode = partialAction.storageMode ?? currentEditMode;
            if (storageMode === "ui") {
                if (partialAction.batchId !== "ignore") {
                    notify.error({
                        message: `Forgot to explicitly ignore UI input ${layerId}}`,
                        forever: true,
                    });
                }
                continue; // Do not include in history
            }

            const stored = this.objects[gridId][layerId];
            const history = this.histories[gridId];

            const action = this.masterReducer(puzzle, {
                objectId: partialAction.id,
                layerId,
                batchId:
                    typeof partialAction.batchId === "number" ? partialAction.batchId : undefined,
                object: partialAction.object,
                nextObjectId: stored._getPrevId(partialAction.id),
                storageMode,
            });

            if (!action) {
                continue; // One of the reducers chose to ignore this action
            }

            const undoAction = this._applyHistoryAction({ stored, action });

            if (partialAction.batchId === "ignore") {
                continue; // Do not include in history
            }

            const lastAction = history.actions[history.index - 1];

            // Merge two actions if they are batched and affecting the same object
            if (
                lastAction?.batchId &&
                lastAction.layerId === layerId &&
                lastAction.objectId === partialAction.id &&
                lastAction.batchId === partialAction.batchId
            ) {
                // By not pushing actions to history, the actions are merged

                if (action.object === null && lastAction.object === null) {
                    // We can remove the last action since it is a no-op
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

    _applyHistoryAction(arg: { stored: LayerStorage; action: HistoryAction }) {
        const { action, stored } = arg;

        const undoAction: HistoryAction = {
            ...action,
            object: stored.getObject(action.objectId) || null,
            nextObjectId: stored._getPrevId(action.objectId),
        };
        stored.setObject(action.storageMode, action.objectId, action.object, action.nextObjectId);

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
