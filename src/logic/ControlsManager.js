import { selectLayer } from "../redux/puzzle";

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

        const layer = this.puzzle.getCurrentLayer("controlling");
        const { pointTypes, drawMultiple } = layer;

        const point = grid.nearestPoint({
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

        const { altKey, ctrlKey, shiftKey } = event;
        layer.interpretPointerEvent({
            storage,
            points: this.points,
            newPoint: point,
            event: { altKey, ctrlKey, shiftKey, cursor },
        });
    }

    onPointerMove(event) {
        if (!event.isPrimary || !this.currentLayer) {
            return;
        }
        const { grid, storage } = this.puzzle;
        const cursor = this.getXY(event);
        const { pointTypes } = this.currentLayer;

        const point = grid.nearestPoint({
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

        // TODO: Should I actually remember which meta keys were held down on pointer down?
        const { altKey, ctrlKey, shiftKey } = event;
        this.currentLayer.interpretPointerEvent({
            storage,
            points: this.points,
            newPoint: point,
            event: { altKey, ctrlKey, shiftKey, cursor },
        });
    }

    onPointerUp(event) {
        if (!event.isPrimary || !this.currentLayer) {
            return;
        }

        // TODO: Are these really separate? Maybe they should both be called (or just not the second one).
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
        // TODO: interpretPointerEvent() here?
        this.puzzle.storage.finishCurrentObject();
        this.resetControls();
    }

    onContextMenu(event) {
        event.preventDefault();
    }

    interpretKeyDown(event) {
        if (event.code === "Tab") {
            this.puzzle.store.dispatch(
                selectLayer({ tab: event.shiftKey ? -1 : 1 })
            );
            return;
        }
        const layer = this.puzzle.getCurrentLayer("controlling");
        if (layer.interpretKeyDown) {
            layer.interpretKeyDown({
                event,
                // The storing layer might be different than the controlling layer
                layer: this.puzzle.getCurrentLayer("storing"),
                grid: this.puzzle.grid,
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
                        this.puzzle.grid.nearestPoint({
                            to: cursor,
                            intersection,
                            pointTypes,
                        })
                )
            );
    }
}
