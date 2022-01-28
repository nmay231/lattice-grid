export const handlePointerEventCycleStates = (
    layer,
    { states, pointTypes, deltas }
) => {
    if (!states?.length || !pointTypes?.length) {
        throw Error("Was not provided parameters");
    }

    layer.handleKeyDown = null;

    layer.handlePointerEvent = ({ grid, storage, event }) => {
        if (event.type !== "startPointer" && event.type !== "movePointer") {
            return { discontinueInput: true };
        }

        const stored = storage.getStored({ grid, layer });

        stored.temporary.blacklist = stored.temporary.blacklist ?? [];
        const newPoints = grid
            .selectPointsWithCursor({
                cursor: event.cursor,
                pointTypes,
                deltas,
                lastPoint: stored.temporary.lastPoint,
            })
            .filter(
                (point) => stored.temporary.blacklist.indexOf(point) === -1
            );

        if (!newPoints.length) {
            return {};
        }

        const lastPoint = newPoints[newPoints.length - 1];
        stored.temporary.lastPoint = lastPoint;
        stored.temporary.blacklist.push(lastPoint);

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
        }
        stored.temporary.targetState = state;

        const history = newPoints.map((id) => ({
            id,
            object: state === null ? null : { point: id, state },
        }));
        return { history };
    };
};

export const handlePointerEventCurrentSetting = (
    layer,
    { pointTypes, deltas }
) => {
    if (!pointTypes?.length || !deltas?.length) {
        throw Error("Was not provided parameters");
    }

    layer.handleKeyDown = null;

    layer.handlePointerEvent = ({ grid, storage, event }) => {
        if (event.type !== "startPointer" && event.type !== "movePointer") {
            return { discontinueInput: true };
        }

        const stored = storage.getStored({ grid, layer });

        stored.temporary.blacklist = stored.temporary.blacklist ?? [];
        const newPoints = grid
            .selectPointsWithCursor({
                cursor: event.cursor,
                pointTypes,
                deltas,
                lastPoint: stored.temporary.lastPoint,
            })
            .filter(
                (point) => stored.temporary.blacklist.indexOf(point) === -1
            );

        if (!newPoints.length) {
            return {};
        }

        const lastPoint = newPoints[newPoints.length - 1];
        stored.temporary.lastPoint = lastPoint;
        stored.temporary.blacklist.push(lastPoint);

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
