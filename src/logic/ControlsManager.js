export class ControlsManager {
    currentLayer = null;
    points = [];
    targetState = null;

    constructor(puzzle) {
        this.puzzle = puzzle;
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
        // TODO: Pretend we're accessing the redux store to see which layer we are using
        return this.puzzle.layers[0];
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
        const { grid } = this.puzzle;

        const cursor = this.getXY(event);

        const layer = this.getCurrentLayer();
        const { controls, pointTypes, drawMultiple, id: layerId } = layer;

        this.debugPointerEvent(event, cursor);

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

            grid.cycleState({ layer, point });

            this.targetState = grid.getObjects({ layerId, point }).state;
            this.puzzle.redrawScreen();
        }
    }

    onPointerMove(event) {
        if (!event.isPrimary || !this.currentLayer) {
            return;
        }
        const { grid } = this.puzzle;
        const cursor = this.getXY(event);
        const { controls, pointTypes, id: layerId } = this.currentLayer;

        if (controls === "onePoint") {
            const point = grid.nearest({
                to: cursor,
                intersection: "polygon",
                pointTypes,
                blacklist: this.points,
            });

            if (point === null) {
                return;
            }
            if (!this.currentLayer.drawMultiple) {
                this.currentLayer = null;
            }
            this.points.push(point);

            grid.addObjects({
                onePoint: { layerId, point, state: this.targetState },
            });
            this.puzzle.redrawScreen();
        }
    }

    onPointerUp(event) {
        if (!event.isPrimary || !this.currentLayer) {
            return;
        }
        // TODO: multiPoint objects have to be cleaned up here.
        this.resetControls();
    }

    onPointerOut(event) {
        if (!event.isPrimary) {
            return;
        }
        // TODO: multiPoint objects have to be cleaned up here.
        this.resetControls();
    }

    onContextMenu(event) {
        event.preventDefault();
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
