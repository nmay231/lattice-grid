/** GOOF stands for Grid Or Object First. GOOFy is just a silly way to abbreviate it. */

import { Layer, LayerEventEssentials, LayerHandlerResult, LayerProps } from "../../types";

export type GridOrObject = "grid" | "object";

export interface GOOFyProps extends LayerProps {
    Settings: { gridOrObjectFirst: GridOrObject };
}

export interface LayerGOOFy<LP extends LayerProps> extends Layer<LP> {
    eventPlaceSinglePointObjects: (
        layerEvent: Omit<LayerEventEssentials<LP>, "tempStorage">,
    ) => LayerHandlerResult<LP>;
}

export const layerIsGOOFy = <LP extends LayerProps = LayerProps>(
    layer: Layer<LP>,
): layer is Layer<LP> & LayerGOOFy<GOOFyProps> => {
    return "eventPlaceSinglePointObjects" in layer && "gridOrObjectFirst" in layer.settings;
};
