export class StorageManager {
    defaultState = {};
    onePoint = {};
    twoPoint = {};

    constructor(puzzle) {
        this.puzzle = puzzle;
    }

    // TODO: This should use raw cursor data instead of just the point, otherwise you have to click exactly where you want to which is meh...
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
        } else if (layer.controls === "twoPoint") {
            const objects = this.twoPoint[layer.id];

            return Object.keys(objects).map((id) => {
                const points = this.puzzle.grid.convertIdAndPoints({
                    idToPoints: id,
                });

                return { points, state: objects[id] };
            });
        }
    }

    addLayer(layer) {
        if (layer.controls === "onePoint") {
            this.onePoint[layer.id] = {};
            this.defaultState[layer.id] =
                layer.defaultState ?? layer.states?.[0];
        } else if (layer.controls === "twoPoint") {
            this.twoPoint[layer.id] = {};
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
        } else if (layer.controls === "twoPoint") {
            // TODO: changed = [];
            for (let { points, state } of objects) {
                this.twoPoint[layer.id][points.join(",")] = state;
            }
            this.puzzle.redrawScreen();
        } else {
            throw Error(
                `Layer controls not implemented for addObjects: ${layer.controls}`
            );
        }
    }

    // currentObject = null;
    // /* Used for any object that previews changes before storing, e.g. multiPoint objects */
    // /* Both initializes and modifies the currentObject */
    // editCurrentObject({}) {}

    /* Simply stores the currentObject and sets it to null */
    finishCurrentObject() {}
}
