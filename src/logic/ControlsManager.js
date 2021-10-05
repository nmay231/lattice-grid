export class ControlsManager {
    currentLayer = null;
    points = [];
    targetState = null;

    constructor(puzzle) {
        this.puzzle = puzzle;

        // Note: interpretKeyDown is not an event listener
        this.interpretKeyDown = this.interpretKeyDown.bind(this);
        this.eventListeners = {
            onPointerDown: this.onPointerDown.bind(this),
            onPointerMove: this.onPointerMove.bind(this),
            onPointerUp: this.onPointerUp.bind(this),
            onPointerOut: this.onPointerOut.bind(this),
            onContextMenu: this.onContextMenu.bind(this),
        };
    }

    getXY(event) {
        const { clientX, clientY, target } = event;
        const {
            left,
            top,
            width: realWidth,
            height: realHeight,
        } = target.getBoundingClientRect();
        const { width, height } = this.puzzle.grid.getCanvasRequirements();
        const { border } = this.puzzle.settings;
        // These transformations convert dom coordinates to svg coords
        let x = (clientX - left) * (height / realHeight) - border,
            y = (clientY - top) * (width / realWidth) - border;
        return { x, y };
    }

    getCurrentLayer() {
        const currentId = this.puzzle.store.getState().puzzle.selectedLayer;
        let layer = this.puzzle.layers[currentId];
        while (layer.controllingLayer && layer.controllingLayer !== "custom") {
            layer = layer.controllingLayer;
        }
        return layer;
    }

    resetControls() {
        this.currentLayer = null;
        this.points = [];
        this.targetState = null;
    }

    onPointerDown(event) {
        // TODO: allow for two fingers to zoom
        if (!event.isPrimary) {
            return;
        }
        const { grid, storage } = this.puzzle;

        const cursor = this.getXY(event);

        const layer = this.getCurrentLayer();
        const { controls, pointTypes, drawMultiple } = layer;

        if (controls === "onePoint") {
            const point = grid.nearest({
                to: cursor,
                intersection: "polygon",
                pointTypes,
            });

            if (drawMultiple || point === null) {
                this.currentLayer = layer;
            }
            if (point === null) {
                return;
            }
            this.points.push(point);

            if (!layer.interpretPointerEvent) {
                const currentState = storage.getObject({ layer, point }).state;
                const states = layer.states;
                const targetState =
                    states[(states.indexOf(currentState) + 1) % states.length];

                this.targetState = targetState;
                storage.addObject({
                    layer,
                    points: [point],
                    state: targetState,
                });
                return;
            }
        }

        const { altKey, ctrlKey, shiftKey } = event;
        layer.interpretPointerEvent({
            storage,
            points: this.points,
            newPoint: this.points[this.points.length - 1],
            event: { altKey, ctrlKey, shiftKey, cursor },
        });
    }

    onPointerMove(event) {
        if (!event.isPrimary || !this.currentLayer) {
            return;
        }
        const { grid, storage } = this.puzzle;
        const cursor = this.getXY(event);
        const { controls, pointTypes } = this.currentLayer;

        if (controls === "onePoint") {
            const point = grid.nearest({
                to: cursor,
                intersection: "polygon",
                pointTypes,
                blacklist: this.points,
            });

            // TODO: this.points.includes should not be necessary, but nearest() is not using blacklist
            if (point === null || this.points.includes(point)) {
                return;
            }
            if (!this.currentLayer.drawMultiple) {
                this.currentLayer = null;
            }
            this.points.push(point);

            if (!this.currentLayer.interpretPointerEvent) {
                this.puzzle.storage.addObject({
                    layer: this.currentLayer,
                    points: [point],
                    state: this.targetState,
                });
                return;
            }
        }

        const { altKey, ctrlKey, shiftKey } = event;
        this.currentLayer.interpretPointerEvent({
            storage,
            points: this.points,
            newPoint: this.points[this.points.length - 1],
            event: { altKey, ctrlKey, shiftKey, cursor },
        });
    }

    onPointerUp(event) {
        if (!event.isPrimary || !this.currentLayer) {
            return;
        }

        if (this.currentLayer.interpretPointerEvent) {
            this.currentLayer.interpretPointerEvent({
                storage: this.puzzle.storage,
                points: this.points,
            });
        } else {
            this.puzzle.storage.finishCurrentObject();
        }

        this.resetControls();
    }

    onPointerOut(event) {
        if (!event.isPrimary) {
            return;
        }
        this.puzzle.storage.finishCurrentObject();
        this.resetControls();
    }

    onContextMenu(event) {
        event.preventDefault();
    }

    interpretKeyDown(event) {
        if (event.code === "Tab") {
            // TODO: switch current layer
        }
        const layer = this.getCurrentLayer();
        if (layer.interpretKeyDown) {
            layer.interpretKeyDown({
                event,
                // The storing layer might be different than the controlling layer
                layer: this.puzzle.storage.getCurrentLayer(),
                storage: this.puzzle.storage,
            });
        }
    }

    // TODO: Replace this with automated testing
    debugPointerEvent(event, cursor) {
        const options = [
            { intersection: "polygon", pointTypes: ["cells"] },
            { intersection: "ellipse", pointTypes: ["cells"] },
            { intersection: "polygon", pointTypes: ["corners"] },
            { intersection: "ellipse", pointTypes: ["corners"] },
            // { intersection: "polygon", pointTypes: ["edges"] },
            // { intersection: "ellipse", pointTypes: ["edges"] },
        ];
        if (event.buttons)
            console.log(
                ...options.map(
                    ({ intersection, pointTypes }) =>
                        intersection +
                        ":" +
                        pointTypes +
                        ":" +
                        this.puzzle.grid.nearest({
                            to: cursor,
                            intersection,
                            pointTypes,
                        })
                )
            );
    }
}
