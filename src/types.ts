import { ref } from "valtio";
import type { LineBlits } from "./components/SVGCanvas/Line";
import type { PolygonBlits } from "./components/SVGCanvas/Polygon";
import type { TextBlits } from "./components/SVGCanvas/Text";
import type { SquareGridParams } from "./logic/grids/SquareGrid";
import type { availableLayers } from "./logic/layers";
import type { PuzzleManager } from "./logic/PuzzleManager";
import type { StorageManager } from "./logic/StorageManager";
import type { UserCodeJSON } from "./logic/userComputation/codeBlocks";

// #region - Compilation
export type PuzzleError = {
    message: string;
    objects?: {
        layerId: Layer["id"];
        gridId: Grid["id"];
        objectIds: ObjectId[];
    };
};

export type CompilerErrorDetails = {
    message: string;
    isInternal?: boolean;
    codeBlockIds: UserCodeJSON["id"][];
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

// #region - Events
export type PointerMoveOrDown = {
    type: "pointerDown" | "pointerMove";
    points: Point[];
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
    settings: PuzzleManager["settings"];
    tempStorage: Partial<LP["TempStorage"]>;
};

export type LayerEvent<LP extends LayerProps> = CleanedDOMEvent & LayerEventEssentials<LP>;

export type NewSettingsEvent<LP extends LayerProps> = LayerEventEssentials<LP> & {
    newSettings: LP["RawSettings"];
};

// TODO: Adding OtherState makes sense for IncompleteHistoryAction, but not for LayerHandlerResult. Should this somehow be another property on LayerProps?
export type LayerHandlerResult<LP extends LayerProps> = {
    discontinueInput?: boolean;
    history?: PartialHistoryAction<LP>[];
};
// #endregion

// #region - Explicit Type Names
// TODO: Replace all relevant instances of the plain types with these explicit types.
// It helps with changing all of the types if necessary, and also with being explicit with how composite types are used.
export type Point = string;
export type Vector = [number, number];
export type Delta = { dx: number; dy: number };

export type PointType = "cells" | "edges" | "corners";
export type EditMode = "question" | "answer";
export type StorageMode = "question" | "answer" | "ui";
export type ObjectId = string;

export type ValtioRef<T extends object> = ReturnType<typeof ref<T>>;
// #endregion

// #region - Grids
export type Grid = {
    id: string;
    // TODO: More specific types
    getPoints: (arg: {
        settings: PuzzleManager["settings"];
        points?: Point[];
        connections: NeedsUpdating;
        includeOutOfBounds?: boolean;
    }) => NeedsUpdating;
    getAllPoints: (type: PointType) => Point[];
    selectPointsWithCursor: (arg: {
        settings: PuzzleManager["settings"];
        // TODO: Change to [number, number]
        cursor: { x: number; y: number };
        pointTypes: PointType[];
        // TODO: implement deltas as Finite State Machines for more capabilities and better cross-compatibility between grid types
        deltas: Delta[];
        previousPoint?: Point | null;
    }) => Point[];
    getParams(): LocalStorageData["grid"];
    setParams(params?: SquareGridParams): void;
    getCanvasRequirements: (puzzle: Pick<PuzzleManager, "settings">) => {
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
export type JSONSchema = { schema: NeedsUpdating; uischemaElements: NeedsUpdating[] };

export type LayerProps = {
    // TODO: Try allowing settings and rawSettings to be optional
    Type: string;
    RawSettings: UnknownObject;
    ObjectState: UnknownObject;
    ExtraLayerStorageProps: UnknownObject;
    TempStorage: UnknownObject;
};

export type Layer<LP extends LayerProps = LayerProps> = {
    type: LP["Type"];
    id: string;
    displayName: string;
    unique: boolean;
    ethereal: boolean;
    rawSettings: LP["RawSettings"];
    controls?: JSONSchema;
    constraints?: JSONSchema;
    newSettings: (
        settingsChange: Omit<NewSettingsEvent<LP>, "tempStorage">,
    ) => LayerHandlerResult<LP>;
    gatherPoints: (layerEvent: PointerMoveOrDown & LayerEventEssentials<LP>) => Point[];
    handleEvent: (layerEvent: LayerEvent<LP>) => LayerHandlerResult<LP>;
    getBlits: (data: Omit<LayerEventEssentials<LP>, "tempStorage">) => BlitGroup[];
    getOverlayBlits?: (data: Omit<LayerEventEssentials<LP>, "tempStorage">) => BlitGroup[];
};

export type LayerClass<LP extends LayerProps = LayerProps> = {
    new (klass: LayerClass<LP>, puzzle: PuzzleManager): Layer<LP>;
    create: (puzzle: PuzzleManager) => Layer<LP>;
    type: LP["Type"];
    displayName: string;
    ethereal: boolean;
    unique: boolean;
    defaultSettings: LP["RawSettings"];
    controls?: JSONSchema;
    constraints?: JSONSchema;
};
// #endregion

// #region - Undo-Redo History
export type PartialHistoryAction<LP extends LayerProps = LayerProps, OtherState = any> = {
    id: ObjectId;
    batchId?: "ignore" | number;
    storageMode?: StorageMode;
} & (
    | { layerId: Layer["id"] | undefined; object: OtherState }
    | { object: LP["ObjectState"] | null }
);

export type HistoryAction<LP extends LayerProps = LayerProps> = {
    objectId: ObjectId;
    layerId: Layer["id"];
    batchId?: number;
    object: LP["ObjectState"] | null;
    nextObjectId: ObjectId | null;
};

export type History = {
    actions: HistoryAction[];
    index: number;
};

export type StorageReducer<Type> = (puzzle: PuzzleManager, arg: Type) => Type;
// #endregion

// #region - Rendering
export type RenderChange =
    | { type: "draw"; layerIds: Layer["id"][] | "all" }
    | { type: "delete"; layerId: Layer["id"] }
    | { type: "switchLayer" }
    | { type: "reorder" };

// TODO: More specific types
export type BlitGroup = LineBlits | TextBlits | PolygonBlits;
// #endregion

// #region - Parsing
export type LocalStorageData = {
    grid: SquareGridParams;
    layers: {
        id: Layer["id"];
        type: keyof typeof availableLayers;
        rawSettings?: UnknownObject;
    }[];
};
// #endregion

// #region - Refactoring
// I think I will always keep this type to make refactoring easier.
export type NeedsUpdating = any;

export type UnknownObject = Record<string, unknown>;
// #endregion
