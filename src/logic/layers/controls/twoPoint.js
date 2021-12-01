export const handlePointerEventCurrentSetting = (
    layer,
    { directional, pointTypes, stopOnFirstPoint } = {}
) => {
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
        });
        if (
            !newPoint ||
            !stored.temporary.previousPoint ||
            newPoint === stored.temporary.previousPoint
        ) {
            if (newPoint) {
                stored.temporary.previousPoint = newPoint;
            }
            return {};
        }

        const pair = [stored.temporary.previousPoint, newPoint];
        stored.temporary.previousPoint = newPoint;
        if (!directional) {
            pair.sort();
        }
        const id = grid.convertIdAndPoints({ pointsToId: pair });

        if (stored.temporary.targetState === undefined) {
            stored.temporary.targetState =
                id in stored.objects ? null : layer.settings.selectedState;
        }

        let historyAction = null;
        if (stored.temporary.targetState === null && id in stored.objects) {
            historyAction = { action: "delete", id };
        } else if (stored.temporary.targetState !== null) {
            historyAction = {
                action: "add",
                object: {
                    id,
                    points: pair,
                    state: stored.temporary.targetState,
                },
            };
        }

        return {
            discontinueInput: stopOnFirstPoint,
            history: historyAction ? [historyAction] : undefined,
        };
    };
};
