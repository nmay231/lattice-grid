export class StorageManager {
    defaultState = {};
    onePoint = {};

    constructor(puzzle) {
        this.puzzle = puzzle;
    }

    // TODO: Use afterObject for selected the next object if there are many in one spot
    getObject({ layer, point, afterObject }) {
        if (layer.controls === "onePoint") {
            const state =
                point in this.onePoint[layer.id]
                    ? this.onePoint[layer.id][point]
                    : this.defaultState[layer.id];

            return {
                point,
                state,
            };
        }
    }

    getLayerObjects({ layer }) {
        if (layer.controls === "onePoint") {
            const objects = this.onePoint[layer.id];
            return Object.keys(objects).map((point) => ({
                point,
                state:
                    objects[point] === undefined
                        ? this.defaultState[layer.id]
                        : objects[point],
            }));
        }
    }

    addLayer(layer) {
        if (layer.controls === "onePoint") {
            this.onePoint[layer.id] = {};
            this.defaultState[layer.id] =
                layer.defaultState ?? layer.states?.[0];
        } else {
            throw Error(`Layer controls not implemented: ${layer.controls}`);
        }
    }

    addObject({ layer, points, state }) {
        if (layer.controls === "onePoint") {
            const changed = [];
            for (let p of points) {
                const oldState = this.onePoint[layer.id][p];
                this.onePoint[layer.id][p] = state;
                if (oldState !== state) {
                    changed.push(p);
                }
            }
            if (changed.length) {
                // TODO: Need to handle changes granularly in puzzle.redrawScreen
                this.puzzle.redrawScreen(changed);
            }
        }
    }

    getCurrentLayer() {
        const currentId = this.puzzle.store.getState().puzzle.selectedLayer;
        let layer = this.puzzle.layers[currentId];
        while (layer.storingLayer && layer.storingLayer !== "custom") {
            layer = layer.storingLayer;
        }
        return layer;
    }

    // currentObject = null;
    // /* Used for any object that previews changes before storing, e.g. multiPoint objects */
    // /* Both initializes and modifies the currentObject */
    // editCurrentObject({}) {}

    /* Simply stores the currentObject and sets it to null */
    finishCurrentObject() {}
}
