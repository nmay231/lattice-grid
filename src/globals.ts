import { initialSettings } from "./atoms/settings";
import { LineBlits } from "./components/SVGCanvas/Line";
import { PolygonBlits } from "./components/SVGCanvas/Polygon";
import { TextBlits } from "./components/SVGCanvas/Text";
import { availableLayers } from "./logic/layers";
import { SelectionExtraProps } from "./logic/layers/Selection";
import { StorageManager } from "./logic/StorageManager";

// ======== Explicit Type Names ========

// TODO: Replace all relevant instances of the plain types with these explicit types.
// It helps with changing all of the types if necessary, and also with being explicit with how composite types are used.
export type Point = string;
export type Delta = { dx: number; dy: number };

export type PointType = "cells" | "edges" | "corners";

// ======== Grids ========

export type Grid = {
    id: string;
    // TODO: More specific types
    getPoints: (arg: {
        points?: string[];
        connections: any;
        blacklist?: string[]; // TODO: Is this needed?
        includeOutOfBounds?: boolean;
        excludePreviousPoints?: boolean;
    }) => any;
    getAllPoints: any;
    selectPointsWithCursor: (arg: {
        // TODO: Change to [number, number]
        cursor: { x: number; y: number };
        pointTypes: PointType[];
        // TODO: implement deltas as Finite State Machines for more capabilities and better cross-compatibility between grid types
        deltas: Delta[];
        previousPoint?: string | null;
    }) => string[];
    getCanvasRequirements: () => {
        minX: number;
        minY: number;
        width: number;
        height: number;
    };
    getCanvasResizers: () => {
        name: string;
        x: number;
        y: number;
        rotate: number;
        resize: (amount: number) => void;
    }[];
};

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
    grid: Pick<
        Grid,
        "id" | "getAllPoints" | "getPoints" | "selectPointsWithCursor"
    >;
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
    getBlits?: (
        data: Omit<LayerEventEssentials<LP>, "tempStorage">,
    ) => BlitGroup[];
    getOverlayBlits?: (
        data: Omit<LayerEventEssentials<LP>, "tempStorage">,
    ) => BlitGroup[];
};

// ======== Undo-Redo History ========

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

// ======== Parsing ========

export type LocalStorageData = {
    grid: { width: number; height: number };
    layers: {
        layerClass: keyof typeof availableLayers;
        rawSettings?: object;
    }[];
};

// ======== Refactoring ========

// I think I will always keep this variable to make refactoring easier.
export type NeedsUpdating = any;
