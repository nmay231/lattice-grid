import { cloneDeep } from "lodash";
import {
    HistoryAction,
    Keypress,
    Layer,
    LayerEventEssentials,
    LayerHandlerResult,
    LayerProps,
    ObjectId,
    Point,
    PointType,
    StorageFilter,
} from "../../types";
import { notify } from "../../utils/notifications";
import { smartSort } from "../../utils/string";

export interface MultiPointLayerProps extends LayerProps {
    ObjectState: { points: Point[]; state: unknown };
    PermStorage: { currentObjectId: ObjectId };
    TempStorage: {
        previousPoint: Point;
        batchId: number;
        removeSingle: boolean;
    };
    HandlesKeyDown: boolean;
}

export interface MultiPointLayer<LP extends MultiPointLayerProps> extends Layer<LP> {
    handleKeyDown: LP["HandlesKeyDown"] extends true
        ? (arg: LayerEventEssentials<LP> & Keypress & { points: Point[] }) => LayerHandlerResult<LP>
        : undefined;
}

export type MultiPointKeyDownHandler<LP extends LayerProps> = (
    arg: LayerEventEssentials<LP> & Keypress & { points: Point[] },
) => LayerHandlerResult<LP>;

export type HandleEventsUnorderedSetsArg = {
    preventOverlap: boolean;
    ensureConnected: boolean;
    pointTypes: PointType[];
    overwriteOthers: boolean;
};
export const handleEventsUnorderedSets = <LP extends MultiPointLayerProps>({
    preventOverlap,
    ensureConnected,
    pointTypes,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- requires storage occlusion tests to be implemented
    overwriteOthers,
}: HandleEventsUnorderedSetsArg) => {
    if (!pointTypes?.length) {
        throw notify.error({
            message: "Multipoint handler was not provided required parameters",
            forever: true,
        });
    }

    // TODO: Allow this to be set by the layer once FSM (or a general gatherPoints method) is implemented.
    const deltas = [
        { dx: 0, dy: 2 },
        { dx: 0, dy: -2 },
        { dx: 2, dy: 0 },
        { dx: -2, dy: 0 },
    ];

    const gatherPoints: MultiPointLayer<LP>["gatherPoints"] = (event) => {
        const { grid, tempStorage } = event;
        const newPoints = grid.selectPointsWithCursor({
            settings: event.settings,
            cursor: event.cursor,
            pointTypes,
            deltas,
            previousPoint: tempStorage.previousPoint,
        });
        if (!newPoints.length) return [];

        if (tempStorage.previousPoint) {
            newPoints.unshift(tempStorage.previousPoint);
        }
        tempStorage.previousPoint = newPoints[newPoints.length - 1];

        return newPoints;
    };

    // TODO: Should I allow multiple current objects? (so I can do `ctrl-a, del` and things like that)
    // TODO: Handle moving objects with long presses (?)
    const handleEvent: MultiPointLayer<LP>["handleEvent"] = function (
        this: MultiPointLayer<LP>,
        event,
    ) {
        const { grid, storage, type, tempStorage, settings } = event;

        const stored = storage.getStored<LP>({ layer: this, grid });
        const currentObjectId = stored.permStorage.currentObjectId || "";
        if (!currentObjectId && type !== "pointerDown" && type !== "undoRedo") {
            return {}; // Other events only matter if there is an object selected
        }
        const object = stored.getObject(currentObjectId);

        switch (type) {
            case "keyDown": {
                return this.handleKeyDown?.({ ...event, points: [] }) || {};
            }
            case "delete": {
                const result = this.handleKeyDown?.({ ...event, points: [] });
                if (result?.history?.length) {
                    // Allow the layer to delete its state before deleting the object itself.
                    return result;
                }
                stored.permStorage.currentObjectId = undefined;
                return { history: [{ id: currentObjectId, object: null }] };
            }
            case "cancelAction": {
                stored.permStorage.currentObjectId = undefined;
                return {
                    history: [
                        // Force a rerender without polluting history
                        { id: currentObjectId, batchId: "ignore", object },
                    ],
                };
            }
            case "pointerDown": {
                tempStorage.batchId = storage.getNewBatchId();
                const batchId = tempStorage.batchId;
                // There's only one point with pointerDown
                const startPoint = event.points[0];
                // TODO: Only selecting objects from current editMode. Is that what I want?
                const overlap = [...stored.keys(settings.editMode)].filter(
                    (id) => stored.getObject(id).points.indexOf(startPoint) > -1,
                );

                if (overlap.length) {
                    // Select the topmost existing object
                    const id = overlap[overlap.length - 1];
                    if (id === currentObjectId) {
                        // Only remove a cell if the object was already selected
                        tempStorage.removeSingle = true;
                    }
                    stored.permStorage.currentObjectId = id;

                    // Force a rerender without polluting history
                    return {
                        history: [{ id, object: stored.getObject(id), batchId }],
                    };
                }

                // Start drawing a new object
                tempStorage.removeSingle = false;
                stored.permStorage.currentObjectId = startPoint;
                const history = [
                    { id: startPoint, batchId, object: { points: [startPoint], state: null } },
                ];
                return { history };
            }
            case "pointerMove": {
                tempStorage.removeSingle = false;

                const newPoints = new Set(object.points);
                let previous = event.points[0];
                for (const next of event.points.slice(1)) {
                    if (newPoints.has(next)) {
                        // Shrink by removing the previous point
                        newPoints.delete(previous);
                    } else {
                        // Expand by including it
                        newPoints.add(previous);
                    }
                    previous = next;
                }

                // Ensure the last point is always part of the object
                if (!newPoints.has(previous)) {
                    newPoints.add(previous);
                }

                return {
                    history: [
                        {
                            id: currentObjectId,
                            batchId: tempStorage.batchId,
                            object: {
                                ...object,
                                points: [...newPoints].sort(smartSort),
                            },
                        },
                    ],
                };
            }
            case "pointerUp": {
                if (currentObjectId === undefined) {
                    return {};
                }
                const batchId = tempStorage.batchId;

                const objectCopy = cloneDeep(object) as LP["ObjectState"];
                if (tempStorage.removeSingle) {
                    // Remove the one cell that was selected
                    objectCopy.points = objectCopy.points.filter(
                        (p) => p !== tempStorage.previousPoint,
                    );

                    // Delete the object if empty
                    if (!objectCopy.points.length) {
                        return {
                            history: [{ id: currentObjectId, batchId, object: null }],
                        };
                    }
                }

                const oldId = currentObjectId;
                objectCopy.points.sort(smartSort);
                const newId = objectCopy.points.join(";");
                if (oldId === newId) {
                    return {};
                }

                stored.permStorage.currentObjectId = newId;
                return {
                    history: [
                        { id: oldId, batchId, object: null },
                        { id: newId, batchId, object: objectCopy },
                    ],
                };
            }
            case "undoRedo": {
                // TODO: layer might have sub-layers and action.layerId !== layer.id
                const last = event.actions[event.actions.length - 1];
                if (last.object !== null) {
                    stored.permStorage.currentObjectId = last.objectId;
                    return {
                        // TODO: Force render
                        history: [{ ...last, id: last.objectId, batchId: "ignore" }],
                    };
                }
                stored.permStorage.currentObjectId = undefined;
                return {};
            }
            default: {
                throw notify.error({
                    message: `Multipoint unknown event.type=${type}`,
                    forever: true,
                });
            }
        }
    };

    const isThisLayersAction = (
        layer: MultiPointLayer<LP>,
        action: HistoryAction,
    ): action is HistoryAction<MultiPointLayerProps> => {
        return action.layerId === layer.id;
    };

    const filter = function (this: MultiPointLayer<LP>, { grid, settings, storage }, action) {
        if (!isThisLayersAction(this, action) || action.object === null) return action;

        if (ensureConnected) {
            const pt = grid.getPointTransformer(settings);
            const [cellMap] = pt.fromPoints("cells", action.object.points);
            if (!pt.isFullyConnected(cellMap)) {
                return null;
            }
        }

        if (preventOverlap) {
            const stored = storage.getStored<MultiPointLayerProps>({ grid, layer: this });
            const points = new Set(action.object.points);

            // TODO: Assumes objects are only in one storageMode
            for (const [id, { points: existingPoints }] of stored.entries(action.storageMode)) {
                if (id === action.objectId) continue;
                for (const point of existingPoints) {
                    if (points.has(point)) {
                        return null;
                    }
                }
            }
        }

        return action;
    } satisfies StorageFilter;

    return { gatherPoints, handleEvent, filter };
};
