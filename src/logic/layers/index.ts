import { BackgroundColorLayer } from "./BackgroundColor";
import { ILayer } from "./baseLayer";
import { CellOutlineLayer } from "./CellOutline";
import { KillerCagesLayer } from "./KillerCages";
import { NumberLayer } from "./Number";
import { OverlayLayer } from "./Overlay";
import { SelectionLayer } from "./Selection";
import { SimpleLineLayer } from "./SimpleLine";
import { ToggleCharactersLayer } from "./ToggleCharacters";

const layers: ILayer[] = [
    BackgroundColorLayer,
    CellOutlineLayer,
    KillerCagesLayer,
    NumberLayer,
    OverlayLayer,
    SelectionLayer,
    SimpleLineLayer,
    ToggleCharactersLayer,
];

export const availableLayers: Record<string, ILayer> = {};
for (let layer of layers) {
    availableLayers[layer.id] = layer;
}
