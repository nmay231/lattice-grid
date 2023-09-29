import { proxy } from "valtio";

/** When settings are changed in any accessor to layer settings, they all need to rerender their LayerForm's */
export const layerSettingsRerender = proxy({ key: 0 });
