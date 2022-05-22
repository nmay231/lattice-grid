import { initialSettings } from "../../atoms/settings";
import {
    Grid,
    HistoryAction,
    IncompleteHistoryAction,
    LayerStorage,
    StorageManager,
} from "../StorageManager";

// TODO: A lot of these types are temporary or incomplete

export type PointerMoveOrDown = {
    type: "pointerDown" | "pointerMove";
    points: string[];
    cursor: { x: number; y: number };
    altKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
};

export type Keypress = { type: "keyDown" | "delete"; keypress: string };

export type CleanedDOMEvent =
    | { type: "cancelAction" }
    | { type: "pointerUp" }
    | { type: "undoRedo"; actions: HistoryAction[] }
    | Keypress
    | PointerMoveOrDown;

export type LayerEventEssentials<ObjectState> = {
    grid: Grid & {
        getPoints: any;
        getAllPoints: any;
        selectPointsWithCursor: (...args: any) => string[];
    };
    storage: StorageManager;
    stored: LayerStorage<ObjectState>;
    settings: typeof initialSettings;
    tempStorage: Record<string, any>;
};

export type LayerEvent<ObjectState = object> = CleanedDOMEvent &
    LayerEventEssentials<ObjectState>;

export type NewSettingsEvent<ObjectState, RawSettings> =
    LayerEventEssentials<ObjectState> & {
        newSettings: RawSettings;
        attachSelectionsHandler: any;
    };

export type LayerHandlerResult = {
    discontinueInput?: boolean;
    history?: IncompleteHistoryAction[];
};

// TODO: More specific types
type JSONSchema = { schema: object; uischemaElements: any[] };
type BlitGroup = object;

export type ILayer<ObjectState = object, RawSettings = object> = {
    id: string;
    unique: boolean;
    ethereal: boolean;
    rawSettings: RawSettings;
    defaultSettings: RawSettings;
    controls?: JSONSchema;
    constraints?: JSONSchema;
    newSettings?: (
        settingsChange: NewSettingsEvent<ObjectState, RawSettings>,
    ) => LayerHandlerResult | void;
    gatherPoints: (
        layerEvent: PointerMoveOrDown & LayerEventEssentials<ObjectState>,
    ) => string[];
    handleEvent: (layerEvent: LayerEvent<ObjectState>) => LayerHandlerResult;
    getBlits?: (data: LayerEventEssentials<ObjectState>) => BlitGroup[];
    getOverlayBlits?: (data: LayerEventEssentials<ObjectState>) => BlitGroup[];
};

const throwError =
    ({ message }: { message: string }) =>
    () => {
        throw Error(message);
    };

// Change this to only contain properties that layers would add at runtime (i.e. remove id, ethereal, and unique since those should always be defined on init)
export const BaseLayer: ILayer = {
    id: "INTERNAL_DO_NOT_USE",
    // In case it does get used, it should absolutely be shown
    ethereal: false,
    unique: true,
    rawSettings: {},
    defaultSettings: {},
    gatherPoints: throwError({ message: "gatherPoints not initialized" }),
    handleEvent: throwError({ message: "handleEvent not initialized" }),
    // TODO: Should these be required?
    // newSettings: throwError({ message: "newSettings not initialized" }),
    // getBlits: throwError({ message: "getBlits not initialized" }),
};
