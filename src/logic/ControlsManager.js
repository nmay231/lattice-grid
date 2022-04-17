import { selectLayer } from "../redux/puzzle";

export class ControlsManager {
    leaveCanvasTimeout = null;
    currentLayer = null;

    constructor(puzzle) {
        this.puzzle = puzzle;

        // Note: interpretKeyDown and onPointerUpOutside are not event listeners attached to the SVGCanvas
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.onPointerUpOutside = this.onPointerUpOutside.bind(this);

        this.eventListeners = {
            onPointerDown: this.onPointerDown.bind(this),
            onPointerMove: this.onPointerMove.bind(this),
            onPointerUp: this.onPointerUp.bind(this),
            onPointerLeave: this.onPointerLeave.bind(this),
            onPointerEnter: this.onPointerEnter.bind(this),
            onContextMenu: this.onContextMenu.bind(this),
        };

        // Attached to elements that don't want to send events to the svgcanvas like forms
        this.stopPropagation = {
            onPointerDown: this._stopPropagation.bind(this),
            onPointerMove: this._stopPropagation.bind(this),
            onPointerUp: this._stopPropagation.bind(this),
            onPointerLeave: this._stopPropagation.bind(this),
            onPointerEnter: this._stopPropagation.bind(this),
            onKeyDown: this._stopPropagation.bind(this),
            onContextMenu: this._stopPropagation.bind(this),
        };
    }

    _stopPropagation(event) {
        event.stopPropagation();
    }

    cleanPointerEvent(event, type) {
        if (
            type === "pointerUp" ||
            type === "cancelAction" ||
            type === "delete"
        ) {
            return { ...event, type };
        }
        if (type !== "pointerDown" && type !== "pointerMove") {
            throw Error(`Invalid type=${type}`);
        }
        const { clientX, clientY, target } = event;
        const {
            left,
            top,
            width: realWidth,
            height: realHeight,
        } = target.getBoundingClientRect();
        const { minX, minY, width, height } =
            this.puzzle.grid.getCanvasRequirements();
        // These transformations convert dom coordinates to svg coords
        let x = minX + (clientX - left) * (height / realHeight),
            y = minY + (clientY - top) * (width / realWidth);

        // TODO: Should I actually remember which meta keys were held down on pointer down?
        const { altKey, ctrlKey, shiftKey } = event;
        return { type, cursor: { x, y }, altKey, ctrlKey, shiftKey };
    }

    resetControls() {
        this.currentLayer = null;
        this.leaveCanvasTimeout = null;
    }

    handleLayerActions(layer, { discontinueInput, history } = {}) {
        const { storage, grid } = this.puzzle;
        if (discontinueInput === true) {
            // TODO
            const stored = storage.getStored({ grid, layer });
            stored.temporary = {};
            this.currentLayer = null;
        } else if (discontinueInput !== "noChange") {
            this.currentLayer = layer;
        }

        storage.addToHistory(grid, layer, history);
    }

    onPointerDown(event) {
        // TODO: allow for two fingers to zoom
        if (!event.isPrimary) {
            return;
        }
        const { grid, storage, settings } = this.puzzle;
        event = this.cleanPointerEvent(event, "pointerDown");
        const layer = this.puzzle.getCurrentLayer("controlling");
        const points = layer.gatherPoints({ grid, storage, settings, event });

        if (points) {
            event.points = points;
            const actions = layer.handleEvent({
                grid,
                storage,
                settings,
                event,
            });
            this.handleLayerActions(layer, actions);
        }
    }

    onPointerMove(event) {
        if (!event.isPrimary || !this.currentLayer) {
            return;
        }

        const layer = this.currentLayer;
        const { grid, storage, settings } = this.puzzle;
        event = this.cleanPointerEvent(event, "pointerMove");
        const points = layer.gatherPoints({ grid, storage, settings, event });

        if (points) {
            event.points = points;
            const actions = layer.handleEvent({
                grid,
                storage,
                settings,
                event,
            });
            this.handleLayerActions(layer, actions);
        }
    }

    onPointerUp(event) {
        if (!event.isPrimary || !this.currentLayer) {
            return;
        }

        const layer = this.currentLayer;
        const { grid, storage, settings } = this.puzzle;
        event = this.cleanPointerEvent(event, "pointerUp");

        const actions = layer.handleEvent({ grid, storage, settings, event });
        this.handleLayerActions(layer, actions);
    }

    onPointerLeave(event) {
        if (!event.isPrimary || !this.currentLayer) {
            return;
        }

        const layer = this.currentLayer;
        const { grid, storage, settings } = this.puzzle;
        event = this.cleanPointerEvent(event, "cancelAction");

        this.leaveCanvasTimeout = setTimeout(() => {
            const actions = layer.handleEvent({
                grid,
                storage,
                settings,
                event,
            });
            this.handleLayerActions(layer, actions);
        }, settings.actionWindowMs);
    }

    onPointerEnter(event) {
        if (!event.isPrimary || !this.currentLayer) {
            return;
        }

        clearTimeout(this.leaveCanvasTimeout);
    }

    onContextMenu(event) {
        event.preventDefault();
    }

    // Attached to the document body
    handleKeyDown(rawEvent) {
        if (this.currentLayer) {
            // Ignore keyboard events if already handling pointer events
            return;
        }

        // This should be a very small whitelist for which key-strokes are allowed to be blocked
        const { shiftKey, ctrlKey, altKey, key, code } = rawEvent;
        if (
            code === "Tab" ||
            parseInt(key) >= 0 ||
            (!ctrlKey && !altKey && key.length === 1) ||
            (!shiftKey && !altKey && (key === "a" || key === "i"))
        ) {
            rawEvent.preventDefault();
        }

        const event = { type: "keyDown", shiftKey, ctrlKey, altKey, key, code };
        const { grid, storage, settings } = this.puzzle;
        const layer = this.puzzle.getCurrentLayer("controlling");

        const storingLayer = this.puzzle.getCurrentLayer("storing");
        if (event.code === "Escape" || event.code === "Delete") {
            const cleanedEvent = this.cleanPointerEvent(
                event,
                event.code === "Escape" ? "cancelAction" : "delete",
            );
            const actions = layer.handleEvent({
                grid,
                storage,
                settings,
                event: cleanedEvent,
                // The storing layer might be different than the controlling layer
                storingLayer,
            });
            this.handleLayerActions(layer, actions);
        } else if (event.code === "Tab") {
            // TODO: allow layers to have sublayers that you can tab through (e.g. for sudoku). This should be handled by a separate api than .handleEvent() though to prevent serious bugs and to allow UI indicators.
            this.puzzle.store.dispatch(
                selectLayer({ tab: event.shiftKey ? -1 : 1 }),
            );
        } else if (event.ctrlKey && event.key === "z") {
            storage.undoHistory(grid.id);
        } else if (event.ctrlKey && event.key === "y") {
            storage.redoHistory(grid.id);
        } else {
            const actions = layer.handleEvent({
                event,
                // The storing layer might be different than the controlling layer
                storingLayer,
                grid,
                storage,
                settings,
            });

            this.handleLayerActions(layer, {
                ...(actions || {}),
                discontinueInput: "noChange",
            });
        }
    }

    onPointerUpOutside(event) {
        if (event.target?.id === "canvas-container") {
            const { grid, storage, settings } = this.puzzle;
            event = this.cleanPointerEvent({}, "cancelAction");
            const layer = this.puzzle.getCurrentLayer("controlling");

            const actions = layer.handleEvent({
                grid,
                storage,
                settings,
                event,
            });
            this.handleLayerActions(layer, actions);
        }
    }
}
