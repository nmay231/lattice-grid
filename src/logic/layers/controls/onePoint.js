const pointGatherer =
    (layer, { pointTypes, deltas }) =>
    ({ grid, storage, event }) => {
        const stored = storage.getStored({ grid, layer });

        stored.temporary.blacklist = stored.temporary.blacklist ?? [];
        let newPoints = grid.selectPointsWithCursor({
            cursor: event.cursor,
            pointTypes,
            deltas,
            previousPoint: stored.temporary.previousPoint,
        });

        if (!newPoints.length) return;
        stored.temporary.previousPoint = newPoints[newPoints.length - 1];
        newPoints = newPoints.filter(
            (point) => stored.temporary.blacklist.indexOf(point) === -1,
        );

        if (!newPoints.length) return;
        stored.temporary.blacklist.push(...newPoints);

        return newPoints;
    };

export const handleEventsCycleStates = (
    layer,
    { states, pointTypes, deltas },
) => {
    if (!states?.length || !pointTypes?.length) {
        throw Error("Was not provided parameters");
    }

    layer.gatherPoints = pointGatherer(layer, { pointTypes, deltas });

    layer.handleEvent = ({ grid, storage, event }) => {
        if (event.type !== "pointerDown" && event.type !== "pointerMove") {
            return { discontinueInput: true };
        }

        const stored = storage.getStored({ grid, layer });
        const newPoints = event.points;

        let state;
        if (stored.temporary.targetState !== undefined) {
            state = stored.temporary.targetState;
        } else {
            if (newPoints[0] in stored.objects) {
                const index =
                    1 + states.indexOf(stored.objects[newPoints[0]].state);
                state = index < states.length ? states[index] : null;
            } else {
                state = states[0];
            }
            stored.temporary.targetState = state;
        }

        const history = newPoints.map((id) => ({
            id,
            object: state === null ? null : { point: id, state },
        }));
        return { history };
    };
};

export const handleEventsCurrentSetting = (layer, { pointTypes, deltas }) => {
    if (!pointTypes?.length || !deltas?.length) {
        throw Error("Was not provided parameters");
    }

    layer.gatherPoints = pointGatherer(layer, { pointTypes, deltas });

    layer.handleEvent = ({ grid, storage, event }) => {
        if (event.type !== "pointerDown" && event.type !== "pointerMove") {
            return { discontinueInput: true };
        }

        const stored = storage.getStored({ grid, layer });
        const newPoints = event.points;

        if (stored.temporary.targetState === undefined) {
            if (newPoints[0] in stored.objects) {
                const state = stored.objects[newPoints[0]].state;
                stored.temporary.targetState =
                    state === layer.settings.selectedState ? null : state;
            } else {
                stored.temporary.targetState = layer.settings.selectedState;
            }
        }

        const state = stored.temporary.targetState;
        const history = newPoints.map((id) => ({
            id,
            object: state === null ? null : { point: id, state },
        }));
        return { history };
    };
};
