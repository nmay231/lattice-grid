export const handlePointerEventUnorderedSets = (
    layer,
    {
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
        const { objects, currentObjectId } = stored;

        if (currentObjectId === null) {
            return;
        }

        if (event.code === "Escape") {
            stored.currentObjectId = null;
            if (typeof currentObjectId === "symbol") {
                // If object was being created (not edited), delete the temporary object and add back in the normal one
                const id = grid.convertIdAndPoints({
                    pointsToId: objects[currentObjectId].points,
                });
                return {
                    history: [
                        { id: currentObjectId, object: null },
                        { id, object: objects[currentObjectId] },
                    ],
                };
            }
            return;
        }
        if (event.code === "Delete") {
            stored.currentObjectId = null;
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
                return;
            }

            const object = stored.objects[stored.currentObjectId];
            const newId = grid.convertIdAndPoints({
                pointsToId: object.points,
            });
            if (stored.currentObjectId === newId) {
                stored.currentObjectId = undefined;
                return { discontinueInput: true };
            }

            const history = [{ id: newId, object }];
            if (event.type !== "unfocusPointer") {
                history.push({ id: stored.currentObjectId, object: null });
                stored.currentObjectId = newId;
            } else {
                stored.currentObjectId = undefined;
            }

            return {
                discontinueInput: true,
                history,
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

        const allPoints = Object.values(stored.objects)
            .map((object) => object.points)
            .flat();
        const overlap = stored.renderOrder.filter(
            (id) => stored.objects[id].points.indexOf(newPoints[0]) > -1
        );

        if (stored.currentObjectId === undefined) {
            // This is only called on startPointer, so there is only one new point
            const point = newPoints[0];
            if (allPoints.indexOf(point) > -1) {
                // Select the topmost existing object and move it to the front of the rendering stack
                const id = overlap[overlap.length - 1];
                stored.temporary.currentObjectId = id;

                return {
                    // Move object to the front of the stack
                    history: [{ id, object: stored.objects[id] }],
                };
            } else {
                // Start drawing new object
                stored.currentObjectId = point;
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
                if (overlap.length) {
                    // Selecting a different existing object
                    const id = overlap[overlap.length - 1];
                    stored.currentObjectId = id;
                    // TODO: How to force rerender without polluting history (current Object changed, but the object state has not)
                    return { history: [{ id, object: stored.objects[id] }] };
                } else {
                    // Creating a new one
                    const id = newPoints[0];
                    stored.currentObjectId = id;
                    return {
                        history: [
                            { id, object: { points: [id], state: null } },
                        ],
                    };
                }
            } else if (event.type === "startPointer") {
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
                stored.currentObjectId = undefined;
                return {
                    history: [{ id: stored.currentObjectId, object: null }],
                };
            }
            const newObject = { points: updatedPoints, state: object.state };

            return {
                history: [{ id: stored.currentObjectId, object: newObject }],
            };
        }
    };
};
