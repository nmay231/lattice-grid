import { BackgroundColorLayer } from "./BackgroundColor";
import { CellOutlineLayer } from "./CellOutline";
import { KillerCagesLayer } from "./KillerCages";
import { NumberLayer } from "./Number";
import { OverlayLayer } from "./Overlay";
import { SelectionLayer } from "./Selection";
import { SimpleLineLayer } from "./SimpleLine";
import { ToggleCharactersLayer } from "./ToggleCharacters";

export const availableLayers = {
    BackgroundColorLayer,
    CellOutlineLayer,
    KillerCagesLayer,
    NumberLayer,
    OverlayLayer,
    SelectionLayer,
    SimpleLineLayer,
    ToggleCharactersLayer,
} as const;
