import { proxy } from "valtio";
import { OverlayLayer } from "../layers/Overlay";
import { BlitGroup, Layer, ValtioRef } from "../types";

export const blitGroupsProxy = proxy({} as Record<Layer["id"], ValtioRef<BlitGroup[]>>);

export const OVERLAY_LAYER_ID: OverlayLayer["type"] = "OverlayLayer";
