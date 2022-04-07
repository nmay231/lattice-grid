export const handleEventsUnorderedSets = (
    layer,
    {
        // TODO: In user settings, rename allowOverlap to "Allow partial overlap"
        allowOverlap = false,
        handleKeyDown,
        pointTypes,
        overwriteOthers = false,
        ensureConnected = true,
    },
) => {
    if (!pointTypes?.length) {
        throw Error("Was not provided parameters");
    }

    // TODO: Would this ever need to customizable by the layer? In any case, it shouldn't actually be static (it's dependent on which grid is in use).
    const deltas = [
        { dx: 0, dy: 2 },
        { dx: 0, dy: -2 },
        { dx: 2, dy: 0 },
        { dx: -2, dy: 0 },
    ];

    layer.gatherPoints = ({ grid, storage, event }) => {
        if (event.type !== "pointerDown" && event.type !== "pointerMove")
            return;
        const stored = storage.getStored({ grid, layer });

        stored.temporary.blacklist = stored.temporary.blacklist ?? [];
        let newPoints = grid.selectPointsWithCursor({
            cursor: event.cursor,
            pointTypes,
            deltas,
            previousPoint: stored.temporary.previousPoint,
        });
        if (!newPoints.length) return;

        const previousPoint = stored.temporary.previousPoint;
        stored.temporary.previousPoint = newPoints[newPoints.length - 1];

        newPoints = newPoints.filter(
            (id) => stored.temporary.blacklist.indexOf(id) === -1,
        );
        if (!newPoints.length) return;
        stored.temporary.blacklist.push(...newPoints);

        if (previousPoint) {
            newPoints.unshift(previousPoint);
        }
        return newPoints;
    };

    // TODO: Should I allow multiple current objects? (so I can do `ctrl-a del` and things like that)
    // TODO: Handle moving objects with long presses (?)
    layer.handleEvent = ({ grid, storage, event }) => {
        const stored = storage.getStored({ layer, grid });
        const currentObjectId = stored.currentObjectId;
        if (currentObjectId === undefined && event.type !== "pointerDown") {
            return;
        }
        const object = stored.objects[currentObjectId];

        switch (event.type) {
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
                return handleKeyDown?.({ event, grid, storage });
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
                        stored.temporary.expanding = true;
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
                    event.type === "pointerDown" &&
                    points.indexOf(startPoint) === -1
                ) {
                    let discontinueInput = false;
                    const history = [];
                    const newId = grid.convertIdAndPoints({
                        pointsToId: object.points,
                    });
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
                        stored.temporary.expanding = true;
                        history.push({
                            id,
                            object: { points: [id], state: null },
                        });
                    }
                    return { history, discontinueInput };
                } else if (event.type === "pointerDown") {
                    // We start to resize the current object, but we don't know yet if it's expanding or shrinking
                    return;
                }
                // Here, we're definitely resizing the object

                if (stored.temporary.expanding === undefined) {
                    // Only expand the object if the newPoints are not part of the old object
                    // Note that startPoint is actually the last point from the previous event
                    stored.temporary.expanding =
                        points.indexOf(event.points[1]) === -1;
                }

                const updatedPoints = stored.temporary.expanding
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
                if (stored.temporary.expanding === undefined) {
                    // Remove the one cell that was selected
                    objectCopy.points = objectCopy.points.filter(
                        (p) => p !== stored.temporary.previousPoint,
                    );

                    if (!objectCopy.points.length) {
                        return {
                            discontinueInput: true,
                            history: [{ id: currentObjectId, object: null }],
                        };
                    }
                }

                const oldId = currentObjectId;
                const newId = grid.convertIdAndPoints({
                    pointsToId: objectCopy.points,
                });
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
            default: {
                throw Error(`Unknown event.type=${event.type}`);
            }
        }
    };
};
