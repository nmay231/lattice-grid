import { initialSettings } from "./atoms/settings";
import { LineBlits } from "./components/SVGCanvas/Line";
import { PolygonBlits } from "./components/SVGCanvas/Polygon";
import { TextBlits } from "./components/SVGCanvas/Text";
import { SelectionExtraProps } from "./logic/layers/Selection";
import { StorageManager } from "./logic/StorageManager";

// ======== Explicit Type Names ========

// TODO: Replace all relevant instances of the plain types with these explicit types.
// It helps with changing all of the types if necessary, and also with being explicit with how composite types are used.
export type LayerId = string;
export type GridId = string | symbol;
export type Point = string;

// ======== Layers ========

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

export type LayerEventEssentials<LP extends LayerProps> = {
    grid: Grid;
    storage: StorageManager;
    settings: typeof initialSettings;
    tempStorage: Partial<LP["TempStorage"]>;
};

export type LayerEvent<LP extends LayerProps> = CleanedDOMEvent &
    LayerEventEssentials<LP>;

export type NewSettingsEvent<LP extends LayerProps> =
    LayerEventEssentials<LP> & {
        newSettings: LP["RawSettings"];
        attachSelectionsHandler: SelectionExtraProps["attachHandler"];
    };

export type LayerHandlerResult = {
    discontinueInput?: boolean;
    history?: IncompleteHistoryAction[];
};

// TODO: More specific types
type JSONSchema = { schema: object; uischemaElements: any[] };

export type LayerProps = {
    // TODO: Try allowing settings and rawSettings to be optional
    RawSettings: object;
    ObjectState: object;
    ExtraLayerStorageProps: object;
    TempStorage: object;
};

export type ILayer<LP extends LayerProps = LayerProps> = {
    id: string;
    unique: boolean;
    ethereal: boolean;
    rawSettings: LP["RawSettings"];
    defaultSettings: LP["RawSettings"];
    controls?: JSONSchema;
    constraints?: JSONSchema;
    newSettings?: (
        settingsChange: NewSettingsEvent<LP>,
    ) => LayerHandlerResult | void;
    gatherPoints: (
        layerEvent: PointerMoveOrDown & LayerEventEssentials<LP>,
    ) => string[];
    handleEvent: (layerEvent: LayerEvent<LP>) => LayerHandlerResult;
    getBlits?: (data: LayerEventEssentials<LP>) => BlitGroup[];
    getOverlayBlits?: (data: LayerEventEssentials<LP>) => BlitGroup[];
};

// ======== Undo-Redo History ========

export type Grid = {
    id: GridId;
    // TODO: More specific types
    getPoints: any;
    getAllPoints: any;
    selectPointsWithCursor: (...args: any) => string[];
};
export type Layer = { id: string };

export type GridAndLayer = { grid: Grid; layer: Layer };

export type LayerStorage<LP extends LayerProps = LayerProps> = {
    renderOrder: string[];
    objects: Record<string, LP["ObjectState"]>;
    // TODO: Should I nest this property to avoid any future conflicts?
} & Partial<LP["ExtraLayerStorageProps"]>;

export type IncompleteHistoryAction = {
    id: string;
    layerId?: string;
    batchId?: "ignore" | number;
    // TODO: More specific types
    object: any;
};
export type HistoryAction = {
    id: string;
    layerId: string;
    batchId?: number;
    object: object | null;
    renderIndex: number;
};
export type History = {
    actions: HistoryAction[];
    index: number;
};

// ======== Rendering ========

export type RenderChange =
    | { type: "draw"; layerIds: string[] | "all" }
    | { type: "delete"; layerId: string }
    | { type: "switchLayer" }
    | { type: "reorder" };

// TODO: More specific types
export type BlitGroup = LineBlits | TextBlits | PolygonBlits;
