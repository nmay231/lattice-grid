import { BackgroundColorLayer } from "./BackgroundColor";
import { CellOutlineLayer } from "./CellOutline";
import { DebugPointerLayer } from "./DebugPointer";
import { KillerCagesLayer } from "./KillerCages";
import { NumberLayer } from "./Number";
import { OverlayLayer } from "./Overlay";
import { SimpleLineLayer } from "./SimpleLine";
import { ToggleCharactersLayer } from "./ToggleCharacters";

export const availableLayers = {
    BackgroundColorLayer,
    CellOutlineLayer,
    DebugPointerLayer,
    KillerCagesLayer,
    NumberLayer,
    OverlayLayer,
    SimpleLineLayer,
    ToggleCharactersLayer,
} as const; // TODO: satisfies Record<string, LayerClass>;
