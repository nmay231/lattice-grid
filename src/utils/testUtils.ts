import { Mock, vi } from "vitest";
import { LayerStorage } from "../LayerStorage";
import { StorageManager } from "../StorageManager";
import {
    HistoryAction,
    Layer,
    LayerEvent,
    LayerEventEssentials,
    LayerHandlerResult,
    LayerProps,
    PartialHistoryAction,
    Point,
    PointerMoveOrDown,
} from "../types";
import { stringifyAnything } from "./stringUtils";

export type GetEventEssentialsArg<LP extends LayerProps> = {
    stored?: LayerStorage<LP>;
    tempStorage?: Partial<LP["TempStorage"]>;
};

export const getEventEssentials = <LP extends LayerProps = LayerProps>(
    event = {} as GetEventEssentialsArg<LP>,
) => {
    const { stored, tempStorage = {} } = event;
    const grid: LayerEventEssentials<LP>["grid"] = {
        id: "grid",
        getAllPoints: () => [],
        getPoints: () => [],
        selectPointsWithCursor: () => [],
    };
    const _stored = stored || new LayerStorage<LP>();

    return {
        grid,
        storage: {
            ...new StorageManager(),
            getStored: vi.fn(() => _stored),
            getNewBatchId: vi.fn(),
        } as any as StorageManager,
        tempStorage,
        settings: {
            editMode: "question",
            pageMode: "edit",
            debugging: false,
            borderPadding: 60,
            cellSize: 60,
            actionWindowMs: 600,
        },
    } satisfies LayerEventEssentials<LP>;
};

export type LayerEventRunnerArg<LP extends LayerProps> = {
    layer: Pick<Layer<LP>, "handleEvent" | "gatherPoints">;
    stored?: LayerStorage<LP>;
    tempStorage?: Partial<LP["TempStorage"]>;
};

export const layerEventRunner = <LP extends LayerProps>(arg = {} as LayerEventRunnerArg<LP>) => {
    const { layer, stored, tempStorage = {} } = arg;
    const grid = {
        id: "grid",
        getAllPoints: vi.fn().mockImplementation(() => []),
        getPoints: vi.fn().mockImplementation(() => []),
        selectPointsWithCursor: vi.fn().mockImplementation(() => []),
    } satisfies LayerEventEssentials<LP>["grid"];
    const _stored = stored || new LayerStorage<LP>();
    const storage = new StorageManager() as Omit<StorageManager, "getStored" | "getNewBatchId"> & {
        getStored: Mock;
        getNewBatchId: Mock<any, number>;
    };
    storage.getStored = vi.fn(() => _stored as any);
    storage.getNewBatchId = vi.fn();

    const event = {
        grid,
        storage,
        tempStorage,
        settings: {
            editMode: "question",
            pageMode: "edit",
            debugging: false,
            borderPadding: 60,
            cellSize: 60,
            actionWindowMs: 600,
        },
    } satisfies LayerEventEssentials<LP>;

    const pointerEvent: Omit<PointerMoveOrDown, "points" | "type"> = {
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        cursor: { x: 1, y: 1 }, // The value of cursor doesn't matter since it is mocked anyways
    };

    const handler = {
        grid,
        storage,
        tempStorage,
        handleHistory: (history?: PartialHistoryAction[]) => {
            if (!history?.length) return;
            for (const action of history) {
                _stored.objects.set(action.id, action.object);
            }
        },
        gatherPoints: ({
            type,
            points,
            ...rest
        }: Partial<typeof pointerEvent> &
            Pick<PointerMoveOrDown, "type"> & { points: Point[] }) => {
            grid.selectPointsWithCursor.mockReturnValueOnce(points);
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

type RecursivePartial<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
        ? RecursivePartial<U>[]
        : T[P] extends object
        ? RecursivePartial<T[P]>
        : T[P];
};

type PartialMockError = Error & { attributeChain: string };

const _defineAllUsedProperties = <T extends object = any>(
    x: T,
    stringified: string | null,
    attributeChain: string,
): T => {
    stringified = stringified || stringifyAnything(x);
    return new Proxy(x, {
        get(target, p, receiver) {
            if (typeof p !== "string") {
                return Reflect.get(target, p, receiver);
            }

            const nextAttributeChain = `${attributeChain}.${p}`;
            if (p in target) {
                let recurse: unknown;

                try {
                    recurse = target[p as never]; // `as never` Because typescript is dumb sometimes
                } catch (err) {
                    const nextErr = new Error(
                        `Could not access the nested property of ${stringified}: \`${
                            (err as PartialMockError).attributeChain
                        }\``,
                        {},
                    ) as PartialMockError;
                    nextErr.attributeChain = (err as PartialMockError).attributeChain;
                    throw nextErr;
                }
                if (typeof recurse === "object" && recurse !== null) {
                    return _defineAllUsedProperties(recurse, stringified, nextAttributeChain);
                }
                return recurse;
            } else {
                const err = new Error(
                    `Could not access the property of ${stringified}: \`${nextAttributeChain}\``,
                    {},
                ) as PartialMockError;
                err.attributeChain = attributeChain;
                throw err;
            }
        },
    });
};

export const partialMock = <T>(x: RecursivePartial<T>) => {
    return _defineAllUsedProperties(x, null, "") as T;
};
