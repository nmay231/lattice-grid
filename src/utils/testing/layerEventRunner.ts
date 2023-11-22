import { Mock } from "vitest";
import { LayerStorage } from "../../LayerStorage";
import {
    HistoryAction,
    Layer,
    LayerEvent,
    LayerHandlerResult,
    LayerProps,
    PartialHistoryAction,
    Point,
    PointerMoveOrDown,
} from "../../types";
import { PUT_AT_END } from "../OrderedMap";
import { layerEventEssentials } from "./layerEventEssentials";
import { partialMock } from "./partialMock";

export type LayerEventRunnerArg<LP extends LayerProps> = {
    layer: Pick<Layer<LP>, "handleEvent" | "gatherPoints">;
    stored?: LayerStorage<LP>;
    tempStorage?: Partial<LP["TempStorage"]>;
};
/** Mocks controls and storage management for testing purposes */

export const layerEventRunner = <LP extends LayerProps>(arg: LayerEventRunnerArg<LP>) => {
    const { layer, stored, tempStorage = {} } = arg;
    const event = layerEventEssentials({ stored, tempStorage });
    const { grid, storage, _stored } = event;

    const pointerEvent = partialMock<Omit<PointerMoveOrDown, "points" | "type">>({
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
    });

    const handler = {
        grid,
        storage,
        tempStorage,
        handleHistory: (history?: PartialHistoryAction[]) => {
            if (!history?.length) return;
            for (const action of history) {
                _stored.setObject("question", action.id, action.object, PUT_AT_END);
            }
        },
        gatherPoints: ({
            type,
            points,
            ...rest
        }: Partial<typeof pointerEvent> &
            Pick<PointerMoveOrDown, "type"> & { points: Point[] }) => {
            (grid.selectPointsWithCursor as Mock).mockReturnValueOnce(points);
            return layer.gatherPoints({
                ...event,
                ...pointerEvent,
                ...rest,
                type,
            });
        },
        events: {
            pointerDown: ({
                points,
                ...rest
            }: Partial<typeof pointerEvent> & { points: Point[] }) => {
                const result = layer.handleEvent({
                    ...event,
                    ...pointerEvent,
                    ...rest,
                    type: "pointerDown",
                    points,
                });
                handler.handleHistory(result.history);
                return result;
            },
            pointerMove: ({
                points,
                ...rest
            }: Partial<typeof pointerEvent> & { points: Point[] }) => {
                const result = layer.handleEvent({
                    ...event,
                    ...pointerEvent,
                    ...rest,
                    type: "pointerMove",
                    points,
                });
                handler.handleHistory(result.history);
                return result;
            },
            pointerUp: () => {
                const result = layer.handleEvent({
                    ...event,
                    type: "pointerUp",
                });
                handler.handleHistory(result.history);
                return result;
            },
            cancelAction: () => {
                const result = layer.handleEvent({
                    ...event,
                    type: "cancelAction",
                });
                return result;
            },
            keyDown: ({
                keypress,
                handleHistory = true,
            }: {
                keypress: string;
                handleHistory: boolean;
            }) => {
                const result = layer.handleEvent({
                    ...event,
                    keypress,
                    type: "keyDown",
                });
                if (handleHistory) handler.handleHistory(result.history);
                return result;
            },
            delete: ({ handleHistory = true }: { handleHistory: boolean }) => {
                const result = layer.handleEvent({
                    ...event,
                    keypress: "Delete",
                    type: "delete",
                });
                if (handleHistory) handler.handleHistory(result.history);
                return result;
            },
            undoRedo: ({ actions }: { actions: HistoryAction<LP>[] }) => {
                const result = layer.handleEvent({
                    ...event,
                    actions,
                    type: "undoRedo",
                });
                handler.handleHistory(result.history);
                return result;
            },
        } satisfies Record<LayerEvent<LP>["type"], (...args: any[]) => LayerHandlerResult<LP>>,
    };

    return handler;
};
