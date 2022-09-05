import { OVERLAY_LAYER_ID } from "../../atoms/blits";
import { ILayer, LayerClass, LayerProps } from "../../globals";
import { BaseLayer, methodNotImplemented } from "./baseLayer";

interface OverlayProps extends LayerProps {
    Type: "OverlayLayer";
}

type IOverlayLayer = ILayer<OverlayProps>;

export class OverlayLayer extends BaseLayer<OverlayProps> implements IOverlayLayer {
    static ethereal = true;
    static unique = true;
    static type = "OverlayLayer" as const;
    static displayName = OVERLAY_LAYER_ID;

    id = OVERLAY_LAYER_ID;
    settings = this.rawSettings;
    handleEvent = methodNotImplemented({ name: "Overlay.handleEvent" });
    gatherPoints = methodNotImplemented({ name: "Overlay.gatherPoints" });

    static uniqueInstance: OverlayLayer;
    static create: LayerClass<OverlayProps>["create"] = (puzzle) => {
        OverlayLayer.uniqueInstance =
            OverlayLayer.uniqueInstance || new OverlayLayer(OverlayLayer, puzzle);
        return OverlayLayer.uniqueInstance;
    };

    newSettings() {
        return {};
    }
    getBlits() {
        return [];
    }
}
