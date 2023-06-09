import { isEqual } from "lodash";
import { Layer, LayerProps, Point, PointType, UnknownObject } from "../../types";
import { notify } from "../../utils/notifications";
import { smartSort } from "../../utils/string";

export interface TwoPointProps extends LayerProps {
    ObjectState: { points: Point[]; state: unknown };
    TempStorage: {
        previousPoint: Point;
        batchId: number;
        targetState: null | UnknownObject;
    };
}

export type MinimalSettings = { selectedState: UnknownObject };

type Arg = Partial<{
    directional: boolean;
    pointTypes: PointType[];
    // TODO: This can be inplemented using an if-statement in gatherPoints rather than discontinueInput
    // stopOnFirstPoint: boolean;
    // TODO: Replace deltas with FSM
    deltas: { dx: number; dy: number }[];
}>;

export const handleEventsCurrentSetting = <LP extends TwoPointProps>(
    layer: Layer<LP> & { settings: MinimalSettings },
    { directional, pointTypes, deltas }: Arg = {},
) => {
    if (!pointTypes?.length || !deltas?.length) {
        throw notify.error({
            message: "twoPoint currentSetting was not provided required parameters",
            forever: true,
        });
    }

    layer.gatherPoints = ({ grid, tempStorage, cursor, settings }) => {
        const newPoints = grid.selectPointsWithCursor({
            settings,
            cursor,
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

    layer.handleEvent = (event) => {
        const { grid, storage, type, tempStorage } = event;
        if ((type !== "pointerDown" && type !== "pointerMove") || !event.points.length) {
            return {};
        }

        const stored = storage.getStored<LP>({ grid, layer });
        const newPoints = event.points;

        tempStorage.batchId = tempStorage.batchId ?? storage.getNewBatchId();
        const history = [];
        for (let i = 0; i < newPoints.length - 1; i++) {
            const pair = newPoints.slice(i, i + 2);
            if (!directional) {
                pair.sort(smartSort);
            }
            const id = pair.join(";");

            if (tempStorage.targetState === undefined) {
                const isSame = isEqual(stored.objects.get(id)?.state, layer.settings.selectedState);

                tempStorage.targetState = isSame ? null : layer.settings.selectedState;
            }

            if (tempStorage.targetState === null && stored.objects.has(id)) {
                history.push({
                    id,
                    batchId: tempStorage.batchId,
                    object: null,
                });
            } else if (tempStorage.targetState !== null) {
                history.push({
                    id,
                    batchId: tempStorage.batchId,
                    object: {
                        points: pair,
                        state: tempStorage.targetState,
                    },
                });
            }
        }

        return { history };
    };
};
