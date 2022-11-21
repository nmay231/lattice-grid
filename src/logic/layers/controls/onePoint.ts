import { Layer, LayerHandlerResult, LayerProps, PointType } from "../../../types";
import { errorNotification } from "../../../utils/DOMUtils";

type CommonArgs = { pointTypes: PointType[]; deltas: any };

export interface OnePointProps<ObjectState> extends LayerProps {
    ObjectState: { state: ObjectState };
    TempStorage: {
        blacklist: string[];
        previousPoint: string;
        batchId: number;
        targetState: ObjectState | null;
    };
}

const pointGatherer =
    <ObjectState>({
        pointTypes,
        deltas,
    }: CommonArgs): Layer<OnePointProps<ObjectState>>["gatherPoints"] =>
    ({ grid, cursor, tempStorage }) => {
        let newPoints = grid.selectPointsWithCursor({
            cursor: cursor,
            pointTypes,
            deltas,
            previousPoint: tempStorage.previousPoint,
        });

        if (!newPoints.length) return [];
        tempStorage.previousPoint = newPoints[newPoints.length - 1];
        const blacklist = tempStorage.blacklist ?? [];
        tempStorage.blacklist = blacklist;
        newPoints = newPoints.filter((point) => blacklist.indexOf(point) === -1);

        if (!newPoints.length) return [];
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
        throw errorNotification({
            message: "onePoint cycleStates was not provided required parameters",
            forever: true,
        });
    }

    layer.gatherPoints = pointGatherer({ pointTypes, deltas });

    layer.handleEvent = (event): LayerHandlerResult<LP> => {
        if (event.type !== "pointerDown" && event.type !== "pointerMove") {
            return { discontinueInput: true };
        }

        const { grid, storage, tempStorage } = event;

        const stored = storage.getStored<OnePointProps<ObjectState>>({ grid, layer });
        const newPoints = event.points;

        let state: ObjectState | null;
        if (tempStorage.targetState !== undefined) {
            state = tempStorage.targetState;
        } else {
            if (newPoints[0] in stored.objects) {
                const index = 1 + states.indexOf(stored.objects[newPoints[0]].state);
                state = index < states.length ? states[index] : null;
            } else {
                state = states[0];
            }
            tempStorage.targetState = state;
        }

        tempStorage.batchId = tempStorage.batchId ?? storage.getNewBatchId();
        const history = newPoints.map((id) => ({
            id,
            batchId: tempStorage.batchId,
            object: state === null ? null : { point: id, state },
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
        throw errorNotification({
            message: "onePoint currentSetting was not provided required parameters",
            forever: true,
        });
    }

    layer.gatherPoints = pointGatherer({ pointTypes, deltas });

    layer.handleEvent = (event): LayerHandlerResult<LP> => {
        if (event.type !== "pointerDown" && event.type !== "pointerMove") {
            return { discontinueInput: true };
        }

        const { grid, storage, tempStorage } = event;

        const stored = storage.getStored<OnePointProps<ObjectState>>({ grid, layer });
        const newPoints = event.points;

        if (tempStorage.targetState === undefined) {
            const isSame = stored.objects[newPoints[0]]?.state === layer.settings.selectedState;
            tempStorage.targetState = isSame ? null : layer.settings.selectedState;
        }

        tempStorage.batchId = tempStorage.batchId ?? storage.getNewBatchId();
        const state: ObjectState | null = tempStorage.targetState;
        const history = newPoints.map((id) => ({
            id,
            batchId: tempStorage.batchId,
            object: state === null ? null : { point: id, state },
        }));
        return { history };
    };
};