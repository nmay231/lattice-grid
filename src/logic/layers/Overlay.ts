import { OVERLAY_LAYER_ID } from "../../atoms/blits";
import { BaseLayer, ILayer } from "./baseLayer";

export const OverlayLayer: ILayer = {
    ...BaseLayer,
    id: OVERLAY_LAYER_ID,
    unique: true,
    ethereal: true,
};
