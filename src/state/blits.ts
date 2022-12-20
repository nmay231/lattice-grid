import { proxy } from "valtio";
import { OverlayLayer } from "../logic/layers/Overlay";
import { BlitGroup, Layer, ValtioRef } from "../types";

export const blitGroupsProxy = proxy({} as Record<Layer["id"], ValtioRef<BlitGroup[]>>);

// TODO: Change this to a Symbol in the future?
export const OVERLAY_LAYER_ID: OverlayLayer["type"] = "OverlayLayer";
