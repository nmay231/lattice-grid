import { OVERLAY_LAYER_ID } from "../../atoms/blits";
import { ILayer } from "../../globals";
import { BaseLayer } from "./baseLayer";

export const OverlayLayer: ILayer = {
    ...BaseLayer,
    id: OVERLAY_LAYER_ID,
    unique: true,
    ethereal: true,
    newSettings() {
        return {};
    },
    getBlits(data) {
        return [];
    },
};
