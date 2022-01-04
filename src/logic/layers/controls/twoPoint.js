export const handlePointerEventCurrentSetting = (
    layer,
    { directional, pointTypes, stopOnFirstPoint, deltas } = {}
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

        const newPoints = grid.selectPointsWithCursor({
            cursor: event.cursor,
            pointTypes,
            deltas,
            lastPoint: stored.temporary.lastPoint,
        });
        if (stored.temporary.lastPoint) {
            newPoints.unshift(stored.temporary.lastPoint);
        }
        stored.temporary.lastPoint = newPoints[newPoints.length - 1];

        if (newPoints.length < 2) {
            return {};
        }

        const history = [];
        for (let i = 0; i < newPoints.length - 1; i++) {
            const pair = newPoints.slice(i, i + 2);
            if (!directional) {
                pair.sort();
            }
            const id = grid.convertIdAndPoints({ pointsToId: pair });

            if (stored.temporary.targetState === undefined) {
                stored.temporary.targetState =
                    id in stored.objects ? null : layer.settings.selectedState;
            }

            if (stored.temporary.targetState === null && id in stored.objects) {
                history.push({ action: "delete", id });
            } else if (stored.temporary.targetState !== null) {
                history.push({
                    action: "add",
                    object: {
                        id,
                        points: pair,
                        state: stored.temporary.targetState,
                    },
                });
            }
        }

        return {
            discontinueInput: stopOnFirstPoint,
            history,
        };
    };
};
