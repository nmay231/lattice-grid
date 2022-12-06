import { vi } from "vitest";
import { LayerStorage } from "../logic/LayerStorage";
import { StorageManager } from "../logic/StorageManager";
import { LayerEventEssentials, LayerProps } from "../types";

export type GetEventEssentialsArg<LP extends LayerProps> = {
    stored?: LayerStorage<LP>;
    tempStorage?: Partial<LP["TempStorage"]>;
};

export const getEventEssentials = <LP extends LayerProps = LayerProps>(
    event = {} as GetEventEssentialsArg<LP>,
): LayerEventEssentials<LP> => {
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
            borderPadding: 60,
            cellSize: 60,
            actionWindowMs: 600,
        },
    };
};
