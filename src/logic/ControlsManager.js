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
    }

    cleanPointerEvent(event, type) {
        if (
            type === "cancelPointer" ||
            type === "stopPointer" ||
            type === "unfocusPointer"
        ) {
            return { type };
        }
        if (type !== "startPointer" && type !== "movePointer") {
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
            selectedObjects,
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
        event = this.cleanPointerEvent(event, "startPointer");
        const layer = this.puzzle.getCurrentLayer("controlling");

        if (!layer.handlePointerEvent) {
            return;
        }
        const actions = layer.handlePointerEvent({
            grid,
            storage,
            settings,
            event,
        });

        this.handleLayerActions(layer, actions);
    }

    onPointerMove(event) {
        if (!event.isPrimary || !this.currentLayer) {
            return;
        }

        const { grid, storage, settings } = this.puzzle;
        event = this.cleanPointerEvent(event, "movePointer");
        const layer = this.currentLayer;

        if (!layer.handlePointerEvent) {
            return;
        }
        const actions = layer.handlePointerEvent({
            grid,
            storage,
            settings,
            event,
        });

        this.handleLayerActions(layer, actions);
    }

    onPointerUp(event) {
        if (!event.isPrimary || !this.currentLayer) {
            return;
        }

        const { grid, storage, settings } = this.puzzle;
        const layer = this.currentLayer;

        if (!layer.handlePointerEvent) {
            return;
        }
        const actions = layer.handlePointerEvent({
            grid,
            storage,
            settings,
            event: this.cleanPointerEvent({}, "stopPointer"),
        });

        this.handleLayerActions(layer, actions);
    }

    onPointerOut(event) {
        if (!event.isPrimary || !this.currentLayer) {
            return;
        }

        const { grid, storage, settings } = this.puzzle;
        const layer = this.currentLayer;

        if (!layer.handlePointerEvent) {
            return;
        }
        const actions = layer.handlePointerEvent({
            grid,
            storage,
            settings,
            event: this.cleanPointerEvent({}, "cancelPointer"),
        });

        this.handleLayerActions(layer, actions);
    }

    onContextMenu(event) {
        event.preventDefault();
    }

    // Attached to the document body
    handleKeyDown(rawEvent) {
        // This should be a very small whitelist for what input is allowed to be blocked
        const { shiftKey, ctrlKey, altKey, key, code } = rawEvent;
        if (
            code === "Tab" ||
            parseInt(key) >= 0 ||
            (!ctrlKey && !altKey && key.length === 1) ||
            (!shiftKey && !altKey && (key === "a" || key === "i"))
        ) {
            rawEvent.preventDefault();
        }

        const event = { shiftKey, ctrlKey, altKey, key, code };
        const { grid, storage, settings } = this.puzzle;
        const layer = this.puzzle.getCurrentLayer("controlling");

        if (event.code === "Tab") {
            if (!layer.handlePointerEvent) {
                return;
            }
            const actions = layer.handlePointerEvent({
                grid,
                storage,
                settings,
                event: this.cleanPointerEvent({}, "unfocusPointer"),
            });
            this.handleLayerActions(layer, actions);

            this.puzzle.store.dispatch(
                selectLayer({ tab: event.shiftKey ? -1 : 1 })
            );
        } else {
            const storingLayer = this.puzzle.getCurrentLayer("storing");

            const actions = layer.handleKeyDown
                ? layer.handleKeyDown({
                      event,
                      // The storing layer might be different than the controlling layer
                      storingLayer,
                      grid,
                      storage,
                      settings,
                  })
                : {};

            this.handleLayerActions(layer, {
                ...actions,
                discontinueInput: "noChange",
            });
        }
    }

    // TODO: This method of deselecting things in the cursor is immensely dissatisfying. Clicking on the svg but off the grid will not unselect cells. Tapping on the sidebar (not on a button) doesn't deselect it. I could attach this event to the body and prevent bubbling, but then I could forget to prevent bubbling and that's a bug. Also, I do need to send a cancelPointer event if something like the page is blurred or a modal pulls up.
    onPointerUpOutside(event) {
        if (event.target?.id === "canvas-container") {
            const { grid, storage, settings } = this.puzzle;
            const layer = this.puzzle.getCurrentLayer("controlling");

            if (!layer.handlePointerEvent) {
                return;
            }
            const actions = layer.handlePointerEvent({
                grid,
                storage,
                settings,
                event: this.cleanPointerEvent({}, "unfocusPointer"),
            });

            this.handleLayerActions(layer, actions);
        }
    }
}
