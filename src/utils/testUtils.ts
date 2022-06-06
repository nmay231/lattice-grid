import { LayerEventEssentials, LayerProps, LayerStorage } from "../globals";
import { StorageManager } from "../logic/StorageManager";

export type GetEventEssentialsArg<LP extends LayerProps> = {
    stored?: LayerStorage<LP>;
    tempStorage?: any;
};

export const getEventEssentials = <LP extends LayerProps = LayerProps>(
    event = {} as GetEventEssentialsArg<LP>,
): LayerEventEssentials<LP> => {
    const { stored, tempStorage = {} } = event;
    const grid: LayerEventEssentials<LP>["grid"] = {
        id: "grid",
        getAllPoints: () => [],
        getPoints: null,
        selectPointsWithCursor: () => [],
    };
    const _stored: LayerStorage<LP> = stored || {
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
        tempStorage,
        settings: {
            borderPadding: 60,
            cellSize: 60,
            actionWindowMs: 600,
        },
    };
};
