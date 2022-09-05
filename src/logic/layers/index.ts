import { LayerClass } from "../../globals";
import { BackgroundColorLayer } from "./BackgroundColor";
import { CellOutlineLayer } from "./CellOutline";
import { KillerCagesLayer } from "./KillerCages";
import { NumberLayer } from "./Number";
import { OverlayLayer } from "./Overlay";
import { SelectionLayer } from "./Selection";
import { SimpleLineLayer } from "./SimpleLine";
import { ToggleCharactersLayer } from "./ToggleCharacters";

const layers: LayerClass<any>[] = [
    BackgroundColorLayer,
    CellOutlineLayer,
    KillerCagesLayer,
    NumberLayer,
    OverlayLayer,
    SelectionLayer,
    SimpleLineLayer,
    ToggleCharactersLayer,
];

export const availableLayers: Record<string, LayerClass<any>> = {};
for (const layer of layers) {
    availableLayers[layer.type] = layer;
}
