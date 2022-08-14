import type { initialSettings } from "./atoms/settings";
import type { LineBlits } from "./components/SVGCanvas/Line";
import type { PolygonBlits } from "./components/SVGCanvas/Polygon";
import type { TextBlits } from "./components/SVGCanvas/Text";
import type { SquareGridParams } from "./logic/grids/SquareGrid";
import type { availableLayers } from "./logic/layers";
import type { SelectionExtraProps } from "./logic/layers/Selection";
import type { StorageManager } from "./logic/StorageManager";
import type { UserCodeJSON } from "./logic/userComputation/codeBlocks";

// #region - Compilation
export type PuzzleError = {
    message: string;
    objects?: {
        layerId: string;
        gridId: string;
        objectIds: string[];
    };
};

export type CompilerErrorDetails = {
    message: string;
    isInternal?: boolean;
    codeBlockIds: string[];
};

export type ICodeBlock<T extends UserCodeJSON = UserCodeJSON> = {
    json: T;

    registerVariableNames?(): void;
    expandVariables?(): void;
    variableInfo?(): IVariableInfo | null;
    validateInputs?(): void;

    // TODO: Better name perhaps? But also figure out iterator/generator pattern and how rank translation will be handled.
    getValue?(): any;

    // TODO: Should runOnce be required? I think it should, but I'll do that all at once after blocks have been developed some more.
    runOnce?(): void;

    // validation: expression type+rank validation, variable scope checks, alias expansion ->
    // optimization: unused code errors, optimization pattern matching, caching static values ->
    // runtime: step-solver, puzzle solution validation ->
    // stringify: compression (var name shorten, remove useless aliases), debug output (basically a memory dump)
};

export type VariableCodeBlock = Required<Pick<ICodeBlock, "variableInfo" | "getValue" | "json">>;

export interface IVariableInfo {
    // For now, I think I'll take after the MatLab style of every variable being a nested array of a scalar type.
    scalarType: "boolean" | "integer" | "point" | "object";
    rank: number;
    effectiveRank?: number; // TODO: Is this what I need to handle iteration in for-each loops?
    // TODO: Eventually, I want a convenient function that will return values in the specified rank
    // getValue: () => any;
}
// #endregion

// #region - Explicit Type Names
// TODO: Replace all relevant instances of the plain types with these explicit types.
// It helps with changing all of the types if necessary, and also with being explicit with how composite types are used.
export type Point = string;
export type Vector = [number, number];
export type Delta = { dx: number; dy: number };

export type PointType = "cells" | "edges" | "corners";
// #endregion

// #region - Grids
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
    getParams(): LocalStorageData["grid"];
    setParams(params?: SquareGridParams): void;
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
// #endregion

// #region - Layers
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
    grid: Pick<Grid, "id" | "getAllPoints" | "getPoints" | "selectPointsWithCursor">;
    storage: StorageManager;
    settings: typeof initialSettings;
    tempStorage: Partial<LP["TempStorage"]>;
};

export type LayerEvent<LP extends LayerProps> = CleanedDOMEvent & LayerEventEssentials<LP>;

export type NewSettingsEvent<LP extends LayerProps> = LayerEventEssentials<LP> & {
    newSettings: LP["RawSettings"];
    attachSelectionsHandler: SelectionExtraProps["attachHandler"];
};

export type LayerHandlerResult = {
    discontinueInput?: boolean;
    history?: IncompleteHistoryAction[];
};

type JSONSchema = { schema: NeedsUpdating; uischemaElements: NeedsUpdating[] };

export type LayerProps = {
    // TODO: Try allowing settings and rawSettings to be optional
    RawSettings: UnknownObject;
    ObjectState: UnknownObject;
    ExtraLayerStorageProps: UnknownObject;
    TempStorage: UnknownObject;
};

export type ILayer<LP extends LayerProps = LayerProps> = {
    id: string;
    unique: boolean;
    ethereal: boolean;
    rawSettings: LP["RawSettings"];
    defaultSettings: LP["RawSettings"];
    controls?: JSONSchema;
    constraints?: JSONSchema;
    newSettings?(settingsChange: NewSettingsEvent<LP>): LayerHandlerResult | void;
    gatherPoints: (layerEvent: PointerMoveOrDown & LayerEventEssentials<LP>) => string[];
    handleEvent: (layerEvent: LayerEvent<LP>) => LayerHandlerResult;
    getBlits?(data: Omit<LayerEventEssentials<LP>, "tempStorage">): BlitGroup[];
    getOverlayBlits?(data: Omit<LayerEventEssentials<LP>, "tempStorage">): BlitGroup[];
};
// #endregion

// #region - Undo-Redo History
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
    object: UnknownObject | null;
    renderIndex: number;
};
export type History = {
    actions: HistoryAction[];
    index: number;
};
// #endregion

// #region - Rendering
export type RenderChange =
    | { type: "draw"; layerIds: string[] | "all" }
    | { type: "delete"; layerId: string }
    | { type: "switchLayer" }
    | { type: "reorder" };

// TODO: More specific types
export type BlitGroup = LineBlits | TextBlits | PolygonBlits;
// #endregion

// #region - Parsing
export type LocalStorageData = {
    grid: SquareGridParams;
    layers: {
        layerClass: keyof typeof availableLayers;
        rawSettings?: UnknownObject;
    }[];
};
// #endregion

// #region - Refactoring
// I think I will always keep this type to make refactoring easier.
export type NeedsUpdating = any;

export type UnknownObject = Record<string, unknown>;
// #endregion
