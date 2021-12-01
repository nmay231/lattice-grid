export const handlePointerEventCycleStates = (
    layer,
    { states, pointTypes }
) => {
    if (!states?.length || !pointTypes?.length) {
        throw Error("Was not provided parameters");
    }

    layer.handleKeyDown = () => {};

    layer.handlePointerEvent = ({ grid, storage, event }) => {
        if (event.type !== "startPointer" && event.type !== "movePointer") {
            return { discontinueInput: true };
        }

        const stored = storage.getStored({ grid, layer });

        const newPoint = grid.nearestPoint({
            to: event.cursor,
            intersection: "polygon",
            pointTypes,
            blacklist: stored.temporary.blacklist,
        });
        if (!newPoint) {
            return {};
        }
        stored.temporary.blacklist = stored.temporary.blacklist ?? [];
        stored.temporary.blacklist.push(newPoint);

        let historyAction = {
            action: "add",
            object: {},
        };
        let state;

        if (stored.temporary.targetState !== undefined) {
            state = stored.temporary.targetState;
        } else {
            if (newPoint in stored.objects) {
                const index =
                    1 + states.indexOf(stored.objects[newPoint].state);
                state = index < states.length ? states[index] : null;
            } else {
                state = states[0];
            }
        }

        if (state === null) {
            historyAction = {
                action: "delete",
                id: newPoint,
            };
        } else {
            historyAction.object = {
                id: newPoint,
                state,
            };
        }

        stored.temporary.targetState = state;
        return {
            history: [historyAction],
        };
    };
};

export const handlePointerEventCurrentSetting = (layer, { pointTypes }) => {
    if (!pointTypes?.length) {
        throw Error("Was not provided parameters");
    }

    layer.handleKeyDown = () => {};

    layer.handlePointerEvent = ({ grid, storage, event }) => {
        if (event.type !== "startPointer" && event.type !== "movePointer") {
            return { discontinueInput: true };
        }

        const stored = storage.getStored({ grid, layer });

        const newPoint = grid.nearestPoint({
            to: event.cursor,
            intersection: "polygon",
            pointTypes,
            blacklist: stored.temporary.blacklist,
        });
        if (!newPoint) {
            return {};
        }
        stored.temporary.blacklist = stored.temporary.blacklist ?? [];
        stored.temporary.blacklist.push(newPoint);

        let historyAction;
        if (stored.temporary.targetState === undefined) {
            if (newPoint in stored.objects) {
                const state = stored.objects[newPoint].state;
                stored.temporary.targetState =
                    state === layer.settings.selectedState ? null : state;
            } else {
                stored.temporary.targetState = layer.settings.selectedState;
            }
        }
        if (stored.temporary.targetState !== null) {
            historyAction = {
                action: "add",
                object: {
                    id: newPoint,
                    state: stored.temporary.targetState,
                    point: newPoint,
                },
            };
        } else {
            historyAction = {
                action: "delete",
                id: newPoint,
            };
        }

        return {
            history: [historyAction],
        };
    };
};
