import { LayerEventEssentials } from "../logic/layers/baseLayer";
import { LayerStorage, StorageManager } from "../logic/StorageManager";

export type GetEventEssentialsArg<S> = {
    stored?: LayerStorage<S>;
    tempStorage?: any;
};

export const getEventEssentials = <ObjectState = object>(
    event = {} as GetEventEssentialsArg<ObjectState>,
): LayerEventEssentials<ObjectState> => {
    const { stored, tempStorage = {} } = event;
    const grid: LayerEventEssentials<ObjectState>["grid"] = {
        id: "grid",
        getAllPoints: () => [],
        getPoints: null,
        selectPointsWithCursor: () => [],
    };
    const _stored: LayerStorage<ObjectState> = stored || {
        objects: {},
        renderOrder: [],
    };

    return {
        grid,
        storage: {
            ...new StorageManager(),
            getStored: jest.fn(() => _stored),
            getNewBatchId: jest.fn(),
        } as any as StorageManager,
        stored: _stored,
        tempStorage,
        settings: {
            borderPadding: 60,
            cellSize: 60,
            actionWindowMs: 600,
        },
    };
};
