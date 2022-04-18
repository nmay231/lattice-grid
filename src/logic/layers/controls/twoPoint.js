import { isEqual } from "lodash";

export const handleEventsCurrentSetting = (
    layer,
    { directional, pointTypes, stopOnFirstPoint, deltas } = {},
) => {
    if (!pointTypes?.length || !deltas?.length) {
        throw Error("Was not provided parameters");
    }

    layer.gatherPoints = ({ grid, event, tempStorage }) => {
        const newPoints = grid.selectPointsWithCursor({
            cursor: event.cursor,
            pointTypes,
            deltas,
            previousPoint: tempStorage.previousPoint,
        });
        if (tempStorage.previousPoint) {
            newPoints.unshift(tempStorage.previousPoint);
        }
        tempStorage.previousPoint = newPoints[newPoints.length - 1];

        if (newPoints.length < 2) return [];

        return newPoints;
    };

    layer.handleEvent = ({ grid, storage, event, tempStorage }) => {
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

            if (tempStorage.targetState === undefined) {
                const isSame = isEqual(
                    stored.objects[id]?.state,
                    layer.settings.selectedState,
                );

                tempStorage.targetState = isSame
                    ? null
                    : layer.settings.selectedState;
            }

            if (tempStorage.targetState === null && id in stored.objects) {
                history.push({ id, object: null });
            } else if (tempStorage.targetState !== null) {
                history.push({
                    id,
                    object: {
                        points: pair,
                        state: tempStorage.targetState,
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
