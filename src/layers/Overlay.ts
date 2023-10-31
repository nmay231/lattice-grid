import { Layer, LayerClass, LayerProps } from "../types";
import { BaseLayer } from "./BaseLayer";

interface OverlayProps extends LayerProps {
    Settings: Record<string, never>;
}

interface IOverlayLayer extends Layer<OverlayProps> {}

export const OVERLAY_LAYER_ID: (typeof OverlayLayer)["type"] = "OverlayLayer";
export class OverlayLayer extends BaseLayer<OverlayProps> implements IOverlayLayer {
    static ethereal = true;
    static readonly type = "OverlayLayer";
    static displayName = OVERLAY_LAYER_ID;
    static settingsDescription: LayerClass<OverlayProps>["settingsDescription"] = {};

    id = OVERLAY_LAYER_ID;
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

    static isValidSetting<K extends keyof OverlayProps["Settings"]>(
        key: K | string,
        value: unknown,
    ): value is OverlayProps["Settings"][K] {
        return false;
    }

    updateSettings() {
        return {};
    }

    newSettings() {
        return {};
    }
    getSVG() {
        return [];
    }
}
