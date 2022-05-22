import { cloneDeep } from "lodash";
import { ILayer } from "../baseLayer";
import { KeyDownEventHandler } from "../Selection";

export type MinimalState = {
    id: string;
    points: string[];
    state: unknown;
};

export const handleEventsUnorderedSets = <
    ObjectState extends MinimalState = MinimalState,
>(
    layer: ILayer<ObjectState>,
    {
        // TODO: In user settings, rename allowOverlap to "Allow partial overlap"
        allowOverlap = false,
        handleKeyDown = null as
            | null
            | KeyDownEventHandler<ObjectState>["handleKeyDown"],
        pointTypes = [] as string[],
        overwriteOthers = false,
        ensureConnected = true,
    },
) => {
    if (!pointTypes?.length) {
        throw Error("Was not provided parameters");
    }

    // TODO: Allow this to be set by the layer once FSM (or a general gatherPoints method) is implemented.
    const deltas = [
        { dx: 0, dy: 2 },
        { dx: 0, dy: -2 },
        { dx: 2, dy: 0 },
        { dx: -2, dy: 0 },
    ];

    layer.gatherPoints = (event) => {
        const { grid, tempStorage } = event;
        const newPoints = grid.selectPointsWithCursor({
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
    layer.handleEvent = (event) => {
        const { grid, storage, type, tempStorage } = event;

        const stored = storage.getStored<ObjectState>({ layer, grid });
        const currentObjectId = stored.currentObjectId;
        if (currentObjectId === undefined && type !== "pointerDown") {
            return {}; // Other events only matter if there is an object selected
        }
        const object = stored.objects[currentObjectId];

        switch (type) {
            case "keyDown": {
                return handleKeyDown?.({ ...event, points: [] }) || {};
            }
            case "delete": {
                const result = handleKeyDown?.({ ...event, points: [] });
                if (result?.history?.length) {
                    // Allow the layer to delete its state before deleting the object itself.
                    return result;
                }
                stored.currentObjectId = undefined;
                return {
                    discontinueInput: true,
                    history: [{ id: currentObjectId, object: null }],
                };
            }
            case "cancelAction": {
                stored.currentObjectId = undefined;
                return {
                    discontinueInput: true,
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
                const overlap = stored.renderOrder.filter(
                    (id) => stored.objects[id].points.indexOf(startPoint) > -1,
                );

                if (overlap.length) {
                    // Select the topmost existing object
                    const id = overlap[overlap.length - 1];
                    tempStorage.removeSingle = true;
                    stored.currentObjectId = id;

                    // Force a rerender without polluting history
                    return {
                        history: [{ id, object: stored.objects[id], batchId }],
                    };
                }

                // Start drawing a new object
                tempStorage.removeSingle = false;
                stored.currentObjectId = startPoint;
                return {
                    history: [
                        {
                            id: startPoint,
                            batchId,
                            object: { points: [startPoint], state: null },
                        },
                    ],
                };
            }
            case "pointerMove": {
                tempStorage.removeSingle = false;

                const newPoints = new Set(object.points);
                let previous = event.points[0];
                for (let next of event.points.slice(1)) {
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
                                points: [...newPoints].sort(),
                            },
                        },
                    ],
                };
            }
            case "pointerUp": {
                if (currentObjectId === undefined) {
                    return { discontinueInput: true };
                }
                const batchId = tempStorage.batchId;

                const objectCopy = cloneDeep(object);
                if (tempStorage.removeSingle) {
                    // Remove the one cell that was selected
                    objectCopy.points = objectCopy.points.filter(
                        (p) => p !== tempStorage.previousPoint,
                    );

                    // Delete the object if empty
                    if (!objectCopy.points.length) {
                        return {
                            discontinueInput: true,
                            history: [
                                { id: currentObjectId, batchId, object: null },
                            ],
                        };
                    }
                }

                const oldId = currentObjectId;
                objectCopy.points.sort();
                const newId = objectCopy.points.join(";");
                if (oldId === newId) {
                    return { discontinueInput: true };
                }

                stored.currentObjectId = newId;
                objectCopy.id = newId;
                return {
                    discontinueInput: true,
                    history: [
                        { id: oldId, batchId, object: null },
                        { id: newId, batchId, object: objectCopy },
                    ],
                };
            }
            case "undoRedo": {
                // TODO: Update this when I change multiPoint controls
                // TODO: I should add something to force a rerender without polluting history
                // It's not quite necessary, because undo/redo makes changes, but still.
                return { discontinueInput: true };
            }
            default: {
                throw Error(`Unknown event.type=${type}`);
            }
        }
    };
};
