import {
    Grid,
    History,
    HistoryAction,
    Layer,
    LayerProps,
    NeedsUpdating,
    PartialHistoryAction,
    StorageMode,
    StorageReducer,
} from "../types";
import { errorNotification } from "../utils/DOMUtils";
import { formatAnything } from "../utils/stringUtils";
import { LayerStorage } from "./LayerStorage";
import { PuzzleManager } from "./PuzzleManager";

type GridAndLayer = { grid: Pick<Grid, "id">; layer: Pick<Layer, "id"> };
// TODO: Recursive Pick type?
export type PuzzleForStorage = {
    grid: Pick<PuzzleManager["grid"], "id">;
    settings: Pick<PuzzleManager["settings"], "editMode">;
};

export class StorageManager {
    objects: Record<Grid["id"], Record<Layer["id"], LayerStorage>> = {};

    histories: Record<Grid["id"], History> = {};

    masterReducer: StorageReducer<HistoryAction | null> = (puzzle, action) => action;
    storageReducers: Array<typeof this.masterReducer> = [];

    addStorage({ grid, layer }: GridAndLayer) {
        this.objects[grid.id] = this.objects[grid.id] ?? {};
        this.objects[grid.id][layer.id] = new LayerStorage();

        // TODO: Use typescript `satisfies`
        // TODO: Actually, I just need to implement that data structure that handles this automatically because editModes might eventually be dynamic
        (["question", "answer", "ui"] as StorageMode[]).forEach((mode) => {
            this.histories[`${grid.id}-${mode}`] = this.histories[`${grid.id}-${mode}`] || {
                actions: [],
                index: 0,
            };
        });
    }

    removeStorage({ grid, layer }: GridAndLayer) {
        // TODO: add an entry to history (so you can undo deleting a layer)? It might be a bit clunky then...
        delete this.objects[grid.id][layer.id];
    }

    getStored<LP extends LayerProps = LayerProps>({ grid, layer }: GridAndLayer) {
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
            errorNotification({
                message: `Storage: Failed to remove a reducer ${formatAnything(
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
        const defaultEditMode = puzzle.settings.editMode;

        const defaultHistory = this.histories[`${gridId}-${defaultEditMode}`];

        const historyChanges = actions.filter(
            ({ batchId, storageMode: editMode }) =>
                // This is a landmine for future bugs isn't it...
                batchId !== "ignore" && (!editMode || editMode === defaultEditMode),
        ).length;

        if (defaultHistory.index < defaultHistory.actions.length && historyChanges) {
            // Only prune redo actions when actions will be added to history
            defaultHistory.actions.splice(defaultHistory.index);
        }

        for (const partialAction of actions) {
            const layerId = (partialAction as NeedsUpdating).layerId || defaultLayerId;
            const storageMode = partialAction.storageMode || defaultEditMode;
            const { objects, groups } = this.objects[gridId][layerId];
            const history = this.histories[`${gridId}-${storageMode}`];

            const action = this.masterReducer({} as NeedsUpdating, {
                id: partialAction.id,
                layerId,
                // This relies on NaN !== (anything including NaN)
                batchId: partialAction.batchId && Number(partialAction.batchId),
                object: partialAction.object,
                nextObjectId: objects.getNextKey(partialAction.id),
            });
            if (!action) {
                continue; // One of the reducers chose to ignore this action
            }

            const undoAction = this._ApplyHistoryAction({ objects, groups, action, storageMode });

            if (partialAction.batchId === "ignore") {
                continue; // Do not include in history
            }

            const lastAction = history.actions[history.actions.length - 1];

            // Merge two actions if they are batched and affecting the same object
            if (
                lastAction?.batchId &&
                lastAction.layerId === layerId &&
                lastAction.id === partialAction.id &&
                lastAction.batchId === partialAction.batchId
            ) {
                // By not pushing actions to history, the actions are merged

                if (action.object === null && lastAction.object === null) {
                    // We can remove the last action since it is a no-op
                    history.actions.splice(history.actions.length - 1, 1);
                    history.index--;
                }
            } else {
                history.actions.push(undoAction);
                history.index++;
            }
        }
    }

    _ApplyHistoryAction(
        arg: Pick<LayerStorage, "objects" | "groups"> & {
            action: HistoryAction;
            storageMode: StorageMode;
        },
    ) {
        const { objects, groups, action, storageMode } = arg;

        const undoAction: HistoryAction = {
            ...action,
            object: objects.get(action.id) || null,
            nextObjectId: objects.getNextKey(action.id),
        };

        if (action.object === null) {
            objects.delete(action.id);
            groups.deleteKey(action.id);
        } else {
            objects.set(action.id, action.object, action.nextObjectId);
            groups.setKey(action.id, storageMode);
        }

        return undoAction;
    }

    undoHistory(puzzle: PuzzleForStorage) {
        const {
            grid: { id: gridId },
            settings: { editMode: storageMode },
        } = puzzle;
        const history = this.histories[`${gridId}-${storageMode}`];
        if (history.index <= 0) {
            return [];
        }

        let action: HistoryAction;
        const returnedActions: HistoryAction[] = [];
        do {
            history.index--;
            action = history.actions[history.index];
            const { objects, groups } = this.objects[gridId][action.layerId];

            const redo = this._ApplyHistoryAction({ objects, groups, action, storageMode });
            // Replace the action with its opposite
            history.actions.splice(history.index, 1, redo);

            returnedActions.push(action);
        } while (action.batchId && action.batchId === history.actions[history.index - 1]?.batchId);

        return returnedActions;
    }

    redoHistory(puzzle: PuzzleForStorage) {
        const {
            grid: { id: gridId },
            settings: { editMode: storageMode },
        } = puzzle;
        const history = this.histories[`${gridId}-${storageMode}`];
        if (history.index >= history.actions.length) {
            return [];
        }

        let action: HistoryAction;
        const returnedActions: HistoryAction[] = [];
        do {
            action = history.actions[history.index];
            const { objects, groups } = this.objects[gridId][action.layerId];

            const undo = this._ApplyHistoryAction({ objects, groups, action, storageMode });
            // Replace the action with its opposite
            history.actions.splice(history.index, 1, undo);
            history.index++;

            returnedActions.push(action);
        } while (action.batchId && action.batchId === history.actions[history.index]?.batchId);

        return returnedActions;
    }

    _batchId = 1;
    getNewBatchId() {
        return this._batchId++;
    }
}
