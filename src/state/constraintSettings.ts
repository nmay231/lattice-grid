import { proxy } from "valtio";
import { UnknownObject, ValtioRef } from "../types";

// TODO: Why does the settings prop need to be a ref for components to consistently rerender when .settings is set?
export const constraintSettingsProxy = proxy({ settings: null as null | ValtioRef<UnknownObject> });
