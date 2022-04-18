const pointGatherer =
    (layer, { pointTypes, deltas }) =>
    ({ grid, event, tempStorage }) => {
        tempStorage.blacklist = tempStorage.blacklist ?? [];
        let newPoints = grid.selectPointsWithCursor({
            cursor: event.cursor,
            pointTypes,
            deltas,
            previousPoint: tempStorage.previousPoint,
        });

        if (!newPoints.length) return;
        tempStorage.previousPoint = newPoints[newPoints.length - 1];
        newPoints = newPoints.filter(
            (point) => tempStorage.blacklist.indexOf(point) === -1,
        );

        if (!newPoints.length) return;
        tempStorage.blacklist.push(...newPoints);

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

    layer.handleEvent = ({ grid, storage, event, tempStorage }) => {
        if (event.type !== "pointerDown" && event.type !== "pointerMove") {
            return { discontinueInput: true };
        }

        const stored = storage.getStored({ grid, layer });
        const newPoints = event.points;

        let state;
        if (tempStorage.targetState !== undefined) {
            state = tempStorage.targetState;
        } else {
            if (newPoints[0] in stored.objects) {
                const index =
                    1 + states.indexOf(stored.objects[newPoints[0]].state);
                state = index < states.length ? states[index] : null;
            } else {
                state = states[0];
            }
            tempStorage.targetState = state;
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

    layer.handleEvent = ({ grid, storage, event, tempStorage }) => {
        if (event.type !== "pointerDown" && event.type !== "pointerMove") {
            return { discontinueInput: true };
        }

        const stored = storage.getStored({ grid, layer });
        const newPoints = event.points;

        if (tempStorage.targetState === undefined) {
            if (newPoints[0] in stored.objects) {
                const state = stored.objects[newPoints[0]].state;
                tempStorage.targetState =
                    state === layer.settings.selectedState ? null : state;
            } else {
                tempStorage.targetState = layer.settings.selectedState;
            }
        }

        const state = tempStorage.targetState;
        const history = newPoints.map((id) => ({
            id,
            object: state === null ? null : { point: id, state },
        }));
        return { history };
    };
};
