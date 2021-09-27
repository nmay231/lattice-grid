import { setBlitGroups } from "../../redux/actions";
import { store } from "../../redux/store";

/* TODO: Might eventually optimize by storing layers as images and only updating the images that need to be updated. */
// Also, this will eventually manage things like OcclusionTests

export class MasterBlitter {
    constructor(grid) {
        this.grid = grid;
    }
    /* change is the object being added or removed. It contains information like which layer it belongs to, which point is relevant (position), if it is hidden or invalid, etc. This will help with optimization in the future; do NOT use it now. */
    blitToCanvas(layers, settings, change) {
        // const layer = layers.filter((layer) => layer.id === change.layerId),
        const finalBlitGroups = [];
        for (let layer of layers) {
            let blitGroups = layer.getBlits(this.grid, settings, change);
            finalBlitGroups.push(...blitGroups);
        }
        store.dispatch(setBlitGroups(finalBlitGroups));
    }
}
