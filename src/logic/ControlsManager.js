import { selectLayer } from "../redux/puzzle";

export class ControlsManager {
    pointerLeftCanvas = false;
    currentLayer = null;
    history = [];

    constructor(puzzle) {
        this.puzzle = puzzle;

        // Note: interpretKeyDown and onPointerUpOutside are not event listeners attached to the SVGCanvas
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.onPointerUpOutside = this.onPointerUpOutside.bind(this);

        this.eventListeners = {
            onPointerDown: this.onPointerDown.bind(this),
            onPointerMove: this.onPointerMove.bind(this),
            onPointerUp: this.onPointerUp.bind(this),
            onPointerOut: this.onPointerOut.bind(this),
            onContextMenu: this.onContextMenu.bind(this),
        };

        // Attached to elements that don't want to send events to the svgcanvas like forms
        this.stopPropagation = {
            onPointerDown: this._stopPropagation.bind(this),
            onPointerMove: this._stopPropagation.bind(this),
            onPointerUp: this._stopPropagation.bind(this),
            onPointerOut: this._stopPropagation.bind(this),
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
        const { width, height } = this.puzzle.grid.getCanvasRequirements();
        const { borderPadding } = this.puzzle.settings;
        // These transformations convert dom coordinates to svg coords
        let x = (clientX - left) * (height / realHeight) - borderPadding,
            y = (clientY - top) * (width / realWidth) - borderPadding;

        // TODO: Should I actually remember which meta keys were held down on pointer down?
        const { altKey, ctrlKey, shiftKey } = event;
        return { type, cursor: { x, y }, altKey, ctrlKey, shiftKey };
    }

    resetControls() {
        this.currentLayer = null;
        this.pointerLeftCanvas = false;
    }

    handleLayerActions(
        layer,
        {
            discontinueInput,
            history = [],
            mergeWithPreviousHistory,
            storingLayer,
        } = {}
    ) {
        const { storage, grid } = this.puzzle;
        if (discontinueInput === true) {
            // TODO
            const stored = storage.getStored({ grid, layer });
            stored.temporary = {};
            this.currentLayer = null;
        } else if (discontinueInput !== "noChange") {
            this.currentLayer = layer;
        }

        if (history.length) {
            // TODO: Changes
            const changes = [];
            const { renderOrder, objects } = storage.getStored({
                grid,
                layer: storingLayer ?? layer,
            });
            for (let { id, object } of history) {
                // TODO: Handle getting data required for undo and also actually do history correctly
                // TODO: History grouping (hence why I'm pushing an array instead of just an object)
                this.history.push([{ id, object }]);

                if (id in objects) {
                    renderOrder.splice(renderOrder.indexOf(id), 1);
                }

                if (object === null) {
                    delete objects[id];
                } else if (object === undefined) {
                    throw Error("You stupid");
                } else {
                    object.id = id;
                    renderOrder.push(id);
                    objects[id] = object;
                }
            }
            this.puzzle.redrawScreen(changes);
        }
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

    onPointerOut(event) {
        if (!event.isPrimary || !this.currentLayer) {
            return;
        }

        const layer = this.currentLayer;
        const { grid, storage, settings } = this.puzzle;
        event = this.cleanPointerEvent({}, "cancelAction");

        const actions = layer.handleEvent({ grid, storage, settings, event });
        this.handleLayerActions(layer, actions);
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
                event.code === "Escape" ? "cancelAction" : "delete"
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
                selectLayer({ tab: event.shiftKey ? -1 : 1 })
            );
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
