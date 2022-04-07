import { isEqual } from "lodash";

export const handleEventsCurrentSetting = (
    layer,
    { directional, pointTypes, stopOnFirstPoint, deltas } = {},
) => {
    if (!pointTypes?.length || !deltas?.length) {
        throw Error("Was not provided parameters");
    }

    layer.gatherPoints = ({ grid, storage, event }) => {
        const stored = storage.getStored({ grid, layer });

        const newPoints = grid.selectPointsWithCursor({
            cursor: event.cursor,
            pointTypes,
            deltas,
            previousPoint: stored.temporary.previousPoint,
        });
        if (stored.temporary.previousPoint) {
            newPoints.unshift(stored.temporary.previousPoint);
        }
        stored.temporary.previousPoint = newPoints[newPoints.length - 1];

        if (newPoints.length < 2) return [];

        return newPoints;
    };

    layer.handleEvent = ({ grid, storage, event }) => {
        if (event.type !== "pointerDown" && event.type !== "pointerMove") {
            return { discontinueInput: true };
        } else if (!event.points.length) {
            return;
        }

        const stored = storage.getStored({ grid, layer });
        const newPoints = event.points;

        const history = [];
        for (let i = 0; i < newPoints.length - 1; i++) {
            const pair = newPoints.slice(i, i + 2);
            if (!directional) {
                pair.sort();
            }
            const id = grid.convertIdAndPoints({ pointsToId: pair });

            if (stored.temporary.targetState === undefined) {
                const isSame = isEqual(
                    stored.objects[id]?.state,
                    layer.settings.selectedState,
                );

                stored.temporary.targetState = isSame
                    ? null
                    : layer.settings.selectedState;
            }

            if (stored.temporary.targetState === null && id in stored.objects) {
                history.push({ id, object: null });
            } else if (stored.temporary.targetState !== null) {
                history.push({
                    id,
                    object: {
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
