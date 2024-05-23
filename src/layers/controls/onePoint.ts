import { Layer, LayerHandlerResult, LayerProps, Point, PointType } from "../../types";
import { notify } from "../../utils/notifications";

type CommonArgs = { pointTypes: PointType[]; deltas: any };

export interface OnePointProps<ObjectState> extends LayerProps {
    ObjectState: { state: ObjectState };
    TempStorage: {
        blacklist: Point[];
        previousPoint: Point;
        batchId: number;
        targetState: ObjectState | null;
    };
}

const pointGatherer =
    <ObjectState>({
        pointTypes,
        deltas,
    }: CommonArgs): Layer<OnePointProps<ObjectState>>["gatherPoints"] =>
    ({ grid, settings, cursor, tempStorage }) => {
        let newPoints = grid.selectPointsWithCursor({
            settings,
            cursor: cursor,
            pointTypes,
            deltas,
            previousPoint: tempStorage.previousPoint,
        });

        if (newPoints.length === 0) return [];
        tempStorage.previousPoint = newPoints.at(-1);
        const blacklist = tempStorage.blacklist ?? [];
        tempStorage.blacklist = blacklist;
        newPoints = newPoints.filter((point) => !blacklist.includes(point));

        if (newPoints.length === 0) return [];
        tempStorage.blacklist.push(...newPoints);

        return newPoints;
    };

export const handleEventsCycleStates = <
    LP extends OnePointProps<ObjectState>,
    ObjectState = unknown,
>(
    layer: Layer<LP>,
    { states, pointTypes, deltas }: CommonArgs & { states: ObjectState[] },
) => {
    if (!states?.length || !pointTypes?.length) {
        throw notify.error({
            message: "onePoint cycleStates was not provided required parameters",
        });
    }

    layer.gatherPoints = pointGatherer({ pointTypes, deltas });

    layer.handleEvent = (event): LayerHandlerResult<LP> => {
        if (event.type !== "pointerDown" && event.type !== "pointerMove") {
            return {};
        }

        const { storage, tempStorage, settings } = event;

        const stored = storage.getObjects<OnePointProps<ObjectState>>(layer.id);
        const newPoints = event.points;

        let state: ObjectState | null;
        if (tempStorage.targetState === undefined) {
            if (stored.keys(settings.editMode).includes(newPoints[0])) {
                const index =
                    1 + states.indexOf(stored.getObject(settings.editMode, newPoints[0]).state);
                state = index < states.length ? states[index] : null;
            } else {
                state = states[0];
            }
            tempStorage.targetState = state;
        } else {
            state = tempStorage.targetState;
        }

        tempStorage.batchId = tempStorage.batchId ?? storage.getNewBatchId();
        const history = newPoints.map((id) => ({
            id,
            batchId: tempStorage.batchId,
            object: state === null ? null : { state },
        }));
        return { history };
    };
};

export const handleEventsCurrentSetting = <
    LP extends OnePointProps<ObjectState>,
    ObjectState = unknown,
>(
    layer: Layer<LP> & { settings: { selectedState: ObjectState } },
    { pointTypes, deltas }: CommonArgs,
) => {
    if (!pointTypes?.length || !deltas?.length) {
        throw notify.error({
            message: "onePoint currentSetting was not provided required parameters",
        });
    }

    layer.gatherPoints = pointGatherer({ pointTypes, deltas });

    layer.handleEvent = (event): LayerHandlerResult<LP> => {
        if (event.type !== "pointerDown" && event.type !== "pointerMove") {
            return {};
        }

        const { storage, tempStorage, settings } = event;

        const stored = storage.getObjects<OnePointProps<ObjectState>>(layer.id);
        const newPoints = event.points;

        if (tempStorage.targetState === undefined) {
            const object = stored.getObject(settings.editMode, newPoints[0]);
            const isSame = object?.state === layer.settings.selectedState;
            tempStorage.targetState = isSame ? null : layer.settings.selectedState;
        }

        tempStorage.batchId = tempStorage.batchId ?? storage.getNewBatchId();
        const state = tempStorage.targetState;
        const history = newPoints.map((id) => ({
            id,
            batchId: tempStorage.batchId,
            object: state === null ? null : { state },
        }));
        return { history };
    };
};
