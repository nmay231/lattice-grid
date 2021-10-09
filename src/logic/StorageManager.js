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

    addObjects({ layer, objects }) {
        if (layer.controls === "onePoint") {
            const changed = [];
            for (let { point, state } of objects) {
                const oldState = this.onePoint[layer.id][point];
                this.onePoint[layer.id][point] = state;
                if (oldState !== state) {
                    changed.push(point);
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
