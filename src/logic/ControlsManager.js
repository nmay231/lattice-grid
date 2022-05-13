import { getLayers, selectLayer } from "../atoms/layers";

export class ControlsManager {
    blurCanvasTimeoutId = null;
    tempStorage = null;

    constructor(puzzle) {
        this.puzzle = puzzle;

        // Note: these are not event listeners attached to the SVGCanvas
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

    cleanLayerEvent(event, type) {
        if (
            type === "undoRedo" ||
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
        this.puzzle.renderChange({ type: "draw", layerIds: [layer.id] });
    }

    selectLayer(...arg: Parameters<typeof selectLayer>) {
        const oldId = getLayers().currentLayerId;
        selectLayer(...arg);
        const newId = getLayers().currentLayerId;
        if (oldId !== newId) {
            // TODO: This will eventually just change out the overlay blits instead of this
            this.puzzle.renderChange({ type: "switchLayer" });
        }
    }

    onPointerDown(rawEvent) {
        // TODO: allow for two fingers to zoom
        if (!rawEvent.isPrimary) {
            return;
        }
        const { grid, storage, settings } = this.puzzle;
        const event = this.cleanLayerEvent(rawEvent, "pointerDown");

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
        const event = this.cleanLayerEvent(rawEvent, "pointerMove");
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
        const event = this.cleanLayerEvent({}, "pointerUp");

        const layer = this.puzzle.getCurrentLayer();
        const actions = layer.handleEvent({
            grid,
            storage,
            settings,
            event,
            tempStorage: this.tempStorage,
        });
        this.handleLayerActions(layer, {
            discontinueInput: true, // Layer's have to explicitly request to not discontinue input
            ...actions,
        });
    }

    onPointerLeave(rawEvent) {
        if (!rawEvent.isPrimary || !this.tempStorage) {
            return;
        }

        const { grid, storage, settings } = this.puzzle;
        const event = this.cleanLayerEvent({}, "pointerUp");

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
            this.handleLayerActions(layer, {
                discontinueInput: true, // Layer's have to explicitly request to not discontinue input
                ...actions,
            });
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
        let layer = this.puzzle.getCurrentLayer();

        if (event.code === "Escape" || event.code === "Delete") {
            const cleanedEvent = this.cleanLayerEvent(
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
            this.selectLayer({ tab: event.shiftKey ? -1 : 1 });
        } else if (event.ctrlKey && (event.key === "z" || event.key === "y")) {
            // TODO: Eventually, I want layers to be able to switch the current layer (specifically SelectionLayer for sudoku ctrl/shift behavior)
            // Perhaps, I can use that mechanism for storage to switch the current layer when undoing/redoing
            const appliedActions =
                event.key === "z"
                    ? storage.undoHistory(grid.id)
                    : storage.redoHistory(grid.id);

            if (appliedActions.length) {
                const newLayerId =
                    appliedActions[appliedActions.length - 1].layerId;
                this.selectLayer({ id: newLayerId });

                const cleanedEvent = this.cleanLayerEvent(
                    { actions: appliedActions },
                    "undoRedo",
                );

                layer = this.puzzle.getCurrentLayer();
                const actions = layer.handleEvent({
                    grid,
                    storage,
                    settings,
                    event: cleanedEvent,
                });
                this.handleLayerActions(layer, actions);
            }
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
            const event = this.cleanLayerEvent({}, "cancelAction");

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
        const event = this.cleanLayerEvent({}, "pointerUp");

        const layer = this.puzzle.getCurrentLayer();
        const actions = layer.handleEvent({
            grid,
            storage,
            settings,
            event,
            tempStorage: this.tempStorage,
        });

        this.handleLayerActions(layer, {
            discontinueInput: true, // Layer's have to explicitly request to not discontinue input
            ...actions,
        });
        clearTimeout(this.blurCanvasTimeoutId);
    }
}
