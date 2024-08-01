import React from "react";
import type { ref } from "valtio";
import type { PuzzleManager } from "./PuzzleManager";
import type { StorageManager } from "./StorageManager";
import type { EncodedLayer } from "./encoding/puzzleEncoder";
import type { SquareGrid, SquareGridParams } from "./grids/SquareGrid";
import type { PutAtEnd } from "./utils/OrderedMap";
import { Vec } from "./utils/math";

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

// TODO: Adding OtherState makes sense for PartialHistoryAction, but not for LayerHandlerResult. Should this somehow be another property on LayerProps?
export type LayerHandlerResult<LP extends LayerProps> = {
    history?: PartialHistoryAction<LP>[];
};
export type LayerUpdateSettings = {
    filters?: Array<{ filter: StorageFilter; layerIds?: Layer["id"][] }>;
    removeFilters?: Array<StorageFilter>;
};
// #endregion

// #region - Explicit Type Names
// It helps with changing all of the types if necessary, and also with being explicit with how composite types are used (at least in the definition).
export type ObjectId = string;
export type Point = string;
export type Color = string;

export type PointType = "cells" | "edges" | "corners";
export type EditMode = "question" | "answer";
export type StorageMode = EditMode | "ui";
export type PageMode = "edit" | "play";

export type ModalName = "blockly" | "import-export" | "resize-grid" | "my-puzzle-list" | "about";
export type FocusGroup = "layerList" | "controlSettings" | "constraintSettings" | "none" | "debug";
// #endregion

// #region - Type magic
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

/** Used to enforce that a newly created type is a sub type of an existing type */
export type CreateSubtypeOf<Super, Sub extends Super> = Sub;

// Rename valtio refs to not confuse them with React refs
export type ValtioRef<T extends object> = ReturnType<typeof ref<T>>;
// #endregion

// #region - Grids
export type Grid = {
    id: string;
    getPointTransformer: SquareGrid["getPointTransformer"]; // TODO: Type separately
    getAllPoints: (type: PointType) => Point[];
    selectPointsWithCursor: (arg: {
        settings: PuzzleManager["settings"];
        // TODO: Change to CanvasPoint() once implemented
        cursor: { x: number; y: number };
        pointTypes: PointType[];
        deltas: Delta[];
        previousPoint?: Point | null;
    }) => Point[];
    getParams(): SquareGridParams;
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
    pointOutOfBounds(gridPoint: Vec): boolean;
};
// #endregion

// #region - Layers
type StringKeyof<T> = keyof T extends infer K ? (K extends string ? K : never) : never;

export type FormSchema<LP extends LayerProps> = {
    numpadControls?: true;
    elements: Partial<Record<StringKeyof<LP["Settings"]>, FormSchemaElement>>;
};
export type FormSchemaElement =
    | { type: "color"; label: string }
    | {
          type: "dropdown";
          label: string;
          // TODO: Rename entries, or something clearer
          pairs: Array<{ label: string; value: string }>;
      }
    | {
          type: "number";
          label: string;
          min?: number;
          max?: number;
      }
    | { type: "boolean"; label: string }
    | { type: "string"; label: string };

export type LayerProps = {
    ObjectState: UnknownObject;
    PermStorage: UnknownObject;
    TempStorage: UnknownObject;
    Settings: Record<never, never>;
};
export type LayerStorageProps = Pick<LayerProps, "ObjectState" | "PermStorage">;

export type Layer<LP extends LayerProps = LayerProps> = {
    readonly klass: LayerClass<LP>;
    id: string;
    displayName: string;
    settings: LP["Settings"];
    updateSettings(
        settingsChange: Pick<LayerEventEssentials<LP>, "grid" | "storage"> & {
            puzzleSettings: LayerEventEssentials<LP>["settings"];
            oldSettings: LP["Settings"] | undefined;
        },
    ): LayerUpdateSettings;
    gatherPoints: (
        layerEvent: Omit<PointerMoveOrDown, "points"> & LayerEventEssentials<LP>,
    ) => Point[];
    handleEvent: (layerEvent: LayerEvent<LP>) => LayerHandlerResult<LP>;
    getSVG: (data: Omit<LayerEventEssentials<LP>, "tempStorage">) => SVGGroup[];
    getOverlaySVG?: (data: Omit<LayerEventEssentials<LP>, "tempStorage">) => SVGGroup[];
    // TODO: Better typing
    // TODO: Also have encoding and decoding in the same place however I end up going about this.
    encode: (
        context: Pick<PuzzleManager, "settings" | "storage"> & {
            grid: SquareGrid;
            exportMode: "solvingNoAnswerCheck" | "solvingExactAnswerCheck" | "editingSaveAll";
        },
    ) => EncodedLayer;
    // TODO: I am thinking I could somehow develop a schema so I can describe the data in an object declaratively, but I'm not gonna worry about that for now.
    describeObject: (input: { obj: LP["ObjectState"]; id: ObjectId }) => ObjectDescription;
};

export type LayerClass<LP extends LayerProps = LayerProps> = {
    new (klass: LayerClass<LP>, puzzle: PuzzleManager): Layer<LP>;
    create: (puzzle: Pick<PuzzleManager, "layers">) => Layer<LP>;
    type: string;
    displayName: string;
    ethereal: boolean;
    defaultSettings: LP["Settings"];
    controls?: FormSchema<LP>;
    constraints?: FormSchema<LP>;
    // TODO: Should I merge controls and constraints into settingsDescription?
    settingsDescription: {
        // TODO: Do I need derived if I instead choose to not list it here?
        [K in keyof LP["Settings"]]: {
            type: "controls" | "constraints";
            /** A derived setting should not be encoded or directly changeable by the user */
            derived?: true;
        };
    };
    isValidSetting<K extends keyof LP["Settings"] = keyof LP["Settings"]>(
        key: K | string,
        value: unknown,
    ): value is LP["Settings"][K];
};

export type ObjectDescription = { points: Point[] };
// #endregion

// #region - Undo-Redo History
export type PartialHistoryAction<LP extends LayerProps = LayerProps, OtherState = any> = {
    id: ObjectId;
    batchId?: "ignore" | number;
    storageMode?: StorageMode;
} & (
    | { layerId: Layer["id"] | undefined; object: OtherState }
    | { layerId?: never; object: LP["ObjectState"] | null }
);

export type HistoryAction<LP extends LayerProps = LayerProps> = {
    objectId: ObjectId;
    layerId: Layer["id"];
    /** Actions with the same batchId (if defined) will be un-/re-done at the same time */
    batchId?: number;
    object: LP["ObjectState"] | null;
    /** For when render order matters */
    prevObjectId: PutAtEnd | ObjectId | null;
    /** Which storage group is this action applied to */
    storageMode: StorageMode;
};

export type PuzzleForStorage = {
    grid: Pick<PuzzleManager["grid"], "id">;
    settings: Pick<PuzzleManager["settings"], "editMode">;
};

export type StorageFilter = (
    puzzle: {
        grid: Pick<
            Grid,
            "id" | "getAllPoints" | "selectPointsWithCursor" | "getPointTransformer" | "_getSVG"
        >;
        storage: StorageManager;
        settings: PuzzleManager["settings"];
    },
    action: Readonly<HistoryAction>,
) => { keep: boolean; extraActions?: HistoryAction[] };
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

// #region - Refactoring
// I think I will always keep this type to make refactoring easier.
export type NeedsUpdating = any;

export type UnknownObject = Record<string, unknown>;
// #endregion
