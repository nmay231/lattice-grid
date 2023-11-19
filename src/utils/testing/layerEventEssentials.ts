import { vi } from "vitest";
import { LayerStorage } from "../../LayerStorage";
import { PuzzleManager } from "../../PuzzleManager";
import { StorageManager } from "../../StorageManager";
import { Grid, LayerEventEssentials, LayerProps } from "../../types";
import { partialMock } from "./partialMock";

export type LayerEventEssentialsArg<LP extends LayerProps> = {
    stored?: LayerStorage<LP>;
    tempStorage?: Partial<LP["TempStorage"]>;
};

export const layerEventEssentials = <LP extends LayerProps = LayerProps>(
    event = {} as LayerEventEssentialsArg<LP>,
) => {
    const { stored, tempStorage = {} } = event;
    const grid = partialMock<Grid>({
        id: "grid",
        getAllPoints: vi.fn().mockImplementation(() => []),
        selectPointsWithCursor: vi.fn().mockImplementation(() => []),
    });
    const _stored = stored || new LayerStorage<LP>();

    return {
        grid,
        _stored,
        storage: Object.assign(new StorageManager(), {
            getObjects: vi.fn(() => _stored as LayerStorage<any>),
            getNewBatchId: vi.fn(),
        } satisfies Partial<StorageManager>),
        tempStorage,
        settings: partialMock<PuzzleManager["settings"]>({
            editMode: "question",
            pageMode: "edit",
            debugging: false,
            cellSize: 60,
        }),
    } satisfies LayerEventEssentials<LP> & { _stored: LayerStorage<LP> };
};
