// 1.5?) Figure out how to show current killercages (I added getOverlayBlits)? Then again, the current system should still work, but the blits won't be guaranteed to be above everything else (which is actually not a desired behavior. maybe I never want to change to that...)
// 2) Convert to typescript and basically rewrite from scratch.

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
        const { grid, type, tempStorage } = event;
        if (type !== "pointerDown" && type !== "pointerMove") return [];

        tempStorage.blacklist = tempStorage.blacklist ?? [];
        let newPoints = grid.selectPointsWithCursor({
            cursor: event.cursor,
            pointTypes,
            deltas,
            previousPoint: tempStorage.previousPoint,
        });
        if (!newPoints.length) return [];

        const previousPoint = tempStorage.previousPoint;
        tempStorage.previousPoint = newPoints[newPoints.length - 1];

        newPoints = newPoints.filter(
            (id) => tempStorage.blacklist.indexOf(id) === -1,
        );
        if (!newPoints.length) return [];
        tempStorage.blacklist.push(...newPoints);

        if (previousPoint) {
            newPoints.unshift(previousPoint);
        }
        return newPoints;
    };

    // TODO: Should I allow multiple current objects? (so I can do `ctrl-a, del` and things like that)
    // TODO: Handle moving objects with long presses (?)
    layer.handleEvent = (event) => {
        const { grid, storage, type, tempStorage } = event;

        const stored = storage.getStored<ObjectState>({ layer, grid });
        const currentObjectId = stored.currentObjectId;
        if (currentObjectId === undefined && type !== "pointerDown") {
            return {};
        }
        const object = stored.objects[currentObjectId];

        switch (type) {
            case "delete": {
                stored.currentObjectId = undefined;

                // TODO: allow the layer to "delete" it's state before deleting the object?
                const history = [{ id: currentObjectId, object: null }];
                return { discontinueInput: true, history };
            }
            case "cancelAction": {
                stored.currentObjectId = undefined;

                // TODO: How do I force rerender without polluting history
                const history = [{ id: currentObjectId, object }];
                return { discontinueInput: true, history };
            }
            case "keyDown": {
                return handleKeyDown?.({ ...event, points: [] }) || {};
            }
            case "pointerDown":
            case "pointerMove": {
                const startPoint = event.points[0];
                const overlap = stored.renderOrder.filter(
                    (id) => stored.objects[id].points.indexOf(startPoint) > -1,
                );

                if (currentObjectId === undefined) {
                    // This is only called on pointerDown, so there is only one new point
                    const point = startPoint;

                    if (overlap.length) {
                        // Select the topmost existing object
                        const id = overlap[overlap.length - 1];
                        stored.currentObjectId = id;
                        return {
                            // Prevent interaction until user clicks/taps again
                            discontinueInput: true,
                            // Move object to the front of the stack
                            history: [{ id, object: stored.objects[id] }],
                        };
                    } else {
                        // Start drawing new object
                        stored.currentObjectId = point;
                        tempStorage.expanding = true;
                        return {
                            history: [
                                // TODO: state=null vs state=layer.getState(null)
                                {
                                    id: point,
                                    object: { points: [point], state: null },
                                },
                            ],
                        };
                    }
                }

                const points = object.points;
                if (
                    type === "pointerDown" &&
                    points.indexOf(startPoint) === -1
                ) {
                    let discontinueInput = false;
                    const history = [];
                    const newId = object.points.join(";");
                    if (currentObjectId !== newId) {
                        history.push(
                            { id: currentObjectId, object: null },
                            { id: newId, object },
                        );
                    } else {
                        // Force rerender of current object
                        // TODO: How do I force rerender without polluting history (currentObjectId changed, but the object state has not). Then again, it does need to affect history because reordering objects in renderOrder is changing the puzzle (if allowOverlap=true).
                        history.push({ id: object.id, object });
                    }

                    if (overlap.length) {
                        // Select a different existing object
                        stored.currentObjectId = overlap[overlap.length - 1];
                        discontinueInput = true;
                    } else {
                        // Create a new one
                        const id = startPoint;
                        stored.currentObjectId = id;
                        tempStorage.expanding = true;
                        history.push({
                            id,
                            object: { points: [id], state: null },
                        });
                    }
                    return { history, discontinueInput };
                } else if (type === "pointerDown") {
                    // We start to resize the current object, but we don't know yet if it's expanding or shrinking
                    return {};
                }
                // Here, we're definitely resizing the object

                if (tempStorage.expanding === undefined) {
                    // Only expand the object if the newPoints are not part of the old object
                    // Note that startPoint is actually the last point from the previous event
                    tempStorage.expanding =
                        points.indexOf(event.points[1]) === -1;
                }

                const updatedPoints = tempStorage.expanding
                    ? points
                          .concat(
                              event.points.filter(
                                  (point) => points.indexOf(point) === -1,
                              ),
                          )
                          .sort()
                    : points.filter(
                          (point) => event.points.indexOf(point) === -1,
                      );

                if (!updatedPoints.length) {
                    stored.currentObjectId = undefined;
                    return {
                        discontinueInput: true,
                        history: [{ id: currentObjectId, object: null }],
                    };
                }
                const newObject = {
                    points: updatedPoints,
                    state: object.state,
                };

                return {
                    history: [{ id: currentObjectId, object: newObject }],
                };
            }
            case "pointerUp": {
                if (currentObjectId === undefined) {
                    return { discontinueInput: true };
                }

                const objectCopy = { ...object };
                if (tempStorage.expanding === undefined) {
                    // Remove the one cell that was selected
                    objectCopy.points = objectCopy.points.filter(
                        (p) => p !== tempStorage.previousPoint,
                    );

                    if (!objectCopy.points.length) {
                        return {
                            discontinueInput: true,
                            history: [{ id: currentObjectId, object: null }],
                        };
                    }
                }

                const oldId = currentObjectId;
                const newId = objectCopy.points.join(";");
                if (oldId === newId) {
                    return { discontinueInput: true };
                }

                stored.currentObjectId = newId;
                return {
                    discontinueInput: true,
                    history: [
                        { id: oldId, object: null },
                        { id: newId, object: objectCopy },
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
