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
        throw notify.error({
            message: "onePoint cycleStates was not provided required parameters",
            forever: true,
        });
    }

    layer.gatherPoints = pointGatherer({ pointTypes, deltas });

    layer.handleEvent = (event): LayerHandlerResult<LP> => {
        if (event.type !== "pointerDown" && event.type !== "pointerMove") {
            return {};
        }

        const { grid, storage, tempStorage, settings } = event;

        const stored = storage.getStored<OnePointProps<ObjectState>>({ grid, layer });
        const newPoints = event.points;

        let state: ObjectState | null;
        if (tempStorage.targetState !== undefined) {
            state = tempStorage.targetState;
        } else {
            if (stored.keys(settings.editMode).has(newPoints[0])) {
                const index = 1 + states.indexOf(stored.getObject(newPoints[0]).state);
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

type OnePointCurrentSettingLayer<
    LP extends OnePointProps<ObjectState>,
    K extends keyof LP["Settings"] = never,
    ObjectState = unknown,
> = Layer<LP> & { settings: { [Key in K]: ObjectState } };

export const handleEventsCurrentSetting = <
    LP extends OnePointProps<ObjectState>,
    ObjectState = unknown,
    K extends keyof LP["Settings"] = never,
>({
    pointTypes,
    deltas,
    settingsKey,
}: CommonArgs & { settingsKey: K }) => {
    if (!pointTypes?.length || !deltas?.length) {
        throw notify.error({
            message: "onePoint currentSetting was not provided required parameters",
            forever: true,
        });
    }

    const gatherPoints = pointGatherer<ObjectState>({ pointTypes, deltas });

    type OnePointLayer = OnePointCurrentSettingLayer<LP, typeof settingsKey, ObjectState>;

    const handleEvent: OnePointLayer["handleEvent"] = function (
        this: OnePointLayer,
        event,
    ): LayerHandlerResult<LP> {
        if (event.type !== "pointerDown" && event.type !== "pointerMove") {
            return {};
        }

        // if (layerIsGOOFy(this)) {
        //     if (this.settings.gridOrObjectFirst === "object") {
        //         // TODO: Get the layer to switch to onePoint.handleEventsCurrentSetting but after it can handle a generic settings key ("currentCharacter" instead of "selectedState"). I do that instead of adapting selection to do it because other layers will decide between one of the two onePoint handlers.
        //         return this.eventPlaceSinglePointObjects(event);
        //     }
        // }

        const { grid, storage, tempStorage } = event;

        const stored = storage.getStored<OnePointProps<ObjectState>>({ grid, layer: this });
        const newPoints = event.points;

        if (tempStorage.targetState === undefined) {
            const object = stored.getObject(newPoints[0]);
            const isSame = object?.state === this.settings[settingsKey];
            tempStorage.targetState = isSame ? null : this.settings[settingsKey];
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

    const eventPlaceSinglePointObjects = function () {};

    return { gatherPoints, handleEvent, eventPlaceSinglePointObjects };
};
