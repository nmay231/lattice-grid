import React from "react";
import type { ref } from "valtio";
import type { PuzzleManager } from "./PuzzleManager";
import type { StorageManager } from "./StorageManager";
import type { SquareGridParams, _SquareGridTransformer } from "./grids/SquareGrid";
import type { availableLayers } from "./layers";
import type { UserCodeJSON } from "./userComputation/codeBlocks";

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
    grid: Pick<
        Grid,
        "id" | "getAllPoints" | "selectPointsWithCursor" | "getPointTransformer" | "_getSVG"
    >;
    storage: StorageManager;
    settings: PuzzleManager["settings"];
    tempStorage: Partial<LP["TempStorage"]>;
};

export type LayerEvent<LP extends LayerProps> = CleanedDOMEvent & LayerEventEssentials<LP>;

// TODO: Adding OtherState makes sense for IncompleteHistoryAction, but not for LayerHandlerResult. Should this somehow be another property on LayerProps?
export type LayerHandlerResult<LP extends LayerProps> = {
    history?: PartialHistoryAction<LP>[];
};
// #endregion

// #region - Explicit Type Names
// It helps with changing all of the types if necessary, and also with being explicit with how composite types are used (at least in the definition).
export type ObjectId = string;
export type Point = string;
export type PointType = "cells" | "edges" | "corners";
export type EditMode = "question" | "answer";
export type StorageMode = EditMode | "ui";
export type PageMode = "edit" | "play";
// #endregion

// #region - Misc
export type TupleVector = [number, number];

type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N
    ? R
    : _TupleOf<T, N, [T, ...R]>;

export type Tuple<T, N extends number> = number extends N ? T[] : _TupleOf<T, N, []>;

export type Delta = { dx: number; dy: number };

export type RecursivePartial<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
        ? RecursivePartial<U>[]
        : T[P] extends object
        ? RecursivePartial<T[P]>
        : T[P];
};

// Rename valtio refs to not confuse them with React refs
export type ValtioRef<T extends object> = ReturnType<typeof ref<T>>;

export type ModalName = "blockly" | "import-export" | "resize-grid";
export type FocusGroup = "layerList" | "controlSettings" | "constraintSettings" | "none" | "debug";
// #endregion

// #region - Grids
export type Grid = {
    id: string;
    getPointTransformer: (
        settings: Pick<PuzzleManager["settings"], "cellSize">,
    ) => _SquareGridTransformer;
    getAllPoints: (type: PointType) => Point[];
    selectPointsWithCursor: (arg: {
        settings: PuzzleManager["settings"];
        // TODO: Change to CanvasPoint() once implemented
        cursor: { x: number; y: number };
        pointTypes: PointType[];
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
    _getSVG({
        blacklist,
        settings,
    }: {
        blacklist: ReadonlySet<string>;
        settings: Pick<PuzzleManager["settings"], "cellSize">;
    }): SVGGroup[];
};
// #endregion

// #region - Layers
type StringKeyof<T> = keyof T extends infer K ? (K extends string ? K : never) : never;

export type FormSchema<LP extends LayerProps> = {
    numpadControls?: true;
    elements: Array<
        | { type: "color"; key: StringKeyof<LP["RawSettings"]>; label: string }
        | {
              type: "dropdown";
              key: StringKeyof<LP["RawSettings"]>;
              label: string;
              pairs: Array<{ label: string; value: string }>;
          }
        | {
              type: "number";
              key: StringKeyof<LP["RawSettings"]>;
              label: string;
              min?: number;
              max?: number;
          }
        | { type: "boolean"; key: StringKeyof<LP["RawSettings"]>; label: string }
        | { type: "string"; key: StringKeyof<LP["RawSettings"]>; label: string }
    >;
};

export type LayerProps = {
    // TODO: Try allowing settings and rawSettings to be optional
    RawSettings: UnknownObject;
    ObjectState: UnknownObject;
    PermStorage: UnknownObject;
    TempStorage: UnknownObject;
};

export type Layer<LP extends LayerProps = LayerProps> = {
    readonly type: string;
    id: string;
    displayName: string;
    ethereal: boolean;
    rawSettings: LP["RawSettings"];
    controls?: FormSchema<LP>;
    constraints?: FormSchema<LP>;
    newSettings(
        settingsChange: Omit<LayerEventEssentials<LP>, "tempStorage"> & {
            newSettings: LP["RawSettings"];
        },
    ): LayerHandlerResult<LP>;
    gatherPoints: (
        layerEvent: Omit<PointerMoveOrDown, "points"> & LayerEventEssentials<LP>,
    ) => Point[];
    handleEvent: (layerEvent: LayerEvent<LP>) => LayerHandlerResult<LP>;
    getSVG: (
        data: Omit<LayerEventEssentials<LP>, "tempStorage"> & {
            /** ObjectId => className(s) as a string */
            // TODO: styleGroups: Map<ObjectId, string>;
        },
    ) => SVGGroup[];
    getOverlaySVG?: (data: Omit<LayerEventEssentials<LP>, "tempStorage">) => SVGGroup[];
};

export type LayerClass<LP extends LayerProps = LayerProps> = {
    new (klass: LayerClass<LP>, puzzle: PuzzleManager): Layer<LP>;
    create: (puzzle: Pick<PuzzleManager, "layers">) => Layer<LP>;
    readonly type: string;
    displayName: string;
    ethereal: boolean;
    defaultSettings: LP["RawSettings"];
    controls?: FormSchema<LP>;
    constraints?: FormSchema<LP>;
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

export type PuzzleForStorage = {
    grid: Pick<PuzzleManager["grid"], "id">;
    settings: Pick<PuzzleManager["settings"], "editMode">;
};
export type StorageReducer<Type> = (puzzle: PuzzleForStorage, arg: Type) => Type;
// #endregion

// #region - Rendering
export type RenderChange =
    | { type: "draw"; layerIds: Layer["id"][] | "all" }
    | { type: "delete"; layerId: Layer["id"] }
    | { type: "switchLayer" };

export type SVGGroup<Type extends keyof SVGElementTagNameMap = keyof SVGElementTagNameMap> = {
    id: string;
    type: Type;
    className?: string;
    elements: Map<ObjectId, React.SVGAttributes<SVGElement>>;
};

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
