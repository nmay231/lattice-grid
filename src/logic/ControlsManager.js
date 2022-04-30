import { selectLayer } from "../redux/puzzle";

export class ControlsManager {
    blurCanvasTimeoutId = null;
    tempStorage = null;

    constructor(puzzle) {
        this.puzzle = puzzle;

        // Note: interpretKeyDown and onPointerUpOutside are not event listeners attached to the SVGCanvas
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.onPointerUpOutside = this.onPointerUpOutside.bind(this);
        this.onPageBlur = this.onPageBlur.bind(this);

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
        this.tempStorage = null;
    }

    handleLayerActions(layer, { discontinueInput, history } = {}) {
        const { storage, grid } = this.puzzle;
        if (discontinueInput === true) {
            this.resetControls();
        }

        storage.addToHistory(grid, layer, history);
        this.puzzle.redrawScreen();
    }

    onPointerDown(rawEvent) {
        // TODO: allow for two fingers to zoom
        if (!rawEvent.isPrimary) {
            return;
        }
        const { grid, storage, settings } = this.puzzle;
        const event = this.cleanPointerEvent(rawEvent, "pointerDown");

        this.tempStorage = {};
        const eventInfo = {
            grid,
            storage,
            settings,
            event,
            tempStorage: this.tempStorage,
        };

        const layer = this.puzzle.getCurrentLayer();
        const points = layer.gatherPoints(eventInfo);

        if (points) {
            event.points = points;
            const actions = layer.handleEvent(eventInfo);
            this.handleLayerActions(layer, actions);
        }
    }

    onPointerMove(rawEvent) {
        if (!rawEvent.isPrimary || !this.tempStorage) {
            return;
        }

        const { grid, storage, settings } = this.puzzle;
        const event = this.cleanPointerEvent(rawEvent, "pointerMove");
        const eventInfo = {
            grid,
            storage,
            settings,
            event,
            tempStorage: this.tempStorage,
        };

        const layer = this.puzzle.getCurrentLayer();
        const points = layer.gatherPoints(eventInfo);

        if (points) {
            event.points = points;
            const actions = layer.handleEvent(eventInfo);
            this.handleLayerActions(layer, actions);
        }
    }

    onPointerUp(rawEvent) {
        if (!rawEvent.isPrimary || !this.tempStorage) {
            return;
        }

        const { grid, storage, settings } = this.puzzle;
        const event = this.cleanPointerEvent({}, "pointerUp");

        const layer = this.puzzle.getCurrentLayer();
        const actions = layer.handleEvent({
            grid,
            storage,
            settings,
            event,
            tempStorage: this.tempStorage,
        });
        this.handleLayerActions(layer, actions);
    }

    onPointerLeave(rawEvent) {
        if (!rawEvent.isPrimary || !this.tempStorage) {
            return;
        }

        const { grid, storage, settings } = this.puzzle;
        const event = this.cleanPointerEvent({}, "pointerUp");

        clearTimeout(this.blurCanvasTimeoutId);
        this.blurCanvasTimeoutId = setTimeout(() => {
            const layer = this.puzzle.getCurrentLayer();
            const actions = layer.handleEvent({
                grid,
                storage,
                settings,
                event,
                tempStorage: this.tempStorage,
            });
            this.handleLayerActions(layer, actions);
        }, settings.actionWindowMs);
    }

    onPointerEnter(event) {
        if (!event.isPrimary || !this.tempStorage) {
            return;
        }

        clearTimeout(this.blurCanvasTimeoutId);
    }

    onContextMenu(event) {
        event.preventDefault();
    }

    // Attached to the document body
    handleKeyDown(rawEvent) {
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

        if (this.tempStorage) {
            // Ignore keyboard events if already handling pointer events
            return;
        }

        const event = { type: "keyDown", shiftKey, ctrlKey, altKey, key, code };
        const { grid, storage, settings } = this.puzzle;
        const layer = this.puzzle.getCurrentLayer();

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
            });
            this.handleLayerActions(layer, actions);
        } else if (event.code === "Tab") {
            // TODO: allow layers to have sublayers that you can tab through (e.g. for sudoku). This should be handled by a separate api than .handleEvent() though to prevent serious bugs and to allow UI indicators.
            this.puzzle.store.dispatch(
                selectLayer({ tab: event.shiftKey ? -1 : 1 }),
            );
            this.puzzle.redrawScreen();
        } else if (event.ctrlKey && event.key === "z") {
            storage.undoHistory(grid.id);
            this.puzzle.redrawScreen();
        } else if (event.ctrlKey && event.key === "y") {
            storage.redoHistory(grid.id);
            this.puzzle.redrawScreen();
        } else {
            const actions = layer.handleEvent({
                event,
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

    onPointerUpOutside(rawEvent) {
        if (rawEvent.isPrimary && rawEvent.target?.id === "canvas-container") {
            const { grid, storage, settings } = this.puzzle;
            const event = this.cleanPointerEvent({}, "cancelAction");

            const layer = this.puzzle.getCurrentLayer();
            const actions = layer.handleEvent({
                grid,
                storage,
                settings,
                event,
                tempStorage: this.tempStorage,
            });
            this.handleLayerActions(layer, actions);
        }
    }

    onPageBlur(rawEvent) {
        if (!rawEvent.isPrimary || !this.tempStorage) {
            return;
        }

        const { grid, storage, settings } = this.puzzle;
        const event = this.cleanPointerEvent({}, "pointerUp");

        const layer = this.puzzle.getCurrentLayer();
        const actions = layer.handleEvent({
            grid,
            storage,
            settings,
            event,
            tempStorage: this.tempStorage,
        });

        this.handleLayerActions(layer, actions);
        clearTimeout(this.blurCanvasTimeoutId);
    }
}
