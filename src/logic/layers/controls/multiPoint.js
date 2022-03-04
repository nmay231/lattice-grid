export const handlePointerEventUnorderedSets = (
    layer,
    {
        // TODO: In user settings, rename allowOverlap to "Allow partial overlap"
        allowOverlap = false,
        handleKeyDown,
        pointTypes,
        overwriteOthers = false,
        ensureConnected = true,
    }
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

    // TODO: Should I allow multiple current objects? (so I can do `ctrl-a del` and things like that)
    // TODO: Refactor so that simple actions/updates are grouped into one history item

    layer.handleKeyDown = ({ event, grid, storage }) => {
        const stored = storage.getStored({ grid, layer });
        const currentObjectId = stored.currentObjectId;

        if (currentObjectId === undefined) {
            return;
        }

        const object = stored.objects[currentObjectId];

        if (event.code === "Escape") {
            stored.currentObjectId = undefined;
            const newId = grid.convertIdAndPoints({
                pointsToId: object.points,
            });

            const history = [{ id: newId, object }];
            if (currentObjectId !== newId) {
                // TODO: This might not even be useful. currentObjectId should only not equal newId when in the middle of resizing the object, i.e. when the user's cursor/finger is down.
                history.unshift({ id: currentObjectId, object: null });
            }
            return { history };
        }
        if (event.code === "Delete") {
            stored.currentObjectId = undefined;
            // TODO: allow the layer to "delete" it's state before deleting the object?
            return {
                history: [{ id: currentObjectId, object: null }],
            };
        }

        return handleKeyDown?.({ event, grid, storage });
    };

    // TODO: Handle moving objects with long presses (?)
    layer.handlePointerEvent = ({ grid, storage, event }) => {
        const stored = storage.getStored({ layer, grid });
        if (event.type !== "startPointer" && event.type !== "movePointer") {
            if (stored.currentObjectId === undefined) {
                return { discontinueInput: true };
            } else if (event.type === "unfocusPointer") {
                const id = stored.currentObjectId;
                stored.currentObjectId = undefined;
                return {
                    discontinueInput: true,
                    // TODO: How do I force rerender without polluting history
                    history: [{ id, object: stored.objects[id] }],
                };
            }

            const object = { ...stored.objects[stored.currentObjectId] };
            if (stored.temporary.expanding === undefined) {
                // Remove the one cell that was selected
                object.points = object.points.filter(
                    (p) => p !== stored.temporary.lastPoint
                );
            }
            const newId = grid.convertIdAndPoints({
                pointsToId: object.points,
            });
            if (stored.currentObjectId === newId) {
                return { discontinueInput: true };
            }

            const oldId = stored.currentObjectId;
            stored.currentObjectId = newId;
            return {
                discontinueInput: true,
                history: [
                    { id: oldId, object: null },
                    { id: newId, object },
                ],
            };
        }

        stored.temporary.blacklist = stored.temporary.blacklist ?? [];
        let newPoints = grid.selectPointsWithCursor({
            cursor: event.cursor,
            pointTypes,
            deltas,
            lastPoint: stored.temporary.lastPoint,
        });
        if (!newPoints.length) return;

        const lastPoint = stored.temporary.lastPoint;
        stored.temporary.lastPoint = newPoints[newPoints.length - 1];

        newPoints = newPoints.filter(
            (id) => stored.temporary.blacklist.indexOf(id) === -1
        );
        if (!newPoints.length) return;
        stored.temporary.blacklist.push(...newPoints);

        const overlap = stored.renderOrder.filter(
            (id) => stored.objects[id].points.indexOf(newPoints[0]) > -1
        );

        if (stored.currentObjectId === undefined) {
            // This is only called on startPointer, so there is only one new point
            const point = newPoints[0];
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
                        { id: point, object: { points: [point], state: null } },
                    ],
                };
            }
        } else {
            const object = stored.objects[stored.currentObjectId];
            const points = object.points;
            if (
                event.type === "startPointer" &&
                points.indexOf(newPoints[0]) === -1
            ) {
                let discontinueInput = false;
                const history = [];
                const newId = grid.convertIdAndPoints({
                    pointsToId: object.points,
                });
                if (stored.currentObjectId !== newId) {
                    history.push(
                        { id: stored.currentObjectId, object: null },
                        { id: newId, object }
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
                    const id = newPoints[0];
                    stored.currentObjectId = id;
                    stored.temporary.expanding = true;
                    history.push({ id, object: { points: [id], state: null } });
                }
                return { history, discontinueInput };
            } else if (event.type === "startPointer") {
                // We start to resize the current object, but we don't know yet if it's expanding or shrinking
                return;
            }
            // Else, we're resizing an object

            // Only expand the object if the newPoints are not part of the old object
            stored.temporary.expanding =
                stored.temporary.expanding ??
                points.indexOf(newPoints[0]) === -1;

            // TODO: Do I need the layer to provide a stateUpdate method? This would be required if some states are incompatible with some sets of points
            // TODO: Do I need to update the id every time the object changes or can I delay that until I unfocus the object? In other words, do external systems need to the id to be updated every time? (I know the layer itself doesn't care).
            // TODO: Actually, (now that I changed it to a honking ternary) I need to take care of allowOverlap, overwriteOthers as well as check that overwriting another object doesn't split it in two

            const updatedPoints = stored.temporary.expanding
                ? points
                      .concat(
                          newPoints.filter(
                              (point) => points.indexOf(point) === -1
                          )
                      )
                      .sort()
                : points.filter(
                      (point) =>
                          newPoints.indexOf(point) === -1 && point !== lastPoint
                  );

            if (!updatedPoints.length) {
                const id = stored.currentObjectId;
                stored.currentObjectId = undefined;
                return {
                    discontinueInput: true,
                    history: [{ id, object: null }],
                };
            }
            const newObject = { points: updatedPoints, state: object.state };

            return {
                history: [{ id: stored.currentObjectId, object: newObject }],
            };
        }
    };
};
