import {
    HistoryAction,
    Layer,
    LayerProps,
    PartialHistoryAction,
    Point,
    PointType,
    StorageFilter,
} from "../../types";
import { zip } from "../../utils/data";
import { notify } from "../../utils/notifications";
import { smartSort } from "../../utils/string";

type StringRecord = Record<string, string>;

export interface TwoPointProps<State extends StringRecord> extends LayerProps {
    ObjectState: { points: Point[]; pointType: PointType } & State;
    Settings: State;
    TempStorage: {
        previousPoint: Point;
        batchId: number;
        targetState: null | string;
    };
}

export type TwoPointCurrentStateParameters<State extends StringRecord> = {
    directional?: boolean;
    pointTypes?: PointType[];
    stateKeys: Array<keyof State>;
    // TODO: This can be inplemented using an if-statement in gatherPoints rather than discontinueInput
    // stopOnFirstPoint: boolean;
    // TODO: Replace deltas with FSM
    deltas?: { dx: number; dy: number }[];
};

export const handleEventsCurrentSetting = <
    LP extends TwoPointProps<State>,
    State extends StringRecord,
>({
    directional,
    pointTypes,
    deltas,
    stateKeys,
}: TwoPointCurrentStateParameters<State>) => {
    type TwoPointLayer = Layer<LP>;
    if (!pointTypes?.length || !deltas?.length || !stateKeys.length) {
        throw notify.error({
            message: "twoPoint currentSetting was not provided required parameters",
        });
    }

    const stateToString = (obj: State) => stateKeys.map((key) => obj[key]).join(";");
    const stringToState = (str: string) =>
        Object.fromEntries(zip(stateKeys, str.split(";"))) as State;

    const gatherPoints: TwoPointLayer["gatherPoints"] = function (
        this: TwoPointLayer,
        { grid, tempStorage, cursor, settings },
    ) {
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

    const handleEvent: TwoPointLayer["handleEvent"] = function (this: TwoPointLayer, event) {
        const { storage, type, tempStorage, settings } = event;
        if ((type !== "pointerDown" && type !== "pointerMove") || !event.points.length) {
            return {};
        }

        const stored = storage.getObjects<LP>(this.id);
        const newPoints = event.points;

        tempStorage.batchId = tempStorage.batchId ?? storage.getNewBatchId();
        const history: PartialHistoryAction<LP>[] = [];
        for (let i = 0; i < newPoints.length - 1; i++) {
            const pair = newPoints.slice(i, i + 2);
            if (!directional) {
                pair.sort(smartSort);
            }
            const id = pair.join(";");

            if (tempStorage.targetState === undefined) {
                const object = stored.getObject(settings.editMode, id);
                const isSame = object
                    ? stateToString(object) === stateToString(this.settings)
                    : false;
                tempStorage.targetState = isSame ? null : stateToString(this.settings);
            }

            if (tempStorage.targetState === null && stored.keys(settings.editMode).includes(id)) {
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
                        // TODO: Assumes there is only one pointType at a time. I need to switch to GridPoint's if I want to avoid this issue
                        pointType: pointTypes[0],
                        ...stringToState(tempStorage.targetState),
                    },
                });
            }
        }

        return { history };
    };

    const filterCorrectPointType: StorageFilter = (puzzle, _action) => {
        const action = _action as HistoryAction<TwoPointProps<State>>;
        if (!action.object || pointTypes.includes(action.object.pointType)) {
            return { keep: true };
        }
        return { keep: false };
    };

    return { stateToString, stringToState, gatherPoints, handleEvent, filterCorrectPointType };
};
