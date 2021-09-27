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

    getXY(event, grid, settings) {
        const { clientX, clientY, target } = event;
        const {
            left,
            top,
            width: realWidth,
            height: realHeight,
        } = target.getBoundingClientRect();
        const { width, height } = grid.getCanvasRequirements();
        const { border } = settings;
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
        const { grid, settings } = this.puzzle;

        const cursor = this.getXY(event, grid, settings);

        const layer = this.getCurrentLayer();
        const { controls, pointTypes, drawMultiple, id: layerId } = layer;

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
        const { grid, settings } = this.puzzle;
        const cursor = this.getXY(event, grid, settings);
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
}
