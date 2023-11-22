import { LayerClass } from "../types";
import { BackgroundColorLayer } from "./BackgroundColor";
import { CellOutlineLayer } from "./CellOutline";
import { CenterMarksLayer } from "./CenterMarks";
import { DebugSelectPointsLayer } from "./DebugSelectPoints";
import { KillerCagesLayer } from "./KillerCages";
import { NumberLayer } from "./Number";
import { OverlayLayer } from "./Overlay";
import { SimpleLineLayer } from "./SimpleLine";
import { ToggleCharactersLayer } from "./ToggleCharacters";
import { TopBottomMarksLayer } from "./TopBottomMarks";

export const availableLayers = {
    BackgroundColorLayer,
    CellOutlineLayer,
    DebugSelectPointsLayer,
    KillerCagesLayer,
    NumberLayer,
    OverlayLayer,
    SimpleLineLayer,
    ToggleCharactersLayer,
    CenterMarksLayer,
    TopBottomMarksLayer,
} as const satisfies Record<string, LayerClass<any>>;
