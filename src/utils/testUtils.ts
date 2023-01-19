import { vi } from "vitest";
import { LayerStorage } from "../LayerStorage";
import { StorageManager } from "../StorageManager";
import { LayerEventEssentials, LayerProps } from "../types";

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
            borderPadding: 60,
            cellSize: 60,
            actionWindowMs: 600,
        },
    } satisfies LayerEventEssentials<LP>;
};
