import { BackgroundColorLayer } from "./BackgroundColor";
import { CellOutlineLayer } from "./CellOutline";
import { KillerCagesLayer } from "./KillerCages";
import { NumberLayer } from "./Number";
import { SelectionLayer } from "./Selection";
import { SimpleLineLayer } from "./SimpleLine";
import { ToggleCharactersLayer } from "./ToggleCharacters";

const layers = [
    BackgroundColorLayer,
    CellOutlineLayer,
    KillerCagesLayer,
    NumberLayer,
    SelectionLayer,
    SimpleLineLayer,
    ToggleCharactersLayer,
];

export const availableLayers = {};
for (let layer of layers) {
    availableLayers[layer.id] = layer;
}
