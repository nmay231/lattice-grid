import { OVERLAY_LAYER_ID } from "../state/blits";
import { Layer, LayerClass, LayerProps } from "../types";
import { BaseLayer } from "./BaseLayer";

interface OverlayProps extends LayerProps {}

interface IOverlayLayer extends Layer<OverlayProps> {}

export class OverlayLayer extends BaseLayer<OverlayProps> implements IOverlayLayer {
    static ethereal = true;
    static readonly type = "OverlayLayer";
    static displayName = OVERLAY_LAYER_ID;

    id = OVERLAY_LAYER_ID;
    settings = this.rawSettings;
    handleEvent = () => ({});
    gatherPoints = () => [];

    static uniqueInstance?: OverlayLayer;
    static create = ((puzzle): OverlayLayer => {
        OverlayLayer.uniqueInstance =
            OverlayLayer.uniqueInstance || new OverlayLayer(OverlayLayer, puzzle);
        return OverlayLayer.uniqueInstance;
    }) satisfies LayerClass<OverlayProps>["create"];

    static controls = undefined;
    static constraints = undefined;

    newSettings() {
        return {};
    }
    getBlits() {
        return [];
    }
}
