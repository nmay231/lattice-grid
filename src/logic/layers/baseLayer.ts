import {
    Grid,
    IncompleteHistoryAction,
    LayerStorage,
    StorageManager,
} from "../StorageManager";

export type LayerEvent = {
    event: object;
    newSettings: object;
    grid: Grid;
    storage: StorageManager;
    stored: LayerStorage;
    attachSelectionsHandler: any;
};

export type LayerHandlerResult = {
    discountinueInput?: boolean;
    history?: IncompleteHistoryAction[];
};

export type ILayer = {
    id: string;
    unique: boolean;
    ethereal: boolean;
    defaultSettings?: object;
    constraints?: object;
    newSettings?: (layerEvent: LayerEvent) => void;
    handleEvent: (layerEvent: LayerEvent) => LayerHandlerResult;
    getBlits?: (layerEvent: LayerEvent) => object[];
};

const throwError =
    ({ message }: { message: string }) =>
    () => {
        throw Error(message);
    };

export const BaseLayer: ILayer = {
    id: "INTERNAL_DO_NOT_USE",
    // In case it does get used, it should absolutely be shown
    ethereal: false,
    unique: true,
    handleEvent: throwError({ message: "handleEvent not initialized" }),
    // TODO: Should these be required?
    // newSettings: throwError({ message: "newSettings not initialized" }),
    // getBlits: throwError({ message: "getBlits not initialized" }),
};
