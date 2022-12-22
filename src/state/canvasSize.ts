import { proxy } from "valtio";

// TODO: Make this an object where the keys are the different grids so that grids can have different sizes, be scaled independently, etc.

export const canvasSizeProxy = proxy({ minX: 0, minY: 0, width: 0, height: 0, zoom: 0 });
