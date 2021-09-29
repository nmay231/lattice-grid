export class StorageManager {
    defaultState = {};
    onePoint = {};

    constructor(puzzle) {
        this.puzzle = puzzle;
    }

    // TODO: Use afterObject for selected the next object if there are many in one spot
    getObject({ layer, point, afterObject }) {
        if (layer.controls === "onePoint") {
            return point in this.onePoint[layer.id]
                ? this.onePoint[layer.id][point]
                : this.defaultState[layer.id];
        }
    }

    getLayerObjects({ layer }) {
        if (layer.controls === "onePoint") {
            const objects = this.onePoint[layer.id];
            return Object.keys(objects).map((point) => ({
                point,
                state: objects[point],
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
            const oldState = this.onePoint[layer.id][points[0]];
            this.onePoint[layer.id][points[0]] = state;
            if (oldState !== state) {
                // TODO: handle changes granularly
                this.puzzle.redrawScreen();
            }
        }
    }

    // currentObject = null;
    // /* Used for any object that previews changes before storing, e.g. multiPoint objects */
    // /* Both initializes and modifies the currentObject */
    // editCurrentObject({}) {}

    /* Simply stores the currentObject and sets it to null */
    finishCurrentObject() {}
}
